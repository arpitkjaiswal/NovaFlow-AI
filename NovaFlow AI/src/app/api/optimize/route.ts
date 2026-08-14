import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { geminiWrapper } from '@/lib/gemini';
import { logLLMCall, logSystemEvent } from '@/lib/observability';
import { rateLimit } from '@/lib/rateLimit';

import { db } from '@/lib/db';

const optimizeSchema = z.object({
  code: z.string(),
  language: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const sessionUserId = user?.id;

    if (db && sessionUserId && user?.email) {
      try {
        await db.user.upsert({
          where: { id: sessionUserId },
          update: { email: user.email, name: user.user_metadata?.full_name || null },
          create: { id: sessionUserId, email: user.email, name: user.user_metadata?.full_name || null }
        });
      } catch (upsertError) {
        console.warn('DevFlow AI Backend: Failed to upsert user in optimize:', upsertError);
      }
    }

    const ip = request.headers.get('x-forwarded-for') || 'anonymous';

    // Apply Rate Limiter
    const rateLimitKey = sessionUserId || ip;
    const limitResult = rateLimit(rateLimitKey);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute before making more requests.' },
        { 
          status: 429, 
          headers: { 
            'Retry-After': Math.ceil(limitResult.reset / 1000).toString() 
          } 
        }
      );
    }

    const body = await request.json();
    const parsed = optimizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { code, language } = parsed.data;

    await logSystemEvent({
      level: 'info',
      message: `Started code optimization task for ${language || 'javascript'}`
    });

    // Call GeminiWrapper to run the optimization pipeline
    const result = await geminiWrapper.optimizeCode(code, language || 'javascript');

    // Save to Postgres OptimizationRuns table
    if (db) {
      try {
        await db.optimizationRun.create({
          data: {
            userId: sessionUserId || null,
            language: language || 'javascript',
            originalCode: code,
            optimizedCode: result.optimizedCode,
            timeComplexityOriginal: result.timeComplexityOriginal,
            timeComplexityOptimized: result.timeComplexityOptimized,
            spaceComplexityOriginal: result.spaceComplexityOriginal,
            spaceComplexityOptimized: result.spaceComplexityOptimized,
            explanation: result.explanation,
            edgeCases: result.edgeCases,
            model: result.model,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            totalTokens: result.totalTokens,
            latency: result.latency,
            cost: result.cost
          }
        });
        await logSystemEvent({
          level: 'info',
          message: `Completed code optimization task for ${language || 'javascript'} using model ${result.model}`,
          context: JSON.stringify({
            latency: result.latency,
            totalTokens: result.totalTokens,
            complexityChange: `${result.timeComplexityOriginal} -> ${result.timeComplexityOptimized}`
          })
        });
      } catch (dbError) {
        console.error('Optimization API: Failed to write to OptimizationRuns:', dbError);
        await logSystemEvent({
          level: 'error',
          message: `Failed to save optimization run to database`,
          context: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }
    }

    // Centralized Observability Log
    try {
      await logLLMCall({
        type: 'optimize',
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        estimatedCost: result.cost,
        latency: result.latency,
        input: code,
        output: JSON.stringify({
          optimizedCode: result.optimizedCode,
          explanation: result.explanation,
          timeComplexityOriginal: result.timeComplexityOriginal,
          timeComplexityOptimized: result.timeComplexityOptimized,
          spaceComplexityOriginal: result.spaceComplexityOriginal,
          spaceComplexityOptimized: result.spaceComplexityOptimized
        }),
        metadata: {
          language: language || 'javascript',
          userId: sessionUserId || undefined
        }
      });
    } catch (logError) {
      console.warn('Observability log failed inside optimization endpoint:', logError);
    }

    return NextResponse.json({
      optimizedCode: result.optimizedCode,
      explanation: result.explanation,
      timeComplexityOriginal: result.timeComplexityOriginal,
      timeComplexityOptimized: result.timeComplexityOptimized,
      spaceComplexityOriginal: result.spaceComplexityOriginal,
      spaceComplexityOptimized: result.spaceComplexityOptimized,
      edgeCases: result.edgeCases,
      analytics: {
        model: result.model,
        tokens: result.totalTokens,
        latency: result.latency,
        cost: result.cost
      }
    });
  } catch (error) {
    console.error('Optimize endpoint error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { geminiWrapper } from '@/lib/gemini';
import { logLLMCall, logSystemEvent } from '@/lib/observability';

import { rateLimit } from '@/lib/rateLimit';
import { processPrompt } from '@/lib/ppa';

const chatSchema = z.object({
  sessionId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string()
    })
  ),
  userId: z.string().optional(),
  model: z.string().optional(),
  attachments: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      content: z.string()
    })
  ).optional()
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
        console.warn('DevFlow AI Backend: Failed to upsert user in chat:', upsertError);
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
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, messages, userId, model, attachments } = parsed.data;
    const finalUserId = sessionUserId || userId || null;
    const userMessage = messages[messages.length - 1];

    if (!userMessage || userMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    // PPA - Prompt Processing Architecture execution
    const ppaResult = processPrompt(userMessage.content);

    // Build augmented conversation history for the LLM
    const processedMessages = [
      { role: 'system', content: ppaResult.augmentedSystemPrompt },
      ...messages.slice(0, -1).filter(m => m.role !== 'system'),
      { role: 'user', content: ppaResult.augmentedUserContent }
    ] as { role: 'user' | 'assistant' | 'system'; content: string }[];

    // 1. Resolve or Create Session ID immediately before streaming
    let finalSessionId = sessionId;
    if (finalSessionId && !finalSessionId.startsWith('mock-')) {
      if (db) {
        const existingSession = await db.chatSession.findUnique({
          where: { id: finalSessionId }
        });
        if (!existingSession) {
          return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
        }
        if (existingSession.userId && existingSession.userId !== sessionUserId) {
          return NextResponse.json({ error: 'Unauthorized access to this session' }, { status: 403 });
        }
      }
    } else {
      try {
        if (db) {
          const title = userMessage.content.slice(0, 30).trim() || 'New Conversation';
          const session = await db.chatSession.create({
            data: {
              title: title.endsWith('...') ? title : `${title}...`,
              userId: finalUserId
            }
          });
          finalSessionId = session.id;
          await logSystemEvent({
            level: 'info',
            message: `Created new chat session: ${finalSessionId}`,
            context: JSON.stringify({ userId: finalUserId, title })
          });
        } else {
          finalSessionId = 'mock-' + Math.random().toString(36).substring(7);
        }
      } catch (dbError) {
        console.warn('DevFlow AI: DB session creation failed, fallback to mock ID.', dbError);
        await logSystemEvent({
          level: 'warn',
          message: `Database session creation failed, falling back to mock ID.`,
          context: dbError instanceof Error ? dbError.message : String(dbError)
        });
        finalSessionId = 'mock-' + Math.random().toString(36).substring(7);
      }
    }

    // 2. Start Gemini streaming generator with PPA augmented prompt
    const chatStream = await geminiWrapper.chatStream(processedMessages, model, attachments);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let assistantContent = '';
        let analyticsData: {
          model: string;
          tokens: number;
          latency: number;
          cost: number;
          usage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
            cost: number;
            latency: number;
          };
          messageId?: string;
        } | null = null;

        try {
          // Send resolved sessionId as the first line
          controller.enqueue(encoder.encode(JSON.stringify({ sessionId: finalSessionId }) + '\n'));

          // Iterate over Gemini stream
          for await (const chunk of chatStream) {
            if (chunk.text) {
              assistantContent += chunk.text;
              controller.enqueue(
                encoder.encode(JSON.stringify({ text: chunk.text }) + '\n')
              );
            }

            if (chunk.usage && chunk.model) {
              analyticsData = {
                model: chunk.model,
                tokens: chunk.usage.totalTokens,
                latency: chunk.usage.latency,
                cost: chunk.usage.cost,
                usage: chunk.usage // details
              };
              controller.enqueue(
                encoder.encode(JSON.stringify({ analytics: analyticsData }) + '\n')
              );
            }
          }

          // 3. Log to DB after stream finishes
          if (analyticsData && analyticsData.usage) {
            try {
              let dbUserContent = userMessage.content;
              if (attachments && attachments.length > 0) {
                attachments.forEach((att: { name: string; type: string; content: string }) => {
                  if (att.type.startsWith('image/')) {
                    dbUserContent += `\n\n---IMAGE_ATTACHMENT:${att.name}:${att.type}---${att.content}---END_ATTACHMENT---`;
                  } else {
                    dbUserContent += `\n\n---ATTACHMENT:${att.name}---${att.content}---END_ATTACHMENT---`;
                  }
                });
              }

              // Write to centralized Langfuse and DB UsageLog
              await logLLMCall({
                type: 'chat',
                model: analyticsData.model,
                promptTokens: analyticsData.usage.promptTokens,
                completionTokens: analyticsData.usage.completionTokens,
                totalTokens: analyticsData.usage.totalTokens,
                estimatedCost: analyticsData.usage.cost,
                latency: analyticsData.usage.latency,
                input: dbUserContent,
                output: assistantContent,
                metadata: {
                  sessionId: finalSessionId,
                  userId: finalUserId || undefined
                }
              });

              let assistantMessageId: string | undefined = undefined;

              if (db && finalSessionId && !finalSessionId.startsWith('mock-')) {
                // Save User Message
                await db.message.create({
                  data: {
                    sessionId: finalSessionId,
                    role: 'user',
                    content: dbUserContent
                  }
                });

                // Save Assistant Message
                const assistantMsgDb = await db.message.create({
                  data: {
                    sessionId: finalSessionId,
                    role: 'assistant',
                    content: assistantContent
                  }
                });
                
                assistantMessageId = assistantMsgDb.id;

                // Save Message Usage (related to specific message for session details)
                await db.usage.create({
                  data: {
                    messageId: assistantMsgDb.id,
                    promptTokens: analyticsData.usage.promptTokens,
                    completionTokens: analyticsData.usage.completionTokens,
                    totalTokens: analyticsData.usage.totalTokens,
                    estimatedCost: analyticsData.usage.cost,
                    latency: analyticsData.usage.latency,
                    model: analyticsData.model
                  }
                });
              }

              // Send the final analytics details along with the database message ID
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    analytics: {
                      ...analyticsData,
                      messageId: assistantMessageId
                    }
                  }) + '\n'
                )
              );
            } catch (dbWriteError) {
              console.warn('DevFlow AI: Database write failed.', dbWriteError);
            }
          }
        } catch (err) {
          console.error('Error during streaming execution:', err);
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: err instanceof Error ? err.message : 'Stream generation failed' }) + '\n')
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

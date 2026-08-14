import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';

const feedbackSchema = z.object({
  messageId: z.string(),
  rating: z.enum(['like', 'dislike']),
  comment: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const sessionUserId = user?.id;
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
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { messageId, rating, comment } = parsed.data;

    // Verify message exists in DB
    const messageExists = await db.message.findUnique({
      where: { id: messageId },
      include: { session: true }
    });

    if (!messageExists) {
      return NextResponse.json(
        { error: 'Target message not found' },
        { status: 404 }
      );
    }

    // Verify session ownership
    if (messageExists.session?.userId && messageExists.session.userId !== sessionUserId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this message' },
        { status: 403 }
      );
    }

    // Save feedback to Database
    const feedback = await db.feedback.create({
      data: {
        messageId,
        rating,
        comment: comment || null
      }
    });

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      rating: feedback.rating
    });
  } catch (error) {
    console.error('Feedback endpoint error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!db) {
      return NextResponse.json({ sessions: [], messages: [] });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (db && userId && user?.email) {
      try {
        await db.user.upsert({
          where: { id: userId },
          update: { email: user.email, name: user.user_metadata?.full_name || null },
          create: { id: userId, email: user.email, name: user.user_metadata?.full_name || null }
        });
      } catch (upsertError) {
        console.warn('DevFlow AI Backend: Failed to upsert user in history fetch:', upsertError);
      }
    }

    if (sessionId) {
      const existingSession = await db.chatSession.findUnique({
        where: { id: sessionId }
      });
      if (!existingSession) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
      }
      if (existingSession.userId && existingSession.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized access to this session' }, { status: 403 });
      }

      const messages = await db.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        include: { usage: true }
      });
      return NextResponse.json({ messages });
    }

    // Filter sessions by logged in user ID to support multiple sessions per user
    const sessions = await db.chatSession.findMany({
      where: {
        userId: userId || null
      },
      orderBy: { startedAt: 'desc' }
    });
    
    return NextResponse.json({ sessions });
  } catch (error) {
    console.warn('DevFlow AI Backend: History fetch failed.', error);
    return NextResponse.json({ sessions: [], messages: [] });
  }
}

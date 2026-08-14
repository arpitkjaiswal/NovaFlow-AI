import { db } from './db';
import { Langfuse } from 'langfuse';

const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
const secretKey = process.env.LANGFUSE_SECRET_KEY;
const baseUrl = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

export const langfuse = publicKey && secretKey
  ? new Langfuse({
    publicKey,
    secretKey,
    baseUrl
  })
  : null;

if (!langfuse) {
  console.warn('Langfuse: Credentials missing. Requests will not be sent to Langfuse Cloud.');
}

interface LogParams {
  type: 'chat' | 'optimize';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latency: number;
  input: string;
  output: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export async function logLLMCall(params: LogParams) {
  // 1. Log to Postgres UsageLog asynchronously
  if (db) {
    try {
      await db.analytics.create({
        data: {
          type: params.type,
          model: params.model,
          promptTokens: params.promptTokens,
          completionTokens: params.completionTokens,
          totalTokens: params.totalTokens,
          estimatedCost: params.estimatedCost,
          latency: params.latency
        }
      });
      console.log(`[observability] Postgres logged ${params.type} call to ${params.model} (${params.totalTokens} tokens, $${params.estimatedCost.toFixed(5)})`);
    } catch (dbError) {
      console.error('[observability] Failed to write usage to Postgres:', dbError);
    }
  }

  // 2. Log to Langfuse Tracing
  if (langfuse) {
    try {
      const trace = langfuse.trace({
        name: params.type === 'chat' ? 'chat-session-trace' : 'code-optimizer-trace',
        userId: params.metadata?.userId || 'anonymous',
        metadata: {
          pipelineType: params.type,
          ...params.metadata
        }
      });

      const generation = trace.generation({
        name: params.type === 'chat' ? 'gemini-chat' : 'gemini-optimize',
        model: params.model,
        input: params.input,
        output: params.output,
        usage: {
          promptTokens: params.promptTokens,
          completionTokens: params.completionTokens,
          totalTokens: params.totalTokens
        },
        metadata: params.metadata
      });

      generation.end();
      console.log(`[observability] Langfuse logged trace for ${params.type}`);
    } catch (lfError) {
      console.error('[observability] Failed to trace to Langfuse:', lfError);
    }
  } else {
    // Print trace details locally for console debugging
    console.log(`[observability][MOCK LANGFUSE TRACE] TraceName: ${params.type === 'chat' ? 'chat-session-trace' : 'code-optimizer-trace'} | Model: ${params.model} | Input length: ${params.input.length} chars | Output length: ${params.output.length} chars`);
  }
}

interface SystemEventParams {
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: string;
}

export async function logSystemEvent(params: SystemEventParams) {
  if (db) {
    try {
      await db.log.create({
        data: {
          level: params.level,
          message: params.message,
          context: params.context || null
        }
      });
      console.log(`[system-log] [${params.level.toUpperCase()}] ${params.message}`);
    } catch (dbError) {
      console.error('[system-log] Failed to write system log to Postgres:', dbError);
    }
  }
}

export { Langfuse };

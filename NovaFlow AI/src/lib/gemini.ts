import { GoogleGenAI } from '@google/genai';

const SAFETY_SETTINGS = [
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  }
];

export interface ChatResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latency: number; // in milliseconds
  cost: number;
}

export interface OptimizeResponse {
  optimizedCode: string;
  explanation: string;
  timeComplexityOriginal: string;
  timeComplexityOptimized: string;
  spaceComplexityOriginal: string;
  spaceComplexityOptimized: string;
  edgeCases: string[];
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latency: number;
  cost: number;
}

export interface ChatStreamChunk {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latency: number;
    cost: number;
  };
  model?: string;
}

class GeminiWrapper {
  private ai: GoogleGenAI | null = null;
  private isMockMode: boolean = false;
  private defaultModel = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'mock-key' || apiKey.includes('YOUR_')) {
      console.warn('DevFlow AI: GEMINI_API_KEY is not configured or is a placeholder. Running in MOCK MODE.');
      this.isMockMode = true;
    } else {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  // Calculate estimated cost for Gemini models (Flash: Input: $0.075 / M tokens, Output: $0.300 / M tokens; Pro: Input: $1.25 / M tokens, Output: $5.00 / M tokens)
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const isPro = model.includes('pro');
    const inputCostPerThousand = isPro ? 0.00125 : 0.000075;
    const outputCostPerThousand = isPro ? 0.00500 : 0.0003;
    return (promptTokens / 1000) * inputCostPerThousand + (completionTokens / 1000) * outputCostPerThousand;
  }

  // Retry helper with exponential backoff
  private async executeWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) { 
      if (retries <= 0) throw error;
      console.warn(`Gemini API request failed. Retrying in ${delay}ms... (Retries left: ${retries})`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.executeWithRetry(fn, retries - 1, delay * 2);
    }
  }

  async chat(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    model?: string,
    attachments?: { name: string; type: string; content: string }[]
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const defaultSystemPrompt = `You are DevFlow AI, an expert, senior software engineer and competitive programmer.
Provide clean, idiomatic, well-commented code. 
Be concise, professional, and explain your reasoning clearly when asked.`;

    const systemMessage = messages.find(m => m.role === 'system');
    const systemInstruction = systemMessage?.content || defaultSystemPrompt;
    const targetModel = model || this.defaultModel;

    // Filter and map message history
    const contents = messages
      .filter(m => m.role !== 'system')
      .map((m, idx, arr) => {
        const isLastUserMessage = m.role === 'user' && idx === arr.length - 1;
        const parts: (Record<string, unknown> | { text: string })[] = [{ text: m.content }];

        if (isLastUserMessage && attachments && attachments.length > 0) {
          attachments.forEach(att => {
            if (att.type.startsWith('image/')) {
              const base64Data = att.content.includes('base64,') 
                ? att.content.split('base64,')[1] 
                : att.content;
              parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType: att.type
                }
              });
            } else {
              parts.push({
                text: `\n\n[Attached File: ${att.name}]\n\`\`\`\n${att.content}\n\`\`\``
              });
            }
          });
        }

        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts
        };
      });

    if (this.isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const lastMessage = messages[messages.length - 1]?.content || '';
      
      let mockContent = `I am DevFlow AI (running in Gemini mock mode with model: ${targetModel}). Here is a response to: "${lastMessage.substring(0, 40)}..."\n\nTo connect this to the real Gemini API, please set your \`GEMINI_API_KEY\` in the \`.env\` file.`;
      
      if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
        mockContent = `Hello! I am DevFlow AI, your intelligent companion powered by Gemini. How can I help you write or optimize code today?`;
      } else if (lastMessage.toLowerCase().includes('react') || lastMessage.toLowerCase().includes('hook')) {
        mockContent = `Here is a custom React hook for handling local storage reactivity:

\`\`\`typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
\`\`\`

### How it works:
1. **Lazy Initialization:** Resolves the initial state only once when the component mounts.
2. **Type Safety:** Generic type parameter \`T\` ensures you retain type definitions.
3. **Error Handling:** Safely wraps storage operations in try-catch to prevent SSR or storage-disabled crashes.`;
      }

      const promptTokens = contents.reduce((acc, m) => acc + m.parts.reduce((partAcc, part) => partAcc + ((part as { text?: string }).text?.split(' ').length || 50), 0), 0) + 20;
      const completionTokens = mockContent.split(' ').length + 20;
      const totalTokens = promptTokens + completionTokens;
      const latency = Date.now() - startTime;
      const cost = this.calculateCost(targetModel, promptTokens, completionTokens);

      return {
        content: mockContent,
        model: targetModel,
        promptTokens,
        completionTokens,
        totalTokens,
        latency,
        cost
      };
    }

    try {
      const response = await this.executeWithRetry(() =>
        this.ai!.models.generateContent({ 
          model: targetModel,
          contents,
          config: {
            systemInstruction,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            safetySettings: SAFETY_SETTINGS as any
          }
        })
      );

      const latency = Date.now() - startTime;
      const content = response.text || '';
      
      const promptTokens = response.usageMetadata?.promptTokenCount || 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = response.usageMetadata?.totalTokenCount || 0;
      const cost = this.calculateCost(targetModel, promptTokens, completionTokens);

      return {
        content,
        model: targetModel,
        promptTokens,
        completionTokens,
        totalTokens,
        latency,
        cost
      };
    } catch (error) {
      console.warn('Gemini API chat call failed. Falling back to mock response.', error);
      const lastMessage = messages[messages.length - 1]?.content || '';
      let mockContent = `[API FALLBACK - Mock Mode] The live Gemini API returned an error: "${error instanceof Error ? error.message : String(error)}".\n\nTo help you continue testing, here is a mock response to your prompt: "${lastMessage.substring(0, 40)}..."`;

      if (attachments && attachments.length > 0) {
        mockContent += `\n\nProcessed ${attachments.length} attachments:\n` + attachments.map(a => `- ${a.name} (${a.type})`).join('\n');
      }

      if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
        mockContent = `Hello! The live Gemini API is currently unavailable or has reached its rate limits, so I am running in local fallback mock mode. How can I help you write or optimize code today?`;
      } else if (lastMessage.toLowerCase().includes('react') || lastMessage.toLowerCase().includes('hook')) {
        mockContent = `Here is a custom React hook for handling local storage reactivity:

\`\`\`typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
\`\`\`

### How it works:
1. **Lazy Initialization:** Resolves the initial state only once when the component mounts.
2. **Type Safety:** Generic type parameter \`T\` ensures you retain type definitions.
3. **Error Handling:** Safely wraps storage operations in try-catch to prevent SSR or storage-disabled crashes.`;
      }

      const promptTokens = contents.reduce((acc, m) => acc + m.parts.reduce((partAcc, part) => partAcc + ((part as { text?: string }).text?.split(' ').length || 50), 0), 0) + 20;
      const completionTokens = mockContent.split(' ').length + 20;
      const totalTokens = promptTokens + completionTokens;
      const latency = Date.now() - startTime;
      const cost = this.calculateCost(targetModel, promptTokens, completionTokens);

      return {
        content: mockContent,
        model: targetModel,
        promptTokens,
        completionTokens,
        totalTokens,
        latency,
        cost
      };
    }
  }

  async *chatStream(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    model?: string,
    attachments?: { name: string; type: string; content: string }[]
  ): AsyncGenerator<ChatStreamChunk, void, unknown> {
    const startTime = Date.now();
    const defaultSystemPrompt = `You are DevFlow AI, an expert, senior software engineer and competitive programmer.
Provide clean, idiomatic, well-commented code. 
Be concise, professional, and explain your reasoning clearly when asked.`;

    const systemMessage = messages.find(m => m.role === 'system');
    const systemInstruction = systemMessage?.content || defaultSystemPrompt;
    const targetModel = model || this.defaultModel;

    const contents = messages
      .filter(m => m.role !== 'system')
      .map((m, idx, arr) => {
        const isLastUserMessage = m.role === 'user' && idx === arr.length - 1;
        const parts: (Record<string, unknown> | { text: string })[] = [{ text: m.content }];

        if (isLastUserMessage && attachments && attachments.length > 0) {
          attachments.forEach(att => {
            if (att.type.startsWith('image/')) {
              const base64Data = att.content.includes('base64,') 
                ? att.content.split('base64,')[1] 
                : att.content;
              parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType: att.type
                }
              });
            } else {
              parts.push({
                text: `\n\n[Attached File: ${att.name}]\n\`\`\`\n${att.content}\n\`\`\``
              });
            }
          });
        }

        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts
        };
      });

    if (this.isMockMode) {
      const lastMessage = messages[messages.length - 1]?.content || '';
      let mockContent = `I am DevFlow AI (running in Gemini streaming mock mode with model: ${targetModel}). Here is a response to: "${lastMessage.substring(0, 40)}..."\n\nTo connect this to the real Gemini API, please set your \`GEMINI_API_KEY\` in the \`.env\` file.`;

      if (attachments && attachments.length > 0) {
        mockContent += `\n\nProcessed ${attachments.length} attachments:\n` + attachments.map(a => `- ${a.name} (${a.type})`).join('\n');
      }

      if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
        mockContent = `Hello! I am DevFlow AI, your intelligent companion powered by Gemini. How can I help you write or optimize code today?`;
      } else if (lastMessage.toLowerCase().includes('react') || lastMessage.toLowerCase().includes('hook')) {
        mockContent = `Here is a custom React hook for handling local storage reactivity:

\`\`\`typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
\`\`\`

### How it works:
1. **Lazy Initialization:** Resolves the initial state only once when the component mounts.
2. **Type Safety:** Generic type parameter \`T\` ensures you retain type definitions.
3. **Error Handling:** Safely wraps storage operations in try-catch to prevent SSR or storage-disabled crashes.`;
      }

      // Stream the mock text in chunks
      const words = mockContent.split(/(?=\s)/);
      for (const word of words) {
        yield { text: word };
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      const promptTokens = contents.reduce((acc, m) => acc + m.parts.reduce((partAcc, part) => partAcc + ((part as { text?: string }).text?.split(' ').length || 50), 0), 0) + 20;
      const completionTokens = mockContent.split(' ').length + 20;
      const totalTokens = promptTokens + completionTokens;
      const latency = Date.now() - startTime;
      const cost = this.calculateCost(targetModel, promptTokens, completionTokens);

      yield {
        text: '',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          latency,
          cost
        },
        model: targetModel
      };
      return;
    }

    try {
      const responseStream = await this.executeWithRetry(() =>
        this.ai!.models.generateContentStream({
          model: targetModel,
          contents,
          config: {
            systemInstruction,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            safetySettings: SAFETY_SETTINGS as any
          }
        })
      );

      let lastChunkUsage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | null = null;

      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        if (chunk.usageMetadata) {
          lastChunkUsage = chunk.usageMetadata;
        }
        yield { text };
      }

      const latency = Date.now() - startTime;
      const promptTokens = lastChunkUsage?.promptTokenCount || 0;
      const completionTokens = lastChunkUsage?.candidatesTokenCount || 0;
      const totalTokens = lastChunkUsage?.totalTokenCount || 0;
      const cost = this.calculateCost(targetModel, promptTokens, completionTokens);

      yield {
        text: '',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          latency,
          cost
        },
        model: targetModel
      };
    } catch (error) {
      console.warn('Gemini API streaming call failed. Falling back to mock generator.', error);
      const lastMessage = messages[messages.length - 1]?.content || '';
      let mockContent = `[API FALLBACK - Mock Mode] The live Gemini API returned an error: "${error instanceof Error ? error.message : String(error)}".\n\nTo help you continue testing, here is a mock response to your prompt: "${lastMessage.substring(0, 40)}..."`;

      if (attachments && attachments.length > 0) {
        mockContent += `\n\nProcessed ${attachments.length} attachments:\n` + attachments.map(a => `- ${a.name} (${a.type})`).join('\n');
      }

      if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
        mockContent = `Hello! The live Gemini API is currently unavailable or has reached its rate limits, so I am running in local fallback mock mode. How can I help you write or optimize code today?`;
      } else if (lastMessage.toLowerCase().includes('react') || lastMessage.toLowerCase().includes('hook')) {
        mockContent = `Here is a custom React hook for handling local storage reactivity:

\`\`\`typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
\`\`\`

### How it works:
1. **Lazy Initialization:** Resolves the initial state only once when the component mounts.
2. **Type Safety:** Generic type parameter \`T\` ensures you retain type definitions.
3. **Error Handling:** Safely wraps storage operations in try-catch to prevent SSR or storage-disabled crashes.`;
      }

      // Stream the mock text in chunks
      const words = mockContent.split(/(?=\s)/);
      for (const word of words) {
        yield { text: word };
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      const promptTokens = contents.reduce((acc, m) => acc + m.parts.reduce((partAcc, part) => partAcc + ((part as { text?: string }).text?.split(' ').length || 50), 0), 0) + 20;
      const completionTokens = mockContent.split(' ').length + 20;
      const totalTokens = promptTokens + completionTokens;
      const latency = Date.now() - startTime;
      const cost = this.calculateCost(targetModel, promptTokens, completionTokens);

      yield {
        text: '',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          latency,
          cost
        },
        model: targetModel
      };
    }
  }

  async optimizeCode(code: string, language: string = 'javascript'): Promise<OptimizeResponse> {
    const startTime = Date.now();
    const systemPrompt = `You are a world-class systems engineer and competitive programmer.
Optimize the provided code for performance, readability, memory usage, and time complexity.
You must output a valid JSON object matching the requested schema.`;

    const userPrompt = `Language: ${language}\n\nCode to optimize:\n\`\`\`${language}\n${code}\n\`\`\``;

    if (this.isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const latency = Date.now() - startTime;

      let optimizedCode = code;
      let explanation = "The code is already optimized or in a language/structure that has no obvious algorithmic improvements in mock mode.";
      let timeComplexityOriginal = "O(N)";
      let timeComplexityOptimized = "O(N)";
      let spaceComplexityOriginal = "O(1)";
      let spaceComplexityOptimized = "O(1)";
      let edgeCases = ["Empty input", "Negative values", "Very large numbers"];

      if (code.includes('bubble') || code.includes('Bubble') || code.includes('for (let i = 0; i < n; i++)')) {
        optimizedCode = `// Optimized Sorting Algorithm (Quicksort/Timsort equivalent)
function sort(arr: number[]): number[] {
  // Built-in sort uses highly optimized Timsort in V8
  return [...arr].sort((a, b) => a - b);
}`;
        explanation = "Replaced a nested loop bubble sort O(N^2) with the standard engine-optimized sort which runs in O(N log N) using Timsort. Also avoided mutating the original array by destructuring it first.";
        timeComplexityOriginal = "O(N^2)";
        timeComplexityOptimized = "O(N log N)";
        spaceComplexityOriginal = "O(1)";
        spaceComplexityOptimized = "O(N)";
        edgeCases = ["Array already sorted", "Reverse sorted array", "Array containing duplicate values", "Single element or empty array"];
      } else if (code.includes('fib') || code.includes('fibonacci')) {
        optimizedCode = `// Optimized Fibonacci with Iterative Dynamic Programming
function fibonacci(n: number): number {
  if (n <= 1) return n;
  let prev2 = 0;
  let prev1 = 1;
  let current = 0;
  
  for (let i = 2; i <= n; i++) {
    current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  
  return current;
}`;
        explanation = "Replaced the exponential O(2^N) recursive Fibonacci with a linear O(N) iterative dynamic programming implementation. This avoids stack overflow errors for larger values of N and reduces memory overhead to O(1) by discarding older values.";
        timeComplexityOriginal = "O(2^N)";
        timeComplexityOptimized = "O(N)";
        spaceComplexityOriginal = "O(N) (Recursion Stack)";
        spaceComplexityOptimized = "O(1)";
        edgeCases = ["n = 0", "n = 1", "Large value of n causing integer overflow"];
      }

      const promptTokens = systemPrompt.split(' ').length + userPrompt.split(' ').length + 20;
      const completionTokens = optimizedCode.split(' ').length + explanation.split(' ').length + 100;
      const totalTokens = promptTokens + completionTokens;
      const cost = this.calculateCost(this.defaultModel, promptTokens, completionTokens);

      return {
        optimizedCode,
        explanation,
        timeComplexityOriginal,
        timeComplexityOptimized,
        spaceComplexityOriginal,
        spaceComplexityOptimized,
        edgeCases,
        model: this.defaultModel,
        promptTokens,
        completionTokens,
        totalTokens,
        latency,
        cost
      };
    }

    try {
      const response = await this.executeWithRetry(() =>
        this.ai!.models.generateContent({
          model: this.defaultModel,
          contents: userPrompt,
          config: { 
            systemInstruction: systemPrompt,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            safetySettings: SAFETY_SETTINGS as any,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                optimizedCode: { type: 'STRING' },
                explanation: { type: 'STRING' },
                timeComplexityOriginal: { type: 'STRING' },
                timeComplexityOptimized: { type: 'STRING' },
                spaceComplexityOriginal: { type: 'STRING' },
                spaceComplexityOptimized: { type: 'STRING' },
                edgeCases: {
                  type: 'ARRAY',
                  items: { type: 'STRING' }
                }
              },
              required: [
                'optimizedCode',
                'explanation',
                'timeComplexityOriginal',
                'timeComplexityOptimized',
                'spaceComplexityOriginal',
                'spaceComplexityOptimized',
                'edgeCases'
              ]
            }
          }
        })
      );

      const latency = Date.now() - startTime;
      const jsonContent = response.text || '{}';
      const parsed = JSON.parse(jsonContent);

      const promptTokens = response.usageMetadata?.promptTokenCount || 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = response.usageMetadata?.totalTokenCount || 0;
      const cost = this.calculateCost(this.defaultModel, promptTokens, completionTokens);

      return {
        optimizedCode: parsed.optimizedCode || code,
        explanation: parsed.explanation || '',
        timeComplexityOriginal: parsed.timeComplexityOriginal || 'N/A',
        timeComplexityOptimized: parsed.timeComplexityOptimized || 'N/A',
        spaceComplexityOriginal: parsed.spaceComplexityOriginal || 'N/A',
        spaceComplexityOptimized: parsed.spaceComplexityOptimized || 'N/A',
        edgeCases: parsed.edgeCases || [],
        model: this.defaultModel,
        promptTokens,
        completionTokens,
        totalTokens,
        latency,
        cost
      };
    } catch (error) {
      console.warn('Gemini API optimizeCode call failed. Falling back to mock optimizer.', error);
      const latency = Date.now() - startTime;

      let optimizedCode = code;
      let explanation = `[API FALLBACK - Mock Mode] The live Gemini API returned an error: "${error instanceof Error ? error.message : String(error)}".\n\nOptimized fallback: The code structure has no obvious improvements in mock fallback mode.`;
      let timeComplexityOriginal = "O(N)";
      let timeComplexityOptimized = "O(N)";
      let spaceComplexityOriginal = "O(1)";
      let spaceComplexityOptimized = "O(1)";
      let edgeCases = ["Empty input", "Negative values", "Very large numbers"];

      if (code.includes('bubble') || code.includes('Bubble') || code.includes('for (let i = 0; i < n; i++)')) {
        optimizedCode = `// Optimized Sorting Algorithm (Quicksort/Timsort equivalent)
function sort(arr: number[]): number[] {
  // Built-in sort uses highly optimized Timsort in V8
  return [...arr].sort((a, b) => a - b);
}`;
        explanation = `[API FALLBACK - Mock Mode] The live Gemini API returned an error: "${error instanceof Error ? error.message : String(error)}".\n\nReplaced a nested loop bubble sort O(N^2) with the standard engine-optimized sort which runs in O(N log N) using Timsort. Also avoided mutating the original array by destructuring it first.`;
        timeComplexityOriginal = "O(N^2)";
        timeComplexityOptimized = "O(N log N)";
        spaceComplexityOriginal = "O(1)";
        spaceComplexityOptimized = "O(N)";
        edgeCases = ["Array already sorted", "Reverse sorted array", "Array containing duplicate values", "Single element or empty array"];
      } else if (code.includes('fib') || code.includes('fibonacci')) {
        optimizedCode = `// Optimized Fibonacci with Iterative Dynamic Programming
function fibonacci(n: number): number {
  if (n <= 1) return n;
  let prev2 = 0;
  let prev1 = 1;
  let current = 0;
  
  for (let i = 2; i <= n; i++) {
    current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  
  return current;
}`;
        explanation = `[API FALLBACK - Mock Mode] The live Gemini API returned an error: "${error instanceof Error ? error.message : String(error)}".\n\nReplaced the exponential O(2^N) recursive Fibonacci with a linear O(N) iterative dynamic programming implementation. This avoids stack overflow errors for larger values of N and reduces memory overhead to O(1) by discarding older values.`;
        timeComplexityOriginal = "O(2^N)";
        timeComplexityOptimized = "O(N)";
        spaceComplexityOriginal = "O(N) (Recursion Stack)";
        spaceComplexityOptimized = "O(1)";
        edgeCases = ["n = 0", "n = 1", "Large value of n causing integer overflow"];
      }

      const promptTokens = systemPrompt.split(' ').length + userPrompt.split(' ').length + 20;
      const completionTokens = optimizedCode.split(' ').length + explanation.split(' ').length + 100;
      const totalTokens = promptTokens + completionTokens;
      const cost = this.calculateCost(this.defaultModel, promptTokens, completionTokens);

      return {
        optimizedCode,
        explanation,
        timeComplexityOriginal,
        timeComplexityOptimized,
        spaceComplexityOriginal,
        spaceComplexityOptimized,
        edgeCases,
        model: this.defaultModel,
        promptTokens,
        completionTokens,
        totalTokens,
        latency,
        cost
      };
    }
  }
}

export const geminiWrapper = new GeminiWrapper();

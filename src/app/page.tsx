'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea, { AVAILABLE_MODELS } from '@/components/ChatArea';
import CodeOptimizer from '@/components/CodeOptimizer';
import DashboardModal from '@/components/DashboardModal';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  startedAt: string;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  content: string;
  size: number;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: FileAttachment[];
  analytics?: {
    model: string;
    tokens: number;
    latency: number;
    cost: number;
  };
}

interface OptimizeResult {
  optimizedCode: string;
  explanation: string;
  timeComplexityOriginal: string;
  timeComplexityOptimized: string;
  spaceComplexityOriginal: string;
  spaceComplexityOptimized: string;
  edgeCases: string[];
  analytics?: {
    model: string;
    tokens: number;
    latency: number;
    cost: number;
  };
}

export default function Home() {
  // Sidebar State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Chat Area State
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  // Synchronize mock welcome message model analytics with selected dropdown model
  useEffect(() => {
    setMessages(prev =>
      prev.map(m => {
        if (m.role === 'assistant' && m.analytics && m.content.includes("Welcome to DevFlow")) {
          const matchedModel = AVAILABLE_MODELS.find(am => am.id === selectedModel);
          return {
            ...m,
            analytics: {
              ...m.analytics,
              model: matchedModel ? matchedModel.name : selectedModel
            }
          };
        }
        return m;
      })
    );
  }, [selectedModel]);

  // Code Optimizer State
  const [optimizerCode, setOptimizerCode] = useState('');
  const [optimizerLang, setOptimizerLang] = useState('javascript');
  const [isOptimizeLoading, setIsOptimizeLoading] = useState(false);
  const [optimizerResult, setOptimizerResult] = useState<OptimizeResult | null>(null);
  const [isOptimizerExpanded, setIsOptimizerExpanded] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setStatus(activeSession ? 'authenticated' : 'unauthenticated');
      if (activeSession) {
        fetchSessions();
      } else {
        router.push('/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      setStatus(activeSession ? 'authenticated' : 'unauthenticated');
      if (activeSession) {
        fetchSessions();
      } else {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        // Fallback to mock session if none exist in DB
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions);
        } else {
          // Mock session
          setSessions([
            { id: 'mock-session-1', title: 'Welcome to DevFlow AI', startedAt: new Date().toISOString() }
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([
        { id: 'mock-session-1', title: 'Welcome to DevFlow AI (Offline)', startedAt: new Date().toISOString() }
      ]);
    }
  };

  const handleSelectSession = async (id: string) => {
    setCurrentSessionId(id);
    if (id.startsWith('mock-')) {
      // Load mock messages
      const matchedModel = AVAILABLE_MODELS.find(am => am.id === selectedModel);
      setMessages([
        {
          role: 'assistant',
          content: `Welcome to DevFlow.

Ask a programming query or use the Code Optimizer panel to analyze and optimize your algorithms.`,
          analytics: {
            model: matchedModel ? matchedModel.name : selectedModel,
            tokens: 72,
            latency: 120,
            cost: 0.00005
          }
        }
      ]);
      return;
    }

    try {
      const res = await fetch(`/api/history?sessionId=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          // Map database structure to UI structure
          const formatted = data.messages.map((m: {
            id: string;
            role: 'user' | 'assistant' | 'system';
            content: string;
            usage?: {
              model: string;
              totalTokens: number;
              latency: number;
              estimatedCost: number;
            };
          }) => {
            if (m.role === 'user') {
              const parsed = parseMessageContent(m.content);
              return {
                id: m.id,
                role: m.role,
                content: parsed.content,
                attachments: parsed.attachments,
                analytics: m.usage ? {
                  model: m.usage.model,
                  tokens: m.usage.totalTokens,
                  latency: m.usage.latency,
                  cost: m.usage.estimatedCost
                } : undefined
              };
            }
            return {
              id: m.id,
              role: m.role,
              content: m.content,
              analytics: m.usage ? {
                model: m.usage.model,
                tokens: m.usage.totalTokens,
                latency: m.usage.latency,
                cost: m.usage.estimatedCost
              } : undefined
            };
          });
          setMessages(formatted);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  };

  const handleCreateSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setChatInput('');
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      handleCreateSession();
    }
  };

  const handleSendChat = async (directPrompt?: string) => {
    const promptToSend = directPrompt || chatInput;
    if (!promptToSend.trim() || isChatLoading) return;

    // Add user message and a placeholder assistant message to state immediately
    const newUserMsg: Message = { role: 'user', content: promptToSend, attachments };
    const apiMessages = [...messages, newUserMsg];
    const placeholderAssistantMsg: Message = { role: 'assistant', content: '' };
    setMessages([...apiMessages, placeholderAssistantMsg]);
    setChatInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId && !currentSessionId.startsWith('mock-') ? currentSessionId : undefined,
          messages: apiMessages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          attachments: currentAttachments.map(a => ({ name: a.name, type: a.type, content: a.content }))
        })
      });

      if (!res.ok) {
        throw new Error('Failed to resolve stream session');
      }

      if (!res.body) {
        throw new Error('Response stream has no body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value);
        const lines = chunkText.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          let parsed: {
            sessionId?: string;
            text?: string;
            analytics?: {
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
            };
            error?: string;
          } | null = null;
          try {
            parsed = JSON.parse(line);
          } catch (jsonErr) {
            // Wait for full chunk buffer or ignore partial parsing
            continue;
          }

          if (parsed) {
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            const resolvedSessionId = parsed.sessionId;
            if (resolvedSessionId) {
              setCurrentSessionId(resolvedSessionId);
              // Update session in sidebar
              setSessions(prev => {
                if (prev.some(s => s.id === resolvedSessionId)) return prev;
                const newSession: Session = {
                  id: resolvedSessionId,
                  title: promptToSend.slice(0, 30).trim() + (promptToSend.length > 30 ? '...' : ''),
                  startedAt: new Date().toISOString()
                };
                return [newSession, ...prev.filter(s => s.id !== 'mock-session-1')];
              });
            }

            if (parsed.text) {
              accumulatedContent += parsed.text;
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  last.content = accumulatedContent;
                }
                return copy;
              });
            }

            const resolvedAnalytics = parsed.analytics;
            if (resolvedAnalytics) {
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  last.analytics = resolvedAnalytics;
                  if (resolvedAnalytics.messageId) {
                    last.id = resolvedAnalytics.messageId;
                  }
                }
                return copy;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          last.content = `Network error: ${error instanceof Error ? error.message : 'Check connection.'}`;
        } else if (last && last.role === 'assistant') {
          last.content += `\n\n[Stream interrupted: ${error instanceof Error ? error.message : 'Unknown error'}]`;
        }
        return copy;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleOptimizeCode = async () => {
    if (!optimizerCode.trim() || isOptimizeLoading) return;

    setIsOptimizeLoading(true);
    setOptimizerResult(null);

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: optimizerCode,
          language: optimizerLang
        })
      });

      if (res.ok) {
        const data = await res.json();
        setOptimizerResult(data);
      } else {
        const errorData = await res.json();
        console.error('Code optimization error:', errorData);
      }
    } catch (error) {
      console.error('Error executing optimization:', error);
    } finally {
      setIsOptimizeLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-screen bg-[#06080c] flex items-center justify-center text-muted-foreground text-xs font-mono select-none relative">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full ambient-glow-indigo z-0" />
        <div className="absolute inset-0 dify-grid-bg grid-mask pointer-events-none z-0" />
        <div className="flex flex-col items-center gap-3.5 z-10">
          <Loader2 size={18} className="animate-spin text-primary" />
          <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-400">Verifying secure workspace session...</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-foreground relative font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full ambient-glow-indigo z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full ambient-glow-purple z-0" />
      <div className="absolute top-[30%] left-[45%] w-[40%] h-[40%] rounded-full ambient-glow-cyan z-0" />
      
      {/* Background dot grid */}
      <div className="absolute inset-0 dify-grid-bg grid-mask pointer-events-none z-0" />
      {/* 1. Left Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        onShowDashboard={() => setIsDashboardOpen(true)}
        onSignOut={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      {/* 2. Middle Chat Area */}
      <ChatArea
        messages={messages}
        input={chatInput}
        onInputChange={setChatInput}
        onSend={() => handleSendChat()}
        isLoading={isChatLoading}
        activeSessionId={currentSessionId}
        onQuickPrompt={(prompt) => handleSendChat(prompt)}
        onShowDashboard={() => setIsDashboardOpen(true)}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
      />

      {/* 3. Right Sidebar Code Optimizer */}
      <CodeOptimizer
        code={optimizerCode}
        onCodeChange={setOptimizerCode}
        language={optimizerLang}
        onLanguageChange={setOptimizerLang}
        onOptimize={handleOptimizeCode}
        isLoading={isOptimizeLoading}
        result={optimizerResult}
        isExpanded={isOptimizerExpanded}
        onToggleExpand={() => setIsOptimizerExpanded(!isOptimizerExpanded)}
      />

      {/* Observability Dashboard Modal */}
      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
      />
    </div>
  );
}

function parseMessageContent(rawContent: string): { content: string; attachments: FileAttachment[] } {
  const attachments: FileAttachment[] = [];
  let content = rawContent;

  // Parse text attachments
  const textRegex = /---ATTACHMENT:([\s\S]*?)---([\s\S]*?)---END_ATTACHMENT---/g;
  let match;
  while ((match = textRegex.exec(rawContent)) !== null) {
    attachments.push({
      id: Math.random().toString(36).substring(7),
      name: match[1],
      type: 'text/plain',
      content: match[2],
      size: match[2].length
    });
  }
  content = content.replace(textRegex, '');

  // Parse image attachments
  const imageRegex = /---IMAGE_ATTACHMENT:([\s\S]*?):([\s\S]*?)---([\s\S]*?)---END_ATTACHMENT---/g;
  while ((match = imageRegex.exec(rawContent)) !== null) {
    attachments.push({
      id: Math.random().toString(36).substring(7),
      name: match[1],
      type: match[2],
      content: match[3],
      size: Math.round((match[3].length * 3) / 4)
    });
  }
  content = content.replace(imageRegex, '');

  return { content: content.trim(), attachments };
}

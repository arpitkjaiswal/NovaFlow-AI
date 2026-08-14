'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, Loader2, Brain, Copy, Check, Info, ThumbsUp, ThumbsDown, Paperclip, Command, GitFork, BarChart3, ChevronDown, Trash2, FileCode, X, Image as ImageIcon } from 'lucide-react';
import SystemArchitecture from './SystemArchitecture';

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Default - Ultra-fast, ideal for general coding questions.', speed: 'Fastest', intelligence: 'High' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Complex reasoning, multi-turn coding logic & optimization.', speed: 'Moderate', intelligence: 'Ultra-High' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Large context window, great for large uploaded codebase reviews.', speed: 'Moderate', intelligence: 'High' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Fast multimodal processing for quick text and image uploads.', speed: 'Fast', intelligence: 'Standard' },
];

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

interface ChatAreaProps {
  messages: Message[];
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  activeSessionId: string | null;
  onQuickPrompt: (prompt: string) => void;
  onShowDashboard?: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  attachments: FileAttachment[];
  onAttachmentsChange: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
}

export default function ChatArea({
  messages,
  input,
  onInputChange,
  onSend,
  isLoading,
  activeSessionId,
  onQuickPrompt,
  onShowDashboard,
  selectedModel,
  onModelChange,
  attachments,
  onAttachmentsChange
}: ChatAreaProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, 'like' | 'dislike'>>({});
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      
      if (file.type.startsWith('image/')) {
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          onAttachmentsChange(prev => {
            if (prev.some(f => f.name === file.name)) return prev;
            return [...prev, {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              type: file.type,
              content: base64,
              size: file.size
            }];
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const text = event.target?.result as string;
          onAttachmentsChange(prev => {
            if (prev.some(f => f.name === file.name)) return prev;
            return [...prev, {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              type: file.type,
              content: text,
              size: file.size
            }];
          });
        };
        reader.readAsText(file);
      }
    });

    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(prev => prev.filter(att => att.id !== id));
  };

  const handleFeedback = async (messageId: string, rating: 'like' | 'dislike') => {
    setFeedbackRatings(prev => ({ ...prev, [messageId]: rating }));
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, rating })
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const starterPrompts = [
    {
      title: 'Optimize React State',
      desc: 'How can I optimize state updates in recursive tree structures?',
      prompt: 'Write a React component for a recursive tree menu and explain how to optimize rendering performance using React.memo or other state patterns.'
    },
    {
      title: 'Explain Async/Await',
      desc: 'Explain the event loop and microtask execution order.',
      prompt: 'Explain the internal execution order of JavaScript Promises, async/await, and setTimeout. Provide a code example showing the console output sequence.'
    },
    {
      title: 'Algorithm complexity',
      desc: 'Analyze space-time tradeoffs in hash map designs.',
      prompt: 'What are the space and time complexity trade-offs of using open addressing vs chaining for collision resolution in hash tables?'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07090e]/30 border-r border-white/[0.05] relative overflow-hidden font-sans">
      {/* Dify grid background pattern */}
      <div className="absolute inset-0 dify-grid-bg pointer-events-none opacity-50" />

      {/* Top Header */}
      <div className="h-14 border-b border-white/[0.04] flex items-center justify-between px-6 z-10 bg-[#090c12]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Brain size={12} className="text-primary" />
          </div>
          <h2 className="text-xs font-semibold text-slate-200 tracking-wide select-none">Orchestration Session</h2>
        </div>
        <div className="flex items-center gap-2">
          {onShowDashboard && (
            <button
              onClick={onShowDashboard}
              className="p-1.5 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-300 transition-all-300 cursor-pointer border border-indigo-500/20 flex items-center gap-1.5 text-[9.5px] font-semibold shadow-inner"
              title="Telemetry Dashboard"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="hidden sm:inline">Telemetry Dashboard</span>
              <span className="inline sm:hidden">Telemetry</span>
            </button>
          )}

          {messages.length > 0 && (
            <div className="flex items-center gap-1.5 text-[9.5px] text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/15 select-none animate-fade-in">
              <Sparkles size={9} />
              <span className="font-semibold">Active Trace</span>
            </div>
          )}
          
          <button
            onClick={() => setIsArchOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-white transition-all cursor-pointer border border-transparent hover:border-white/[0.02] flex items-center gap-1.5 text-[9.5px] font-semibold"
            title="System Architecture"
          >
            <GitFork size={12} className="text-indigo-400" />
            <span className="hidden sm:inline">System Architecture</span>
          </button>
        </div>
      </div>

      {messages.length === 0 ? (
        /* Empty State Center Box */
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full px-6 z-10 select-none animate-fade-in">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent tracking-tight text-glow-indigo">
              How can I help today?
            </h3>
            <p className="text-[11px] text-muted-foreground/60 mt-2 font-medium">
              Select a preset template or type a new code command
            </p>
          </div>

          {/* Quick Suggestions Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4 select-none">
            {starterPrompts.map((starter, i) => (
              <button
                key={i}
                onClick={() => onQuickPrompt(starter.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111522]/40 hover:bg-[#151a2c]/85 border border-white/[0.04] hover:border-indigo-500/35 cursor-pointer transition-all duration-200 text-[10px] text-slate-300 font-medium shadow-md shadow-black/10 hover:shadow-indigo-500/5 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Sparkles size={9} className="text-indigo-400" />
                {starter.title}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Conversation Mode */
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 z-10 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message, i) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={i}
                  className={`flex gap-3.5 items-start ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Left Avatar for AI */}
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center flex-shrink-0 text-white font-mono text-[9px] font-bold shadow-md shadow-primary/25 border border-indigo-400/20 select-none">
                      DF
                    </div>
                  )}

                  {/* Bubble Container */}
                  <div className="flex flex-col space-y-1.5 max-w-[85%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-[11px] leading-relaxed select-text shadow-md ${
                        isUser
                          ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-50 font-medium animate-fade-in shadow-[0_4px_16px_rgba(99,102,241,0.05)]'
                          : 'bg-[#101420]/50 border border-white/[0.04] text-slate-200 backdrop-blur-sm shadow-inner shadow-black/20'
                      }`}
                    >
                      {isUser ? (
                        <div className="space-y-2">
                          <span className="whitespace-pre-wrap">{message.content}</span>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1.5 border-t border-white/[0.04] mt-1.5">
                              {message.attachments.map((att, attIdx) => {
                                const isImage = att.type.startsWith('image/');
                                return (
                                  <div 
                                    key={attIdx} 
                                    className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800 rounded-lg p-1.5 text-[9px] font-mono text-slate-300 shadow-sm"
                                  >
                                    {isImage ? (
                                      <div className="relative w-6 h-6 rounded overflow-hidden border border-zinc-800 flex items-center justify-center bg-zinc-900">
                                        <img src={att.content} alt={att.name} className="object-cover w-full h-full" />
                                      </div>
                                    ) : (
                                      <div className="p-1 rounded bg-zinc-900 border border-zinc-800 text-primary">
                                        <Paperclip size={10} />
                                      </div>
                                    )}
                                    <div className="flex flex-col text-left">
                                      <span className="max-w-[120px] truncate text-slate-200 font-medium">{att.name}</span>
                                      <span className="text-[7.5px] text-zinc-500 font-medium">
                                        {isImage ? 'IMAGE' : 'CODE'} • {(att.size / 1024).toFixed(1)} KB
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {parseMarkdown(message.content)}
                        </div>
                      )}
                    </div>

                    {/* Token Analytics / Cost (For AI responses) */}
                    {!isUser && message.analytics && (
                      <div className="flex items-center justify-between ml-1 text-[8.5px] text-muted-foreground/50 font-mono select-none w-full animate-fade-in">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Info size={9} className="text-indigo-400" />
                            {message.analytics.model}
                          </span>
                          <span>•</span>
                          <span>{message.analytics.latency}ms</span>
                          <span>•</span>
                          <span>{message.analytics.tokens} tokens</span>
                          <span>•</span>
                          <span className="text-emerald-500 font-medium">
                            ${message.analytics.cost.toFixed(5)}
                          </span>
                        </div>

                        {/* Thumbs up / down feedback action buttons */}
                        {message.id && (
                          <div className="flex items-center gap-2 border border-border/30 rounded px-1.5 py-0.5 bg-[#090d14]/40 backdrop-blur-sm">
                            <button
                              onClick={() => handleFeedback(message.id!, 'like')}
                              className={`hover:text-primary transition-colors flex items-center cursor-pointer ${
                                feedbackRatings[message.id] === 'like' ? 'text-primary' : 'text-muted-foreground/50'
                              }`}
                              title="Helpful response"
                            >
                              <ThumbsUp size={10} />
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id!, 'dislike')}
                              className={`hover:text-rose-400 transition-colors flex items-center cursor-pointer ${
                                feedbackRatings[message.id] === 'dislike' ? 'text-rose-400' : 'text-muted-foreground/50'
                              }`}
                              title="Unhelpful response"
                            >
                              <ThumbsDown size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Avatar for User */}
                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-[#161b22] border border-border/60 flex items-center justify-center flex-shrink-0 text-slate-300 font-mono text-[9px] font-bold shadow-sm select-none">
                      U
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3.5 items-start animate-fade-in">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center flex-shrink-0 text-white font-mono text-[9px] font-bold border border-indigo-400/20 select-none">
                  DF
                </div>
                <div className="bg-[#0b0e14]/20 border border-border/20 rounded-2xl px-4 py-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 size={12} className="animate-spin text-primary" />
                  <span>Generating output stream...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Prompt Input at the bottom */}
      <div className="p-5 z-10 border-t border-white/[0.04] bg-[#070a0f]/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto bg-[#0e121a]/85 border border-white/[0.05] rounded-xl p-3.5 shadow-2xl shadow-black/50 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/10 transition-all duration-200 relative backdrop-blur-md">
          
          {/* ATTACHMENT PREVIEWS CHIPS */}
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3.5 pb-2.5 border-b border-white/[0.04]">
              {attachments.map(att => {
                const isImage = att.type.startsWith('image/');
                return (
                  <div 
                    key={att.id} 
                    className="flex items-center gap-2 bg-zinc-900 border border-zinc-850 rounded-lg p-1.5 pr-2.5 text-[10px] font-mono text-zinc-300 shadow-md group relative hover:border-zinc-700 transition-colors"
                  >
                    {isImage ? (
                      <div className="relative w-6 h-6 rounded overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                        <img src={att.content} alt={att.name} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="p-1 rounded bg-zinc-950 border border-zinc-800 text-primary">
                        <FileCode size={12} />
                      </div>
                    )}
                    <div className="flex flex-col text-left">
                      <span className="max-w-[150px] truncate text-slate-200 font-medium">{att.name}</span>
                      <span className="text-[7.5px] text-zinc-500 font-medium">{(att.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="ml-1 p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask DevFlow AI a question..."
            className="w-full bg-transparent border-none outline-none text-[11px] text-slate-100 placeholder-muted-foreground/45 resize-none min-h-[44px] max-h-44 py-1.5 select-text"
            rows={1}
          />
          <div className="flex items-center justify-between border-t border-white/[0.04] pt-2.5 mt-2">
            <div className="flex items-center gap-1.5 relative">
              
              {/* HIDDEN FILE INPUT */}
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />

              {/* PAPERCLIP ATTACH BUTTON */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-md hover:bg-white/[0.03] text-muted-foreground/50 hover:text-slate-300 transition-colors cursor-pointer"
                title="Attach text, code or image files"
              >
                <Paperclip size={12} />
              </button>

              {/* MODEL SELECTOR DROPDOWN */}
              <div className="relative">
                <button
                  onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                  className="flex items-center gap-1.5 p-1 px-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-slate-200 transition-colors text-[9.5px] font-semibold tracking-wide shadow-sm cursor-pointer select-none"
                >
                  <Brain size={10} className="text-primary" />
                  <span>{AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}</span>
                  <ChevronDown size={9} className="text-muted-foreground/60" />
                </button>

                {isModelMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
                    <div className="absolute bottom-full mb-2 left-0 z-50 bg-zinc-900/95 border border-zinc-800 rounded-xl p-1.5 shadow-2xl w-72 backdrop-blur-md animate-fade-in">
                      <div className="px-2.5 py-1.5 text-[8.5px] uppercase font-bold tracking-wider text-muted-foreground/55 border-b border-zinc-800/60 mb-1 font-sans">
                        Select Gateway AI Model
                      </div>
                      <div className="space-y-0.5">
                        {AVAILABLE_MODELS.map(modelItem => {
                          const isSelected = modelItem.id === selectedModel;
                          return (
                            <div
                              key={modelItem.id}
                              onClick={() => {
                                onModelChange(modelItem.id);
                                setIsModelMenuOpen(false);
                              }}
                              className={`flex flex-col p-2.5 rounded-lg cursor-pointer transition-all duration-200 text-left ${
                                isSelected
                                  ? 'bg-primary/10 border border-primary/25 text-white'
                                  : 'hover:bg-zinc-800/60 border border-transparent text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-semibold">{modelItem.name}</span>
                                <div className="flex items-center gap-1">
                                  <span className={`text-[7.5px] font-bold px-1 py-0.2 rounded font-mono ${
                                    modelItem.speed === 'Fastest' || modelItem.speed === 'Fast' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                                  }`}>
                                    {modelItem.speed}
                                  </span>
                                  <span className="text-[7.5px] font-bold px-1 py-0.2 rounded font-mono bg-zinc-950 border border-zinc-800 text-slate-300">
                                    {modelItem.intelligence} Intelligence
                                  </span>
                                </div>
                              </div>
                              <span className="text-[8.5px] text-zinc-500 leading-normal font-sans">{modelItem.desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 p-1 px-1.5 rounded bg-white/[0.02] border border-white/[0.03] text-muted-foreground/40 text-[9px] font-mono select-none">
                <Command size={8} />
                <span>K</span>
              </div>
            </div>
            <button
              onClick={onSend}
              disabled={isLoading || !input.trim()}
              className="p-1.5 px-3 rounded-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white disabled:opacity-45 disabled:pointer-events-none transition-all duration-200 flex items-center gap-1 text-[10px] font-semibold tracking-wide shadow-md shadow-primary/10 hover:shadow-primary/15 active:scale-[0.98] cursor-pointer border border-primary/20"
            >
              <Send size={10} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
      <SystemArchitecture isOpen={isArchOpen} onClose={() => setIsArchOpen(false)} />
    </div>
  );
}

// Inline formatting helper (processes bold and inline code)
function formatInlineText(text: string): React.ReactNode {
  const tokens: (string | React.ReactNode)[] = [];
  let currentText = text;
  let keyIdx = 0;
  
  while (currentText.length > 0) {
    const boldIndex = currentText.indexOf('**');
    const codeIndex = currentText.indexOf('`');
    
    if (boldIndex === -1 && codeIndex === -1) {
      tokens.push(currentText);
      break;
    }
    
    if (boldIndex !== -1 && (codeIndex === -1 || boldIndex < codeIndex)) {
      if (boldIndex > 0) {
        tokens.push(currentText.substring(0, boldIndex));
      }
      const nextBold = currentText.indexOf('**', boldIndex + 2);
      if (nextBold !== -1) {
        const boldText = currentText.substring(boldIndex + 2, nextBold);
        tokens.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-slate-100">
            {boldText}
          </strong>
        );
        currentText = currentText.substring(nextBold + 2);
      } else {
        tokens.push(currentText.substring(boldIndex));
        break;
      }
    } else {
      if (codeIndex > 0) {
        tokens.push(currentText.substring(0, codeIndex));
      }
      const nextCode = currentText.indexOf('`', codeIndex + 1);
      if (nextCode !== -1) {
        const codeText = currentText.substring(codeIndex + 1, nextCode);
        tokens.push(
          <code key={`code-${keyIdx++}`} className="px-1.5 py-0.5 rounded bg-black/40 border border-border/40 font-mono text-[9px] text-primary">
            {codeText}
          </code>
        );
        currentText = currentText.substring(nextCode + 1);
      } else {
        tokens.push(currentText.substring(codeIndex));
        break;
      }
    }
  }
  
  return <>{tokens}</>;
}

// Markdown parser
function parseMarkdown(content: string) {
  if (!content || !content.trim()) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-mono text-primary select-none">
        <Loader2 size={10} className="animate-spin text-primary" />
        <span className="text-slate-400">Thinking...</span>
      </span>
    );
  }

  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const language = match ? match[1] : 'code';
      const code = match ? match[2] : part.slice(3, -3);
      return <CodeBlock key={index} language={language} code={code} />;
    }

    // Parse non-code blocks line-by-line, grouping paragraphs and lists
    const lines = part.split('\n');
    const elements: React.ReactNode[] = [];
    
    let currentParagraph: string[] = [];
    let currentUnorderedList: string[] = [];
    let currentOrderedList: { num: string; text: string }[] = [];
    let currentBlockquote: string[] = [];

    const flushParagraph = (key: string) => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={key} className="text-[11px] leading-relaxed text-slate-355 font-sans select-text mb-2.5 last:mb-0">
            {formatInlineText(currentParagraph.join(' '))}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushUnorderedList = (key: string) => {
      if (currentUnorderedList.length > 0) {
        elements.push(
          <ul key={key} className="space-y-1 mb-2.5 last:mb-0 pl-2">
            {currentUnorderedList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-355 select-text">
                <span className="text-primary mt-1.5 text-[6px] select-none flex-shrink-0">•</span>
                <span className="flex-1">{formatInlineText(item)}</span>
              </li>
            ))}
          </ul>
        );
        currentUnorderedList = [];
      }
    };

    const flushOrderedList = (key: string) => {
      if (currentOrderedList.length > 0) {
        elements.push(
          <ol key={key} className="space-y-1 mb-2.5 last:mb-0 pl-2">
            {currentOrderedList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-355 select-text">
                <span className="text-primary font-mono text-[9px] font-bold select-none mt-0.5 flex-shrink-0">{item.num}.</span>
                <span className="flex-1">{formatInlineText(item.text)}</span>
              </li>
            ))}
          </ol>
        );
        currentOrderedList = [];
      }
    };

    const flushBlockquote = (key: string) => {
      if (currentBlockquote.length > 0) {
        elements.push(
          <blockquote key={key} className="border-l-2 border-primary/50 bg-white/[0.015] pl-3 py-1.5 my-2 rounded-r text-[11px] leading-relaxed text-slate-350 italic select-text">
            {formatInlineText(currentBlockquote.join(' '))}
          </blockquote>
        );
        currentBlockquote = [];
      }
    };

    const flushAll = (keyPrefix: string) => {
      flushParagraph(`${keyPrefix}-p`);
      flushUnorderedList(`${keyPrefix}-ul`);
      flushOrderedList(`${keyPrefix}-ol`);
      flushBlockquote(`${keyPrefix}-bq`);
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Horizontal Rule
      if (trimmed === '---') {
        flushAll(`hr-${i}`);
        elements.push(<div key={`hr-${i}`} className="my-3 border-t border-border/40 w-full" />);
        continue;
      }

      // Headers
      if (trimmed.startsWith('#')) {
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
          flushAll(`h-${i}`);
          const depth = headerMatch[1].length;
          const text = headerMatch[2];
          const sizeClass = 
            depth === 1 ? 'text-sm font-bold text-slate-100 mt-3 mb-1.5 block' :
            depth === 2 ? 'text-xs font-bold text-slate-100 mt-2.5 mb-1 block' :
            'text-[10px] font-bold text-slate-200 mt-2 mb-1 block';
          elements.push(
            <span key={`header-${i}`} className={sizeClass}>
              {formatInlineText(text)}
            </span>
          );
          continue;
        }
      }

      // Blockquotes
      if (trimmed.startsWith('>')) {
        flushParagraph(`bq-flush-p-${i}`);
        flushUnorderedList(`bq-flush-ul-${i}`);
        flushOrderedList(`bq-flush-ol-${i}`);
        const text = trimmed.substring(1).trim();
        currentBlockquote.push(text);
        continue;
      }

      // Unordered List Items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushParagraph(`ul-flush-p-${i}`);
        flushOrderedList(`ul-flush-ol-${i}`);
        flushBlockquote(`ul-flush-bq-${i}`);
        currentUnorderedList.push(trimmed.substring(2));
        continue;
      }

      // Ordered List Items
      const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numListMatch) {
        flushParagraph(`ol-flush-p-${i}`);
        flushUnorderedList(`ol-flush-ul-${i}`);
        flushBlockquote(`ol-flush-bq-${i}`);
        currentOrderedList.push({ num: numListMatch[1], text: numListMatch[2] });
        continue;
      }

      // Empty Lines
      if (trimmed === '') {
        flushAll(`empty-${i}`);
        continue;
      }

      // Standard text line -> accumulator for paragraph
      flushUnorderedList(`p-flush-ul-${i}`);
      flushOrderedList(`p-flush-ol-${i}`);
      flushBlockquote(`p-flush-bq-${i}`);
      currentParagraph.push(line);
    }

    flushAll(`final-${index}`);
    return <div key={index} className="space-y-1">{elements}</div>;
  });
}

// Codeblock Component with Copy utility
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 border border-border/80 rounded-lg overflow-hidden bg-[#05070a] font-mono shadow-inner select-text">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#090d14] border-b border-border/40 text-[9px] text-muted-foreground select-none">
        <span className="font-semibold uppercase tracking-wider text-[8px] text-indigo-400">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 py-0.5 px-1 rounded hover:bg-secondary hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check size={9} className="text-emerald-500" />
              <span className="text-emerald-500 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy size={9} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[10px] leading-relaxed text-slate-300">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

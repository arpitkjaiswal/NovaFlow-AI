'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Sparkles, Activity, Cpu, ArrowUpRight, DollarSign, Database, Clock, RefreshCw } from 'lucide-react';

interface UsageStats {
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  avgLatency: number;
  promptTokens: number;
  completionTokens: number;
  chatCount: number;
  optimizeCount: number;
  recentLogs: Array<{
    id: string;
    type: 'chat' | 'optimize';
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    latency: number;
    createdAt: string;
  }>;
  systemLogs?: Array<{
    id: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: string | null;
    createdAt: string;
  }>;
}

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DashboardModal({ isOpen, onClose }: DashboardModalProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'logs'>('analytics');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchStats();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchStats]);

  if (!isOpen) return null;

  const promptPercent = stats?.totalTokens
    ? Math.round((stats.promptTokens / stats.totalTokens) * 100)
    : 50;
  const completionPercent = 100 - promptPercent;

  const chatPercent = stats?.totalRequests
    ? Math.round((stats.chatCount / stats.totalRequests) * 100)
    : 50;
  const optimizePercent = 100 - chatPercent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl h-[85vh] bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col shadow-2xl overflow-hidden relative font-sans select-text">
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 dify-grid-bg pointer-events-none opacity-30" />

        {/* Modal Header */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/90 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
              <Activity size={12} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200 tracking-wide">Observability & Telemetry Gateway</h2>
              <p className="text-[9px] text-muted-foreground/60 font-mono">Langfuse Session Sync</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-1.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-white transition-colors cursor-pointer disabled:opacity-40"
              title="Refresh Analytics"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="h-10 border-b border-zinc-800 bg-zinc-950/45 flex px-6 z-10 select-none">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 text-[10px] uppercase font-bold tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-slate-200'
            }`}
          >
            Model Analytics
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 text-[10px] uppercase font-bold tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-slate-200'
            }`}
          >
            Server & Gateway Logs
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
          {loading && !stats ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-[11px] gap-2 select-none">
              <RefreshCw size={16} className="animate-spin text-primary" />
              <span>Fetching telemetry data...</span>
            </div>
          ) : stats ? (
            <>
              {activeTab === 'analytics' ? (
                <>
                  {/* Stat Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground/80">
                        <span className="text-[9px] uppercase tracking-wider font-bold">Total Cost</span>
                        <DollarSign size={10} className="text-emerald-400" />
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-semibold text-emerald-400 font-mono">
                          ${stats.totalCost.toFixed(5)}
                        </span>
                        <p className="text-[8px] text-muted-foreground/50 mt-0.5">Gemini Telemetry Pricing</p>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground/80">
                        <span className="text-[9px] uppercase tracking-wider font-bold">Total Traces</span>
                        <ArrowUpRight size={10} className="text-primary" />
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-semibold text-slate-100 font-mono">
                          {stats.totalRequests}
                        </span>
                        <p className="text-[8px] text-muted-foreground/50 mt-0.5">Logged Operations</p>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground/80">
                        <span className="text-[9px] uppercase tracking-wider font-bold">Total Tokens</span>
                        <Database size={10} className="text-indigo-400" />
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-semibold text-indigo-300 font-mono">
                          {stats.totalTokens.toLocaleString()}
                        </span>
                        <p className="text-[8px] text-muted-foreground/50 mt-0.5">Prompt + Completion</p>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground/80">
                        <span className="text-[9px] uppercase tracking-wider font-bold">Avg Latency</span>
                        <Clock size={10} className="text-amber-400" />
                      </div>
                      <div className="mt-2">
                        <span className="text-lg font-semibold text-amber-300 font-mono">
                          {stats.avgLatency >= 1000
                            ? `${(stats.avgLatency / 1000).toFixed(2)}s`
                            : `${Math.round(stats.avgLatency)}ms`}
                        </span>
                        <p className="text-[8px] text-muted-foreground/50 mt-0.5">API round-trip delay</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress split bars */}
                  <div className="grid grid-cols-2 gap-4.5">
                    <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg space-y-3 select-none">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-slate-300">
                        <span>Token Distribution</span>
                        <span className="font-mono text-indigo-400">{stats.promptTokens.toLocaleString()} vs {stats.completionTokens.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-secondary flex">
                        <div className="bg-gradient-to-r from-primary to-indigo-500 h-full" style={{ width: `${promptPercent}%` }} />
                        <div className="bg-emerald-400 h-full" style={{ width: `${completionPercent}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-muted-foreground/80 font-mono">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Prompt Context ({promptPercent}%)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Completion Output ({completionPercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg space-y-3 select-none">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-slate-300">
                        <span>Pipeline Split</span>
                        <span className="font-mono text-indigo-400">{stats.chatCount} vs {stats.optimizeCount}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-secondary flex">
                        <div className="bg-gradient-to-r from-primary to-indigo-500 h-full" style={{ width: `${chatPercent}%` }} />
                        <div className="bg-violet-400 h-full" style={{ width: `${optimizePercent}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-muted-foreground/80 font-mono">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Orchestration Chat ({chatPercent}%)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                          Code Optimizer ({optimizePercent}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operations Table */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5 select-none">
                      <Sparkles size={11} className="text-primary" />
                      Recent Operations Log
                    </h3>
                    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/50">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-zinc-800 border-b border-zinc-800 text-muted-foreground font-mono text-[9px]">
                            <th className="py-2.5 px-4">Pipeline</th>
                            <th className="py-2.5 px-4">Model</th>
                            <th className="py-2.5 px-4">Tokens</th>
                            <th className="py-2.5 px-4">Cost</th>
                            <th className="py-2.5 px-4">Latency</th>
                            <th className="py-2.5 px-4 text-right">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40 text-slate-300 font-mono">
                          {stats.recentLogs.map((log, i) => (
                            <tr key={log.id || i} className="hover:bg-zinc-900/40 transition-colors">
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-semibold border ${
                                  log.type === 'chat'
                                    ? 'bg-primary/10 border-primary/25 text-primary'
                                    : 'bg-violet-500/10 border-violet-500/25 text-violet-300'
                                }`}>
                                  {log.type === 'chat' ? 'CHAT' : 'OPTIMIZE'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-400">{log.model}</td>
                              <td className="py-2.5 px-4">{log.totalTokens}</td>
                              <td className="py-2.5 px-4 text-emerald-400">${log.estimatedCost.toFixed(5)}</td>
                              <td className="py-2.5 px-4 text-amber-400">{log.latency}ms</td>
                              <td className="py-2.5 px-4 text-right text-muted-foreground/60">
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {stats.recentLogs.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground/40 font-mono text-[10px]">
                          No operations logged yet
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Terminal-Style System Logs Tab */
                <div className="space-y-3 h-full flex flex-col">
                  <div className="flex items-center justify-between select-none">
                    <h3 className="text-[10px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                      <Database size={11} className="text-primary" />
                      Gateway & Server Event Logs
                    </h3>
                    <span className="text-[8px] text-muted-foreground font-mono">Real-time DB Sync</span>
                  </div>
                  <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/80 font-mono text-[10px] leading-relaxed overflow-y-auto h-[48vh] space-y-2">
                    {stats.systemLogs && stats.systemLogs.length > 0 ? (
                      stats.systemLogs.map((log, idx: number) => (
                        <div key={log.id || idx} className="flex gap-4 items-start py-1 border-b border-zinc-900/35 hover:bg-zinc-900/20 transition-colors">
                          <span className="text-muted-foreground/40 select-none min-w-[70px]">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className={`font-semibold min-w-[45px] uppercase select-none ${
                            log.level === 'error'
                              ? 'text-rose-500'
                              : log.level === 'warn'
                              ? 'text-amber-500'
                              : 'text-emerald-400'
                          }`}>
                            [{log.level}]
                          </span>
                          <span className="text-slate-300 flex-1 break-all">
                            {log.message}
                            {log.context && (
                              <span className="block text-[9px] text-muted-foreground/50 mt-1 pl-2.5 border-l border-zinc-800 whitespace-pre-wrap">
                                Context: {log.context}
                              </span>
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground/40 py-12 select-none">
                        No system logs recorded yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-[10px] font-mono">
              Unable to load usage analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

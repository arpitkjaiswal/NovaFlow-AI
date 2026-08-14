'use client';

import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, Terminal, Cpu, Settings, Sparkles, BarChart3, LogOut, Search } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  startedAt: string;
}

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onShowDashboard: () => void;
  onSignOut: () => void;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onShowDashboard,
  onSignOut
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-60 border-r border-white/[0.05] bg-[#090b10]/65 backdrop-blur-xl flex flex-col h-full text-foreground select-none relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-black/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <Terminal size={12.5} className="text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-xs tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DevFlow AI
            </h1>
            <p className="text-[8.5px] text-muted-foreground/50 font-mono tracking-wider">CONSOLE v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-md hover:bg-red-500/10 cursor-pointer text-muted-foreground/60 hover:text-red-400 transition-all duration-200 border border-transparent hover:border-red-500/10"
            title="Sign Out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* New Session Button */}
      <div className="p-3">
        <button
          onClick={onCreateSession}
          className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)] hover:shadow-[0_0_18px_rgba(99,102,241,0.35)] active:scale-[0.98] cursor-pointer border border-indigo-500/30"
        >
          <Plus size={12} />
          New Conversation
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative flex items-center">
          <Search size={11} className="absolute left-2.5 text-muted-foreground/45 pointer-events-none" />
          <input
            type="text"
            placeholder="Search chat traces..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-[10.5px] pl-7 pr-2.5 py-1.5 rounded-lg bg-[#11141e]/70 border border-white/[0.05] focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none text-foreground placeholder-muted-foreground/35 transition-all font-medium"
          />
        </div>
      </div>

      {/* Langfuse Observability Telemetry Widget */}
      <div className="px-3 pb-2 select-none">
        <div 
          onClick={onShowDashboard}
          className="relative overflow-hidden rounded-xl bg-[#11141e]/55 border border-white/[0.04] hover:border-primary/50 transition-all-300 p-3 cursor-pointer group shadow-lg shadow-black/10"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-xl pointer-events-none group-hover:bg-primary/10 transition-all duration-300" />
          
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Langfuse Observability
            </span>
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold text-emerald-400 font-mono">
              LIVE
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-zinc-200 font-semibold group-hover:text-primary transition-colors">
                Token & Billing Analysis
              </p>
              <p className="text-[8px] text-zinc-500 mt-0.5 font-medium">Click to inspect active trace costs</p>
            </div>
            <BarChart3 size={14} className="text-primary group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground/35 text-[10px] font-medium font-sans">
            No traces found
          </div>
        ) : (
          filteredSessions.map(session => {
            const isActive = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 text-[11px] relative border border-transparent ${
                  isActive
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-white font-semibold shadow-sm'
                    : 'text-muted-foreground/80 hover:bg-[#11141e]/40 hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r" />
                )}
                <div className="flex items-center gap-2 overflow-hidden w-full pr-2">
                  <MessageSquare
                    size={11.5}
                    className={isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground'}
                  />
                  <span className="truncate block select-none">{session.title}</span>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-400 transition-all duration-200"
                >
                  <Trash2 size={10.5} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/[0.04] bg-[#07090e]/95 flex items-center justify-between text-[9px] text-muted-foreground/50 select-none">
        <div className="flex items-center gap-1.5 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Gateway: Online</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[8px] tracking-wider text-muted-foreground/40">
          <Cpu size={9} />
          <span>VERCEL + DB</span>
        </div>
      </div>
    </aside>
  );
}

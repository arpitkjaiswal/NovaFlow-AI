'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Code2, Cpu, Sparkles, Loader2, Copy, Check, ChevronRight, AlertTriangle, Maximize2, Minimize2, BarChart2 } from 'lucide-react';

// Dynamically load Monaco Editor components to prevent SSR hydration mismatches
const Editor = dynamic(() => import('@monaco-editor/react').then(mod => mod.Editor), { ssr: false });
const DiffEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.DiffEditor), { ssr: false });

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

interface CodeOptimizerProps {
  code: string;
  onCodeChange: (val: string) => void;
  language: string;
  onLanguageChange: (val: string) => void;
  onOptimize: () => void;
  isLoading: boolean;
  result: OptimizeResult | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
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

// Explanation block parser
function parseExplanation(content: string) {
  if (!content || !content.trim()) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentParagraph: string[] = [];
  let currentUnorderedList: string[] = [];
  let currentOrderedList: { num: string; text: string }[] = [];
  let currentBlockquote: string[] = [];

  const flushParagraph = (key: string) => {
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={key} className="text-[10.5px] leading-relaxed text-slate-300 font-sans select-text mb-2 last:mb-0">
          {formatInlineText(currentParagraph.join(' '))}
        </p>
      );
      currentParagraph = [];
    }
  };

  const flushUnorderedList = (key: string) => {
    if (currentUnorderedList.length > 0) {
      elements.push(
        <ul key={key} className="space-y-1 mb-2 last:mb-0 pl-1.5">
          {currentUnorderedList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-300 select-text">
              <span className="text-primary mt-1.5 text-[5px] select-none flex-shrink-0">•</span>
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
        <ol key={key} className="space-y-1 mb-2 last:mb-0 pl-1.5">
          {currentOrderedList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-300 select-text">
              <span className="text-primary font-mono text-[8.5px] font-bold select-none mt-0.5 flex-shrink-0">{item.num}.</span>
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
        <blockquote key={key} className="border-l border-primary/55 bg-white/[0.01] pl-2 py-1 my-1.5 rounded-r text-[10.5px] leading-relaxed text-slate-300 italic select-text">
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

    if (trimmed === '---') {
      flushAll(`hr-${i}`);
      elements.push(<div key={`hr-${i}`} className="my-2.5 border-t border-border/40 w-full" />);
      continue;
    }

    if (trimmed.startsWith('#')) {
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        flushAll(`h-${i}`);
        const depth = headerMatch[1].length;
        const text = headerMatch[2];
        const sizeClass = 
          depth === 1 ? 'text-[12px] font-bold text-slate-100 mt-2 mb-1 block' :
          depth === 2 ? 'text-[11px] font-bold text-slate-100 mt-2 mb-1 block' :
          'text-[10px] font-bold text-slate-200 mt-1.5 mb-0.5 block';
        elements.push(
          <span key={`header-${i}`} className={sizeClass}>
            {formatInlineText(text)}
          </span>
        );
        continue;
      }
    }

    if (trimmed.startsWith('>')) {
      flushParagraph(`bq-flush-p-${i}`);
      flushUnorderedList(`bq-flush-ul-${i}`);
      flushOrderedList(`bq-flush-ol-${i}`);
      currentBlockquote.push(trimmed.substring(1).trim());
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph(`ul-flush-p-${i}`);
      flushOrderedList(`ul-flush-ol-${i}`);
      flushBlockquote(`ul-flush-bq-${i}`);
      currentUnorderedList.push(trimmed.substring(2));
      continue;
    }

    const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numListMatch) {
      flushParagraph(`ol-flush-p-${i}`);
      flushUnorderedList(`ol-flush-ul-${i}`);
      flushBlockquote(`ol-flush-bq-${i}`);
      currentOrderedList.push({ num: numListMatch[1], text: numListMatch[2] });
      continue;
    }

    if (trimmed === '') {
      flushAll(`empty-${i}`);
      continue;
    }

    flushUnorderedList(`p-flush-ul-${i}`);
    flushOrderedList(`p-flush-ol-${i}`);
    flushBlockquote(`p-flush-bq-${i}`);
    currentParagraph.push(line);
  }

  flushAll('final');
  return <div className="space-y-1">{elements}</div>;
}

// Client-side language detection heuristics
function detectLanguage(code: string): string | null {
  if (!code.trim()) return null;

  const rustPattern = /\b(fn\b|impl\b|pub\s+use|extern\s+crate|match\s+\w+\s*\{|let\s+mut\b)/;
  const goPattern = /\b(package\s+main|import\s*\([\s\S]*?\)|func\b|go\s+func\b|chan\b|select\s*\{|defer\b)/;
  const cppPattern = /(#include\s*<iostream>|#include\s*<\w+>|\b(std::cout|std::vector|nullptr|using\s+namespace\s+std|inline\b|__global__\b))/;
  const pythonPattern = /(def\s+\w+\(.*\):|import\s+\w+|from\s+\w+\s+import|\bif\s+__name__\s*==\s*['"]__main__['"]\b)/;
  const javaPattern = /\b(public\s+class\b|public\s+static\s+void\s+main|system\.out\.print)/i;
  const typescriptPattern = /\b(interface\b|type\s+\w+\s*=|as\s+const\b|any\b|declare\b|keyof\b|readonly\b)/;
  const jsPattern = /\b(function\b|const\b|let\b|var\b|export\s+default\b)/;

  if (rustPattern.test(code)) return 'rust';
  if (goPattern.test(code)) return 'go';
  if (cppPattern.test(code)) return 'cpp';
  if (javaPattern.test(code)) return 'java';
  if (pythonPattern.test(code)) return 'python';
  if (typescriptPattern.test(code)) return 'typescript';
  if (jsPattern.test(code)) return 'javascript';

  return null;
}

export default function CodeOptimizer({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  onOptimize,
  isLoading,
  result,
  isExpanded,
  onToggleExpand
}: CodeOptimizerProps) {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedOptimized, setCopiedOptimized] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  const handleCopyOriginal = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2000);
  };

  const handleCopyOptimized = () => {
    if (!result?.optimizedCode) return;
    navigator.clipboard.writeText(result.optimizedCode);
    setCopiedOptimized(true);
    setTimeout(() => setCopiedOptimized(false), 2000);
  };

  // Define custom dark theme matching DevFlow's aesthetic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorDidMount = (editor: any, monaco: any) => {
    monaco.editor.defineTheme('devflow-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8' },
        { token: 'identifier', foreground: 'e2e8f0' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fb7185' },
        { token: 'operator', foreground: 'a78bfa' }
      ],
      colors: {
        'editor.background': '#05070a',
        'editor.foreground': '#e2e8f0',
        'editorLineNumber.foreground': '#374151',
        'editorLineNumber.activeForeground': '#818cf8',
        'editor.lineHighlightBackground': '#0e121a',
        'editor.selectionBackground': '#1e293b',
        'diffEditor.insertedTextBackground': '#10b98115',
        'diffEditor.removedTextBackground': '#ef444415'
      }
    });
    monaco.editor.setTheme('devflow-dark');
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'java', label: 'Java' }
  ];

  return (
    <div
      className={`border-l border-white/[0.05] h-full flex flex-col bg-[#090b10]/65 backdrop-blur-xl transition-all duration-300 relative select-none z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.3)] ${
        isExpanded ? 'w-[750px]' : 'w-[420px]'
      }`}
    >
      {/* Background Grid */}
      <div className="absolute inset-0 dify-grid-bg pointer-events-none opacity-20" />

      {/* Header */}
      <div className="h-14 border-b border-white/[0.04] flex items-center justify-between px-4 z-10 bg-[#090c12]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-500/10 flex items-center justify-center border border-indigo-500/15">
            <Code2 size={11} className="text-indigo-400" />
          </div>
          <h2 className="text-xs font-semibold text-slate-200 tracking-wide">Performance Optimizer</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded hover:bg-white/[0.04] hover:text-white text-muted-foreground transition-all cursor-pointer border border-transparent hover:border-white/[0.02]"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 select-text z-10 custom-scrollbar">
        {/* Editor input area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-bold">
                Algorithm Input
              </label>
              {detectedLang && (
                <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium">
                  Auto-detected: {languages.find(l => l.value === detectedLang)?.label || detectedLang}
                </span>
              )}
            </div>
            <select
              value={language}
              onChange={e => {
                onLanguageChange(e.target.value);
                setDetectedLang(null); // Lock manually selected language
              }}
              className="text-[9.5px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-slate-300 outline-none focus:border-primary/50 cursor-pointer font-medium"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900 relative min-h-[200px]">
            <Editor
              height="200px"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(val) => {
                const newCode = val || '';
                onCodeChange(newCode);
                const detected = detectLanguage(newCode);
                if (detected) {
                  setDetectedLang(detected);
                  onLanguageChange(detected);
                } else {
                  setDetectedLang(null);
                }
              }}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 10,
                lineNumbers: 'on',
                scrollbar: { vertical: 'auto', horizontal: 'auto' },
                fontFamily: 'Fira Code, JetBrains Mono, Monaco, Menlo, Consolas, monospace',
                automaticLayout: true,
                padding: { top: 8, bottom: 8 }
              }}
            />
          </div>

          <button
            onClick={onOptimize}
            disabled={isLoading || !code.trim()}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white font-semibold text-[11px] flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/10 hover:shadow-primary/15 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer border border-primary/20"
          >
            {isLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Running Optimization Pipeline...
              </>
            ) : (
              <>
                <Cpu size={12} />
                Run Optimization Pipeline
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        {result ? (
          <div className="space-y-4.5 animate-fade-in">
            {/* Complexity Cards */}
            <div className="grid grid-cols-2 gap-3 select-none animate-fade-in">
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex flex-col hover:border-primary/20 transition-colors">
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground/75 font-bold flex items-center gap-1">
                  <BarChart2 size={9} className="text-indigo-400" />
                  Time Complexity
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] font-semibold text-rose-400 font-mono">
                    {result.timeComplexityOriginal}
                  </span>
                  <ChevronRight size={10} className="text-muted-foreground/50" />
                  <span className="text-[11px] font-semibold text-emerald-400 font-mono">
                    {result.timeComplexityOptimized}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex flex-col hover:border-primary/20 transition-colors">
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground/75 font-bold flex items-center gap-1">
                  <BarChart2 size={9} className="text-indigo-400" />
                  Space Complexity
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] font-semibold text-rose-400 font-mono">
                    {result.spaceComplexityOriginal}
                  </span>
                  <ChevronRight size={10} className="text-muted-foreground/50" />
                  <span className="text-[11px] font-semibold text-emerald-400 font-mono">
                    {result.spaceComplexityOptimized}
                  </span>
                </div>
              </div>
            </div>

            {/* Code Comparison - Diff Editor */}
            <div className="space-y-2 animate-fade-in">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-bold select-none">
                Source Comparisons
              </label>

              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900">
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800/80 border-b border-zinc-800 text-[9px] text-muted-foreground select-none">
                  <span className="font-semibold text-indigo-400/90 text-[8px] tracking-wider uppercase">
                    Diff Viewer ({isExpanded ? 'Side-by-Side' : 'Inline'})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyOriginal}
                      className="p-1 px-1.5 rounded hover:bg-secondary hover:text-white transition-colors flex items-center gap-1 text-[8px] cursor-pointer"
                      title="Copy Input"
                    >
                      {copiedOriginal ? <Check size={8} className="text-emerald-500" /> : <Copy size={8} />}
                      <span>Copy Input</span>
                    </button>
                    <button
                      onClick={handleCopyOptimized}
                      className="p-1 px-1.5 rounded hover:bg-secondary hover:text-white transition-colors flex items-center gap-1 text-[8px] cursor-pointer"
                      title="Copy Optimized"
                    >
                      {copiedOptimized ? <Check size={8} className="text-emerald-500" /> : <Copy size={8} />}
                      <span>Copy Output</span>
                    </button>
                  </div>
                </div>
                <DiffEditor
                  height="260px"
                  original={code}
                  modified={result.optimizedCode}
                  language={language}
                  theme="vs-dark"
                  onMount={handleEditorDidMount}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 10,
                    lineNumbers: 'on',
                    renderSideBySide: isExpanded,
                    automaticLayout: true,
                    scrollbar: { vertical: 'auto', horizontal: 'auto' }
                  }}
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-1.5 animate-fade-in">
              <h4 className="text-[10px] font-bold text-indigo-400 select-none uppercase tracking-wider">Refactoring Analysis</h4>
              <div className="space-y-0.5">
                {parseExplanation(result.explanation)}
              </div>
            </div>

            {/* Edge Cases */}
            {result.edgeCases && result.edgeCases.length > 0 && (
              <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-1.5 animate-fade-in">
                <h4 className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5 select-none uppercase tracking-wider">
                  <AlertTriangle size={11} />
                  Algorithmic Edge Cases
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[10px] text-amber-200/80 font-sans pl-0.5">
                  {result.edgeCases.map((edgeCase, index) => (
                    <li key={index} className="leading-relaxed list-none flex items-start gap-1.5">
                      <span className="text-amber-400 mt-1 text-[8px] select-none">•</span>
                      <span className="flex-1">{formatInlineText(edgeCase)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Telemetry Metrics */}
            {result.analytics && (
              <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-[9px] text-muted-foreground/50 font-mono select-none animate-fade-in">
                <span className="flex items-center gap-1">
                  <Sparkles size={9} className="text-primary" />
                  {result.analytics.model}
                </span>
                <span>Latency: {result.analytics.latency}ms</span>
                <span className="text-emerald-500 font-semibold">
                  Cost: ${result.analytics.cost.toFixed(5)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[200px] border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground/45 select-none">
            <Cpu size={20} className="text-muted-foreground/30 mb-1.5" />
            <h4 className="text-[11px] font-semibold text-slate-300">Idle Gateway Analyzer</h4>
            <p className="text-[10px] mt-1 max-w-[200px] leading-relaxed text-muted-foreground/60">
              Input script above and select target runtime interpreter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

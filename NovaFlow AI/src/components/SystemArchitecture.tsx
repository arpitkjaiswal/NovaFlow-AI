'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Share2,
  GitFork,
  Layout,
  Cpu,
  Brain,
  Code,
  Database,
  Sparkles,
  Server,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import mermaid from 'mermaid';

// Initialize mermaid library
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      background: '#09090b',
      primaryColor: '#818cf8',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#4f46e5',
      lineColor: '#818cf8',
      secondaryColor: '#27272a',
      tertiaryColor: '#18181b',
      mainBkg: '#18181b',
      nodeBorder: '#4f46e5',
      nodeTextColor: '#f8fafc',
      clusterBkg: '#09090b',
      clusterBorder: '#4f46e5'
    },
    flowchart: {
      useMaxWidth: false,
      htmlLabels: false
    },
    securityLevel: 'loose'
  });
}

interface SystemArchitectureProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | 'complete'
  | 'frontend'
  | 'backend'
  | 'gemini'
  | 'optimizer'
  | 'database'
  | 'langfuse'
  | 'deployment';

const diagrams: Record<TabType, string> = {
  complete: `
flowchart TD
  subgraph FE [Frontend Next.js Client]
    Sidebar[Sidebar.tsx] -->|Change Session| ChatArea[ChatArea.tsx]
    ChatArea -->|Run Optimization| Optimizer[CodeOptimizer.tsx]
    ChatArea -->|POST Request| API_Chat[api/chat]
    Optimizer -->|POST Request| API_Optimize[api/optimize]
  end

  subgraph BE [Backend Next.js Routes]
    API_Chat -->|Verify & Enrich| PPA[Prompt Processing Architecture]
    API_Optimize -->|Augment Code Rules| PPA
    PPA -->|Route Request| Wrapper[Gemini API Wrapper]
    
    API_Chat -->|Log Events| LF[Langfuse SDK Logger]
    API_Optimize -->|Log Events| LF
    
    API_Chat -->|Fetch/Save History| DB[Prisma Client & PostgreSQL]
  end

  subgraph Ext [Provider Layer]
    Wrapper -->|API Connection| Gemini[Gemini 1.5/2.0 API]
    LF -->|Observability Upload| LangfuseCloud[Langfuse Dashboard]
  end
  `,
  frontend: `
flowchart LR
  subgraph Frame [Application Layout]
    Layout[layout.tsx] --> Providers[SessionWrapper NextAuth]
  end

  subgraph Console [Console Interfaces]
    Sidebar[Sidebar.tsx] -->|Triggers Session Context| ChatArea[ChatArea.tsx]
    ChatArea -->|Renders Responses| Markdown[Markdown Parser]
    ChatArea -->|Code Workspace| Monaco[Monaco Editor Container]
  end

  subgraph OptPanel [Performance Optimizer Panel]
    CodeOptimizer[CodeOptimizer.tsx] -->|Diff Comparison| DiffViewer[Monaco DiffEditor]
    CodeOptimizer -->|Complexity Evaluation| Metrics[Complexity Cards]
  end
  `,
  backend: `
flowchart TD
  subgraph Gateway [API Entry Points]
    Chat[api/chat/route.ts]
    Optimize[api/optimize/route.ts]
    History[api/history/route.ts]
    Usage[api/usage/route.ts]
  end

  subgraph Processing [Orchestration Subsystem]
    PPA[Prompt Processing Architecture PPA]
    Wrapper[GeminiWrapper Instance]
    LFTracer[Langfuse Node Logger]
    PrismaClient[PrismaClient Database connection]
  end

  Chat -->|Orchestrate Session| PPA
  Optimize -->|Enrich System Instructions| PPA
  PPA -->|Transmit Payload| Wrapper
  Chat -->|Record Session State| PrismaClient
  Chat -->|Telemetry Streams| LFTracer
  Optimize -->|Telemetry Streams| LFTracer
  History -->|Query Logs| PrismaClient
  Usage -->|Compute Cost Metrics| PrismaClient
  `,
  gemini: `
flowchart TD
  subgraph Interface [GeminiWrapper Abstraction]
    ChatMethod[chat]
    OptimizeMethod[optimizeCode]
    SummarizeMethod[summarize]
    ExplainMethod[explain]
  end

  subgraph Pipeline [Internal Execution Pipeline]
    Validate[Param Validation zod]
    SystemRules[Inject System Prompts]
    ModelSelect[Configure Parameters Temperature/TopK]
    SDKCall[Invoke google/genai SDK Client]
  end

  subgraph Output [Response Flow]
    SDKCall -->|Read Chunk Streams| ChunkParser[Format Chunks]
    ChunkParser -->|Final Stream Output| ClientStream[Client Stream Router]
  end

  ChatMethod & OptimizeMethod & SummarizeMethod & ExplainMethod --> Validate
  Validate --> SystemRules --> ModelSelect --> SDKCall
  `,
  optimizer: `
flowchart LR
  subgraph Inputs [Input Channels]
    CodeEditor[Code Input Monaco]
    RuntimeSelector[Runtime Select JS/Py/Go/Rust]
  end

  subgraph OptimizationPipeline [Backend Processing]
    InputCheck[Detect Language Heuristics]
    PPAInjection[Inject Competitive Programming Directives]
    GatewayCall[POST api/optimize]
  end

  subgraph OutputViews [Output Workspace]
    Compare[Side-by-Side Diff Editor]
    Complexity[Time & Space Complexity Cards]
    Refactoring[Refactoring Analysis Grouped Markdown]
    Cases[Algorithmic Edge Cases Warnings]
  end

  CodeEditor & RuntimeSelector --> InputCheck
  InputCheck --> PPAInjection --> GatewayCall
  GatewayCall --> Compare & Complexity & Refactoring & Cases
  `,
  database: `
flowchart TD
  subgraph Schema [Prisma Database Models]
    User[User Model Auth Details]
    Session[Session Model Chat Channels]
    Message[Message Model Chat Logs]
    TokenAudit[TokenAudit Model Usage Logs]
  end

  subgraph Relations [Database Associations]
    User -->|1 : N| Session
    Session -->|1 : N| Message
    Message -->|1 : 1| TokenAudit
  end

  subgraph Adapter [Client Driver Context]
    PrismaSchema[schema.prisma File] -->|Generate Client| PrismaClient[PrismaClient PostgreSQL]
  end

  PrismaClient --> User
  PrismaClient --> Session
  PrismaClient --> Message
  PrismaClient --> TokenAudit
  `,
  langfuse: `
flowchart TD
  subgraph Integration [Telemetry Setup]
    ClientSDK[Langfuse SDK client]
    Config[Environment Keys]
  end

  subgraph Spans [Traced Elements]
    ChatTrace[Chat Pipeline Trace]
    OptimizeTrace[Optimize Pipeline Trace]
  end

  subgraph Metadata [Attached Observability Context]
    TraceId[Trace ID & Session association]
    PromptTemplate[Prompt Template Tracking]
    TokenCost[Tokens & Calculated Billing Cost]
    Latency[Round-trip Latency Logs]
  end

  subgraph LangfuseCloud [Observability Dashboard]
    Upload[Secure Observability Stream]
    UIPanel[Langfuse Telemetry Cloud Panel]
  end

  ClientSDK & Config --> ChatTrace & OptimizeTrace
  ChatTrace & OptimizeTrace --> TraceId & PromptTemplate & TokenCost & Latency
  TraceId & PromptTemplate & TokenCost & Latency --> Upload --> UIPanel
  `,
  deployment: `
flowchart TD
  subgraph DevContainer [Local Development Environment]
    DockerCompose[docker-compose.yml]
    ComposeApp[DevFlow Local Web Container]
    ComposeDB[Local PostgreSQL Database Container]
  end

  subgraph CloudDeploy [Production Deployment Environment]
    Vercel[Vercel Cloud Platform]
    EdgeRoutes[Vercel Serverless Functions]
    SupabaseDB[Managed PostgreSQL Database Supabase/Neon]
  end

  DockerCompose -->|Orchestrate| ComposeApp & ComposeDB
  Vercel -->|Host Hosting| EdgeRoutes
  EdgeRoutes -->|Query Actions| SupabaseDB
  `
};

export default function SystemArchitecture({ isOpen, onClose }: SystemArchitectureProps) {
  const [activeTab, setActiveTab] = useState<TabType>('complete');
  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Render diagram using Mermaid client-side compiler
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const containerId = `mermaid-render-temp-${activeTab}`;
    const rawDiagram = diagrams[activeTab];

    const renderDiagram = async () => {
      try {
        // Reset scale and position
        setScale(1);
        setPosition({ x: 0, y: 0 });

        // Clean out temporary rendering element if it exists
        const oldTemp = document.getElementById(containerId);
        if (oldTemp) oldTemp.remove();

        // Create temporary rendering target
        const tempDiv = document.createElement('div');
        tempDiv.id = containerId;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.visibility = 'hidden';
        document.body.appendChild(tempDiv);

        // Run client-side compilation
        const { svg } = await mermaid.render(`mermaid-${activeTab}`, rawDiagram, tempDiv);
        
        if (isMounted) {
          setRenderedSvg(svg);
        }

        // Cleanup
        tempDiv.remove();
      } catch (err) {
        console.error('Error rendering architecture diagram:', err);
        // Fallback placeholder rendering on failure
        if (isMounted) {
          setRenderedSvg(`
            <svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
              <rect width="100%" height="100%" fill="#080b11" rx="8"/>
              <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#f84f4f" font-family="sans-serif" font-size="12" font-weight="bold">Render Compilation Failed</text>
              <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="9">Please switch tabs to re-trigger compilation</text>
            </svg>
          `);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [activeTab, isOpen]);

  // Handle zooming using buttons or mouse wheel
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.15, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.15, 0.4));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.05;
    const delta = e.deltaY < 0 ? 1 : -1;
    setScale(prev => {
      const next = prev + delta * zoomFactor;
      return Math.min(Math.max(next, 0.4), 3);
    });
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // File download exporters
  const downloadSvgFile = () => {
    if (!renderedSvg) return;
    const blob = new Blob([renderedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `devflow_architecture_${activeTab}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPngFile = () => {
    if (!renderedSvg) return;

    const img = new Image();
    // Convert SVG markup to data URL safe representation
    const svgBlob = new Blob([renderedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const boundingWidth = 1400; // Preset high fidelity canvas dimensions
      const boundingHeight = 1000;
      canvas.width = boundingWidth;
      canvas.height = boundingHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Render rich dark background
        ctx.fillStyle = '#080b11';
        ctx.fillRect(0, 0, boundingWidth, boundingHeight);

        // Compute centering aspect ratio
        const scaleVal = Math.min(boundingWidth / img.width, boundingHeight / img.height) * 0.9;
        const xOffset = (boundingWidth - img.width * scaleVal) / 2;
        const yOffset = (boundingHeight - img.height * scaleVal) / 2;

        ctx.drawImage(img, xOffset, yOffset, img.width * scaleVal, img.height * scaleVal);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `devflow_architecture_${activeTab}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'complete', label: 'Complete Architecture', icon: <GitFork size={12} /> },
    { id: 'frontend', label: 'Frontend', icon: <Layout size={12} /> },
    { id: 'backend', label: 'Backend', icon: <Server size={12} /> },
    { id: 'gemini', label: 'Gemini Wrapper', icon: <Brain size={12} /> },
    { id: 'optimizer', label: 'Code Optimizer', icon: <Code size={12} /> },
    { id: 'database', label: 'Database', icon: <Database size={12} /> },
    { id: 'langfuse', label: 'LangFuse', icon: <Sparkles size={12} /> },
    { id: 'deployment', label: 'Deployment', icon: <Cpu size={12} /> }
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Backdrop Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md transition-opacity" />

        {/* Fullscreen Dialog Content */}
        <Dialog.Content
          className={`fixed inset-4 z-50 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden focus:outline-none select-none transition-all ${
            isFullscreen ? 'inset-0 rounded-none border-none' : ''
          }`}
        >
          <div className="absolute inset-0 dify-grid-bg pointer-events-none opacity-20" />

          {/* Modal Header */}
          <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/80 backdrop-blur-md z-10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center border border-indigo-500/15">
                <GitFork size={12} className="text-indigo-400" />
              </div>
              <div>
                <Dialog.Title className="text-xs font-semibold text-slate-200 tracking-wide">
                  System Architecture Explorer
                </Dialog.Title>
                <Dialog.Description className="text-[9px] text-muted-foreground/60 font-mono">
                  DevFlow AI HLD Specification Engine
                </Dialog.Description>
              </div>
            </div>

            {/* Quick Actions & Dismiss */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(prev => !prev)}
                className="p-1.5 rounded hover:bg-white/[0.04] text-muted-foreground hover:text-white transition-colors cursor-pointer border border-transparent hover:border-white/[0.02]"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <Dialog.Close asChild>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded hover:bg-white/[0.04] text-muted-foreground hover:text-white transition-colors cursor-pointer border border-transparent hover:border-white/[0.02]"
                >
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <div className="px-6 py-2 border-b border-zinc-800 bg-zinc-900/40 z-10 overflow-x-auto flex items-center gap-1.5 flex-shrink-0 custom-scrollbar select-none">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer border border-transparent ${
                  activeTab === tab.id
                    ? 'bg-primary/10 border-primary/20 text-indigo-400 font-semibold'
                    : 'text-muted-foreground hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Canvas Workspace & Diagrams */}
          <div className="flex-1 min-h-0 flex relative z-10 bg-zinc-950/90">
            {/* Control Panel overlays */}
            <div className="absolute left-4 top-4 z-20 flex flex-col gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg">
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <button
                onClick={handleReset}
                className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer border-t border-zinc-800"
                title="Reset Viewport"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg">
              <button
                onClick={downloadSvgFile}
                className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-1.5 text-[9px] font-medium cursor-pointer"
                title="Download SVG Diagram"
              >
                <Download size={11} />
                <span>Export SVG</span>
              </button>
              <button
                onClick={downloadPngFile}
                className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-1.5 text-[9px] font-medium cursor-pointer border-l border-zinc-800"
                title="Download PNG File"
              >
                <Share2 size={11} />
                <span>Export PNG</span>
              </button>
            </div>

            {/* Interactive Viewport Canvas */}
            <div
              ref={viewerRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`flex-1 h-full overflow-hidden flex items-center justify-center relative cursor-grab select-none ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
            >
              {renderedSvg ? (
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  }}
                  className="w-[85%] h-[85%] flex items-center justify-center pointer-events-none select-none"
                  dangerouslySetInnerHTML={{ __html: renderedSvg }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2.5 text-muted-foreground/50">
                  <Cpu size={24} className="animate-spin text-primary" />
                  <span className="text-[10px] font-mono tracking-wider">Parsing System HLD Model...</span>
                </div>
              )}
            </div>

            {/* Info Footer Overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex justify-between select-none">
              <div className="px-3 py-1.5 bg-zinc-900/95 border border-zinc-800 rounded-lg flex items-center gap-1.5 text-[9px] text-muted-foreground/75 font-mono shadow-md backdrop-blur-sm">
                <Info size={10} className="text-primary" />
                <span>Scroll wheel to zoom • Click & drag to pan canvas</span>
              </div>
              <div className="px-3 py-1.5 bg-zinc-900/95 border border-zinc-800 rounded-lg flex items-center gap-1.5 text-[9px] text-muted-foreground/70 font-mono shadow-md backdrop-blur-sm">
                <span>View Ratio: {Math.round(scale * 100)}%</span>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

# NovaFlow AI

> **The AI-Powered Developer Workspace**
>
> **Build Faster. Optimize Smarter. Observe Everything.**

NovaFlow AI is a production-ready AI-powered developer platform that unifies intelligent code generation, performance optimization, and real-time LLM observability into a single modern workspace.

Built with **Next.js**, **Google Gemini**, **LangFuse**, **Supabase**, **Prisma**, and **PostgreSQL**, NovaFlow AI provides developers with an enterprise-grade environment for building, analyzing, optimizing, and monitoring AI-assisted software development workflows.

Designed with scalability, performance, and developer experience in mind, NovaFlow AI combines multi-model AI routing, an interactive Monaco-powered coding workspace, runtime complexity analysis, automated code refactoring, secure authentication, persistent chat history, and end-to-end telemetry for every AI interaction.

---

# ✨ Features

## 🤖 Multi-Model AI Gateway

Switch seamlessly between multiple Large Language Models while maintaining a unified developer experience.

### Supported Features

- Real-time streaming responses
- Instant model switching
- Optimized API routing
- Extensible architecture for additional LLM providers

Example Models

- Gemini 2.5 Flash
- Gemini 2.5 Pro

---

## 💻 AI Code Optimizer

An integrated development workspace designed to improve code quality and developer productivity.

### Capabilities

- Monaco Editor integration
- Syntax highlighting
- Intelligent code suggestions
- Runtime Time Complexity Analysis
- Runtime Space Complexity Analysis
- AI-powered code refactoring
- Multi-language code conversion
- Side-by-side comparison workspace

---

## 📊 LLM Observability

Powered by LangFuse for complete visibility into every AI request.

### Monitor

- Prompt tokens
- Completion tokens
- Total token usage
- Response latency
- Execution traces
- Model costs
- Performance metrics
- Trace history

---

## 🔐 Secure Authentication

Authentication powered by Supabase with secure server-side session management.

### Features

- Cookie-based authentication
- SSR session verification
- Guest Mode
- Secure login
- Protected routes

---

## 💾 Persistent Storage

Reliable backend powered by Prisma ORM and PostgreSQL.

### Includes

- Chat history
- Session persistence
- User management
- Conversation storage
- AI trace mapping

---

## 🐳 Production Ready

Designed for seamless deployment across local and cloud environments.

### Deployment Features

- Docker support
- Docker Compose
- Multi-stage builds
- Production-ready configuration
- PostgreSQL container

---

# 🛠 Tech Stack

| Category | Technologies |
|----------|--------------|
| Frontend | Next.js 16 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Editor | Monaco Editor |
| AI | Google Gemini API |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Supabase Auth |
| Observability | LangFuse |
| Deployment | Docker, Docker Compose |

---

# 🚀 Getting Started

## Prerequisites

Install the following before running the project.

- Node.js (v18 or newer)
- npm or pnpm
- Docker
- Docker Compose
- PostgreSQL (optional if using Docker)
- Supabase Project
- Gemini API Key

---

# ⚙️ Environment Variables

Create a `.env` file in the project root.

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/novaflow?sslmode=disable"

# Gemini
GEMINI_API_KEY="your-gemini-api-key"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# LangFuse
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_BASE_URL="https://us.cloud.langfuse.com"
```

---

# 📦 Installation

Install dependencies.

```bash
npm install
```

Generate Prisma Client.

```bash
npx prisma generate
```

Run database migrations.

```bash
npx prisma migrate dev
```

Start the development server.

```bash
npm run dev
```

Visit

```
http://localhost:3000
```

---

# 🐳 Docker Deployment

Build and start all services.

```bash
docker compose up -d --build
```

Check running containers.

```bash
docker ps
```

Apply the database schema.

```bash
docker compose exec app npx prisma db push
```

Application

```
http://localhost:3000
```

Database

```
localhost:5435
```

---

# 📊 Observability

NovaFlow AI integrates LangFuse to monitor every AI interaction.

Each request automatically records:

- Prompt tokens
- Completion tokens
- Total tokens
- Response latency
- Cost estimation
- Model used
- Execution traces
- Request history

This enables developers to analyze AI performance, optimize costs, and debug workflows efficiently.

---

# 📂 Project Structure

```text
.
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── login/
│   │   ├── history/
│   │   └── optimize/
│   │
│   ├── components/
│   │   ├── ChatArea
│   │   ├── Sidebar
│   │   ├── CodeOptimizer
│   │   └── TraceDrawer
│   │
│   ├── lib/
│   │   ├── gemini.ts
│   │   ├── prisma.ts
│   │   ├── supabase.ts
│   │   └── langfuse.ts
│   │
│   └── middleware.ts
│
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

# 🏗 Architecture

```
                ┌──────────────────────────┐
                │        Frontend          │
                │      Next.js + React     │
                └────────────┬─────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
      Monaco Editor     Chat Gateway   Authentication
              │              │              │
              └──────────────┼──────────────┘
                             │
                   API Route Handlers
                             │
      ┌──────────────┬──────────────┬──────────────┐
      │              │              │
 Google Gemini   PostgreSQL     LangFuse
      │            Prisma      Observability
      └──────────────┴──────────────┘
```

---

# 🎯 Core Capabilities

- AI-powered code generation
- Multi-model LLM routing
- AI code optimization
- Runtime complexity analysis
- Automated refactoring
- Multi-language conversion
- Live streaming responses
- Secure authentication
- Persistent conversations
- Prompt tracing
- Token analytics
- Cost estimation
- Docker deployment
- Enterprise-ready architecture

---

# 🔮 Roadmap

- Support for OpenAI models
- Claude integration
- Grok integration
- DeepSeek integration
- File uploads
- Image understanding
- Voice conversations
- GitHub repository analysis
- Collaborative workspaces
- Plugin system
- Team dashboards
- AI Agents
- RAG integration
- Vector database support

---

# 📜 License

Licensed under the **MIT License**.

You are free to use, modify, distribute, and contribute to the project.

---

# ⭐ GitHub Repository Description

> AI-powered developer workspace featuring multi-model LLM support, Monaco Editor, code optimization, LangFuse observability, Supabase Authentication, Prisma ORM, PostgreSQL, and Docker deployment.

---

# 💙 Built With

- Next.js
- TypeScript
- Tailwind CSS
- Google Gemini
- Prisma
- PostgreSQL
- Supabase
- LangFuse
- Docker

---

## ⭐ If you found this project useful, consider giving it a star!

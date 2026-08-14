# DevFlow AI 
> **Centralized Code Generation, Performance Optimization, and Observability Gateway**

DevFlow AI is a production-grade developer workspace designed for low-latency code generation, deep runtime performance optimization, and real-time LLM observability. It integrates multi-model switching, interactive monaco editor workspace, and telemetry tracing to deliver a modern, premium assistant experience.

---

##  Key Features

* **Multi-Model LLM Gateway**: Seamlessly query and switch between cutting-edge models (e.g., `Gemini 2.5 Flash`, `Gemini 2.5 Pro`) with instantaneous stream rendering.
* **Performance Optimizer**: An integrated side-by-side workspace featuring:
  * **Monaco Editor** integration with syntax highlighting and code suggestions.
  * Runtime complexity analysis (Time and Space complexity bounds).
  * Automated refactoring and language switching support.
* **LangFuse Observability Integration**: Live tracing of prompt token metrics, completion token metrics, end-to-end latency, and query cost calculation.
* **Supabase Authentication**: Native cookie-based session state verification with support for credentials logging and temporary Guest sessions.
* **Prisma & PostgreSQL Schema**: Robust session management and chat trace persistence mapped to authenticated users.
* **Fully Containerized**: Ready-to-go Docker and Docker-Compose setup for simplified database linking and multi-stage frontend builds.

---

##  Tech Stack

* **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide React, Monaco Editor (`@monaco-editor/react`).
* **Database & ORM**: Prisma ORM, PostgreSQL.
* **Auth**: Supabase Auth (SSR integration).
* **Observability**: LangFuse SDK.
* **AI Engine**: Google Gemini API (`@google/genai`).
* **Deployment**: Docker & Docker Compose.

---

##  Getting Started

###  Prerequisites

Ensure you have the following installed on your machine:
* **Node.js** (v18.x or newer)
* **npm** or **pnpm**
* **Docker** & **Docker Compose**
* A **Supabase** project instance
* A **Gemini API Key** from Google AI Studio

---

###  Environment Variables

Create a `.env` file in the root directory and configure the following parameters:

```env
# Database Settings (Local Postgres or Supabase Connection Pooler)
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/devflow?sslmode=disable"

# Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Auth Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# LangFuse Observability Tracing (Optional)
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_BASE_URL="https://us.cloud.langfuse.com"
```

---

###  Installation & Database Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Prisma Client & Apply Migrations**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application in the browser.

---

##  Docker Deployment

The application is configured to run out-of-the-box inside a multi-container environment.

1. **Spin Up Containers** (Starts the application and a local PostgreSQL database):
   ```bash
   docker-compose up -d --build
   ```

2. **Check Container Status**:
   ```bash
   docker ps
   ```

3. **Database Migrations inside Docker**:
   When launching for the first time, apply the database schema:
   ```bash
   docker-compose exec app npx prisma db push
   ```

The frontend will be exposed at [http://localhost:3000](http://localhost:3000) and the PostgreSQL instance at port `5435`.

---

##  Observability with LangFuse

DevFlow AI uses LangFuse to log all interactions and calculate exact model usage costs. When configured:
* Every user query generates a trace.
* Input/output tokens are calculated and mapped against live models.
* Latency and execution times are captured and visible directly within the trace history side-drawer.

---

## 📁 Project Structure

```text
├── prisma/               # Database schemas and migration profiles
├── src/
│   ├── app/              # Next.js Route handlers, layouts, and pages
│   │   ├── api/          # Chat, Optimize, History, and Telemetry API endpoints
│   │   └── login/        # Supabase Authentication portal
│   ├── components/       # Reusable React components (ChatArea, CodeOptimizer, Sidebar)
│   ├── lib/              # Client instances (Database connection, Supabase server/browser wrappers, Gemini SDK)
│   └── middleware.ts     # Global session verification and routing proxy
├── Dockerfile            # Multi-stage Docker deployment config
├── docker-compose.yml    # Database and frontend container orchestrator
└── README.md
```

---

##  License

This project is licensed under the MIT License. Feel free to use and distribute it.

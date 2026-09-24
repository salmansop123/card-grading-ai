# Card Market Intelligence Platform

AI-powered SaaS for Pokémon card collectors to scan cards, track market prices, and get investment insights.

## Stack

- **Frontend:** Next.js 14, Tailwind, ShadCN/UI, TanStack Query, Recharts
- **Backend:** FastAPI, SQLAlchemy, Celery, Redis
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth
- **AI:** OpenRouter (Claude Vision)

## Local Development

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### 1. Start infrastructure

```bash
docker-compose up -d
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 3. Celery worker (separate terminal)

```bash
cd backend
source venv/bin/activate
celery -A app.celery_app worker --loglevel=info
```

### 4. Celery beat (optional, separate terminal)

```bash
cd backend
source venv/bin/activate
celery -A app.celery_app beat --loglevel=info
```

### 5. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment Variables

See `backend/.env.example` and `frontend/.env.local.example`.

## API Documentation

When the backend is running: http://localhost:8000/docs

## Deployment

- Frontend → Vercel
- Backend + Celery → Render (see `render.yaml`)
- Database → Supabase
- Cache → Upstash Redis

## MVP Scope

- Pokémon cards only
- Supabase Auth
- PriceCharting + eBay pricing
- AI card scan and market insights

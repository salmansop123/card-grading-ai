# Card Market Intelligence Platform
## Complete Design & Architecture Document
### For use with Cursor AI — Full Implementation Blueprint

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core User Flows](#2-core-user-flows)
3. [System Architecture](#3-system-architecture)
4. [Full File & Folder Structure](#4-full-file--folder-structure)
5. [Database Schema](#5-database-schema)
6. [AI Agent Design](#6-ai-agent-design)
7. [Backend API Reference](#7-backend-api-reference)
8. [Frontend Pages & Components](#8-frontend-pages--components)
9. [Market Data Engine](#9-market-data-engine)
10. [Pricing Algorithm](#10-pricing-algorithm)
11. [Background Jobs & Caching](#11-background-jobs--caching)
12. [Authentication & Security](#12-authentication--security)
13. [Environment Variables](#13-environment-variables)
14. [External API Integration Details](#14-external-api-integration-details)
15. [Deployment Guide](#15-deployment-guide)
16. [Cursor Prompting Strategy](#16-cursor-prompting-strategy)

---

## 1. Product Overview

### What This Application Does

Card Market Intelligence Platform is a full-stack AI-powered SaaS application that allows collectors to:

- Upload trading card images (Pokémon, sports cards, MTG, Yu-Gi-Oh, etc.)
- Have an AI vision agent automatically identify the card and extract structured metadata
- Track real-time and historical market prices pulled from PriceCharting and eBay sold listings
- View a rich portfolio dashboard with performance charts, gain/loss tracking, and market trends
- Receive AI-generated investment insights (grade recommendation, buy/sell signals, ROI analysis)
- Manage their collection digitally without any manual tagging

### Who It's For

Individual card collectors and investors who want data-driven insights about their collection's value and market performance.

### Key Differentiators

- Zero manual tagging — AI does all card identification from image upload
- Weighted pricing model combines stable baselines (PriceCharting) with live market transactions (eBay)
- PSA grading ROI analysis tells users which cards are worth professional grading
- Historical price graphs and trend indicators per card
- Portfolio-level analytics: total value, best performers, highest volatility cards

---

## 2. Core User Flows

### Flow 1 — Upload & Identify Card

```
User uploads card image
  → Frontend sends image to POST /api/cards/scan
  → Backend encodes image as base64
  → Sends to OpenRouter vision model with structured extraction prompt
  → AI returns JSON: { name, set, number, year, rarity, condition_hints, card_type, language }
  → Backend validates card identity via Pokémon TCG API (or equivalent)
  → Card record created in PostgreSQL with status: "identified"
  → Background task triggered: fetch_market_prices(card_id)
  → Frontend polls GET /api/cards/{id}/status until pricing_status = "complete"
  → Card appears in dashboard with full pricing data
```

### Flow 2 — Manual Search & Add

```
User types card name in search bar
  → GET /api/cards/search?q=charizard&set=base
  → Backend queries Pokémon TCG API
  → Returns list of matching cards with thumbnail images
  → User selects the correct card
  → POST /api/portfolio/add with card_id
  → Background pricing task triggered
  → Card added to portfolio
```

### Flow 3 — Dashboard Load

```
User opens dashboard
  → GET /api/portfolio (returns all user's cards with cached prices)
  → Redis cache checked first (TTL: 1 hour)
  → If cache miss: query PostgreSQL price_history for latest per card
  → Frontend renders portfolio summary: total value, day change, top movers
  → Recharts graphs rendered for portfolio value over time
  → Each card tile shows: image, name, current value, 24h change, trend indicator
```

### Flow 4 — Card Detail View

```
User clicks on a card
  → GET /api/cards/{id}/detail
  → Returns: card metadata + price history (30 days) + recent eBay sales + AI insights
  → Frontend renders:
    - Price history line chart (raw vs PSA 8 / PSA 9 / PSA 10)
    - Recent eBay sold listings table
    - AI insight panel (generated on first load, cached for 24h)
    - Grading ROI calculator
    - 7-day and 30-day price change badges
```

### Flow 5 — Refresh Prices

```
User clicks "Refresh Prices" button
  → POST /api/portfolio/refresh
  → Celery tasks dispatched for each card in user's portfolio
  → PriceCharting scraper fetches updated baseline prices
  → eBay API fetches last 10 sold listings per card
  → Weighted price computed and stored in price_history
  → Redis cache invalidated for user's portfolio
  → Frontend shows updated values after polling
```

---

## 3. System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│              Next.js App (Vercel) — Port 3000                │
│   Pages: Dashboard / Upload / Card Detail / Portfolio        │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS REST API calls
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                            │
│              (Render/Railway) — Port 8000                    │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Auth Layer  │  │  Card Router │  │ Portfolio Router  │   │
│  │  (JWT/Supa) │  │  /api/cards  │  │ /api/portfolio   │   │
│  └─────────────┘  └──────┬───────┘  └────────┬─────────┘   │
│                           │                    │             │
│  ┌────────────────────────▼────────────────────▼──────────┐ │
│  │                   SERVICE LAYER                         │ │
│  │  CardScanService │ MarketDataService │ PortfolioService │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
┌──────────────┐  ┌─────────────────┐  ┌────────────────┐
│  AI LAYER    │  │  MARKET DATA    │  │  CARD DATABASE │
│  OpenRouter  │  │  ENGINE         │  │  LAYER         │
│  Vision API  │  │                 │  │                │
│              │  │ PriceCharting   │  │ Pokémon TCG    │
│ - Identify   │  │ Scraper         │  │ API            │
│   card from  │  │                 │  │                │
│   image      │  │ eBay Sold       │  │ Sports Card    │
│ - Generate   │  │ Listings API    │  │ Databases      │
│   insights   │  │                 │  │                │
│ - Grade ROI  │  │ Price Weighting │  │                │
│   analysis   │  │ Algorithm       │  │                │
└──────┬───────┘  └────────┬────────┘  └───────┬────────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                 │
│                                                              │
│  ┌─────────────────────┐    ┌──────────────────────────┐    │
│  │   PostgreSQL         │    │   Redis Cache            │    │
│  │   (Supabase)         │    │   (Upstash)              │    │
│  │                      │    │                          │    │
│  │ - users              │    │ - card_price:{id}        │    │
│  │ - cards              │    │ - portfolio:{user_id}    │    │
│  │ - portfolio_holdings │    │ - scan_result:{hash}     │    │
│  │ - price_history      │    │ - ai_insights:{card_id}  │    │
│  │ - ai_scan_results    │    │                          │    │
│  │ - grading_analysis   │    │ TTL: 1h for prices       │    │
│  └─────────────────────┘    │ TTL: 24h for insights    │    │
│                              └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│              BACKGROUND JOB SYSTEM                           │
│              Celery + Redis Broker                           │
│                                                              │
│  Tasks:                                                      │
│  - fetch_card_prices (triggered after card add)              │
│  - refresh_all_portfolio_prices (cron: every 6h)            │
│  - compute_trending_cards (cron: every 24h)                  │
│  - generate_portfolio_ai_report (cron: weekly)               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Decisions (Rationale)

| Decision | Choice | Why |
|---|---|---|
| Frontend Framework | Next.js 14 App Router | SSR for SEO, file-based routing, API routes |
| UI Components | ShadCN/UI + Tailwind v3 | Pre-built accessible components, fast styling |
| Charts | Recharts | React-native, customizable, handles time-series well |
| Backend | FastAPI (Python) | Async support, great for AI/ML integration, fast |
| AI Vision | OpenRouter (Claude Vision or GPT-4o) | Unified API access, fallback models, cost control |
| Card DB | Pokémon TCG API | Official card metadata, free, reliable |
| Pricing Source 1 | PriceCharting | Stable baseline values, historical pricing |
| Pricing Source 2 | eBay Sold Listings | Real market transaction data, recency |
| Database | Supabase PostgreSQL | Free tier, built-in auth, storage, real-time |
| Cache | Upstash Redis | Serverless Redis, free tier, works with Vercel |
| Background Jobs | Celery + Redis | Reliable task queue, easy cron scheduling |
| Deployment | Vercel + Render | Free tiers, GitHub CI/CD, easy env management |

---

## 4. Full File & Folder Structure

### Frontend — `/frontend`

```
frontend/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/                  # Protected route group
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main portfolio dashboard
│   │   ├── upload/
│   │   │   └── page.tsx              # Card upload + scan UI
│   │   ├── search/
│   │   │   └── page.tsx              # Manual card search
│   │   ├── cards/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Card detail view
│   │   ├── portfolio/
│   │   │   └── page.tsx              # Portfolio analytics page
│   │   ├── insights/
│   │   │   └── page.tsx              # AI insights & recommendations
│   │   └── layout.tsx                # Sidebar + nav layout
│   ├── api/                          # Next.js API routes (thin proxy layer)
│   │   └── [...]/
│   ├── globals.css
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Landing/redirect page
│
├── components/
│   ├── ui/                           # ShadCN/UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── skeleton.tsx
│   │   └── toast.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   ├── Topbar.tsx                # Top header with user menu
│   │   └── MobileNav.tsx
│   ├── dashboard/
│   │   ├── PortfolioSummaryCard.tsx  # Total value, gain/loss summary
│   │   ├── PortfolioValueChart.tsx   # Recharts line chart — portfolio over time
│   │   ├── TopMoversWidget.tsx       # Biggest gainers/losers today
│   │   ├── CardGrid.tsx              # Grid of portfolio cards
│   │   └── MarketSummaryBanner.tsx   # Trending cards in the market
│   ├── cards/
│   │   ├── CardTile.tsx              # Card in grid view with price badge
│   │   ├── CardDetailPanel.tsx       # Full card detail with tabs
│   │   ├── PriceHistoryChart.tsx     # Recharts — price over 30 days
│   │   ├── GradingROITable.tsx       # Raw vs PSA 8/9/10 comparison
│   │   ├── RecentSalesTable.tsx      # eBay sold listings
│   │   ├── PriceTierBadges.tsx       # Raw / PSA grade price badges
│   │   ├── TrendIndicator.tsx        # Up/down/stable trend badge
│   │   └── AIInsightPanel.tsx        # AI-generated market insight text
│   ├── upload/
│   │   ├── ImageDropzone.tsx         # Drag-and-drop file upload area
│   │   ├── ScanProgressModal.tsx     # Modal shown during AI scan
│   │   └── ScanResultPreview.tsx     # Shows identified card + confirm/reject
│   ├── portfolio/
│   │   ├── PerformanceChart.tsx      # Portfolio performance over time
│   │   ├── AllocationPieChart.tsx    # Value by card type / set
│   │   ├── GradingOpportunities.tsx  # Cards worth grading list
│   │   └── GainLossTable.tsx         # All cards with gain/loss
│   └── shared/
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       ├── ConfirmDialog.tsx
│       └── SearchBar.tsx
│
├── hooks/
│   ├── usePortfolio.ts               # TanStack Query — portfolio data
│   ├── useCard.ts                    # TanStack Query — single card
│   ├── useCardScan.ts                # Upload + poll scan status
│   ├── useMarketData.ts              # Live price fetching
│   ├── usePortfolioStats.ts          # Derived stats (total value, etc.)
│   └── useAuth.ts                    # Auth state management
│
├── lib/
│   ├── api.ts                        # Axios instance + interceptors
│   ├── queryClient.ts                # TanStack Query client config
│   ├── supabase.ts                   # Supabase client
│   ├── utils.ts                      # cn(), formatCurrency(), etc.
│   ├── constants.ts                  # API URLs, card types, etc.
│   └── validators.ts                 # Zod schemas for forms
│
├── types/
│   ├── card.ts                       # Card, CardMetadata, PriceTier types
│   ├── portfolio.ts                  # Portfolio, Holding types
│   ├── market.ts                     # PriceHistory, MarketData, EbaySale types
│   ├── ai.ts                         # ScanResult, AIInsight, GradingAnalysis types
│   └── api.ts                        # API response wrapper types
│
├── public/
│   ├── placeholder-card.png
│   └── logo.svg
│
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Backend — `/backend`

```
backend/
├── app/
│   ├── main.py                       # FastAPI app factory, middleware, router mount
│   ├── config.py                     # Settings via pydantic-settings
│   ├── database.py                   # SQLAlchemy engine + session
│   ├── redis_client.py               # Redis connection
│   ├── celery_app.py                 # Celery instance + config
│   │
│   ├── api/                          # Route handlers
│   │   ├── __init__.py
│   │   ├── auth.py                   # POST /auth/register, /auth/login, /auth/refresh
│   │   ├── cards.py                  # POST /cards/scan, GET /cards/search, GET /cards/{id}
│   │   ├── portfolio.py              # GET/POST/DELETE /portfolio, POST /portfolio/refresh
│   │   ├── market.py                 # GET /market/prices/{card_id}, GET /market/trending
│   │   └── insights.py               # GET /insights/{card_id}, GET /insights/portfolio
│   │
│   ├── models/                       # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py                   # User model
│   │   ├── card.py                   # Card model (identity data)
│   │   ├── portfolio.py              # PortfolioHolding model
│   │   ├── price_history.py          # PriceHistory model
│   │   ├── scan_result.py            # AIScanResult model
│   │   └── grading_analysis.py       # GradingAnalysis model
│   │
│   ├── schemas/                      # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── card.py
│   │   ├── portfolio.py
│   │   ├── market.py
│   │   └── insights.py
│   │
│   ├── services/                     # Business logic layer
│   │   ├── __init__.py
│   │   ├── card_scan_service.py      # AI vision scan orchestration
│   │   ├── card_identity_service.py  # Pokémon TCG API + card DB lookup
│   │   ├── market_data_service.py    # PriceCharting + eBay orchestration
│   │   ├── price_charting_service.py # PriceCharting scraper/API
│   │   ├── ebay_service.py           # eBay Finding API + sold listings
│   │   ├── pricing_engine.py         # Weighted price calculation
│   │   ├── portfolio_service.py      # Portfolio CRUD + value calculations
│   │   ├── ai_insights_service.py    # OpenRouter AI insight generation
│   │   └── grading_service.py        # PSA grading ROI analysis
│   │
│   ├── tasks/                        # Celery background tasks
│   │   ├── __init__.py
│   │   ├── price_tasks.py            # fetch_card_prices, refresh_all_prices
│   │   ├── insight_tasks.py          # generate_card_insight, portfolio_report
│   │   └── maintenance_tasks.py      # cleanup old data, recompute trending
│   │
│   ├── agents/                       # AI agent logic
│   │   ├── __init__.py
│   │   ├── vision_agent.py           # Card image analysis agent
│   │   ├── market_agent.py           # Market intelligence agent
│   │   └── portfolio_agent.py        # Portfolio advisor agent
│   │
│   └── utils/
│       ├── __init__.py
│       ├── image_utils.py            # Base64 encoding, image validation
│       ├── cache_utils.py            # Redis get/set/invalidate helpers
│       ├── price_utils.py            # Price formatting, percentage calc
│       └── auth_utils.py             # JWT creation/verification
│
├── migrations/                       # Alembic migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py
│
├── tests/
│   ├── test_card_scan.py
│   ├── test_pricing_engine.py
│   ├── test_market_data.py
│   └── test_portfolio.py
│
├── .env
├── requirements.txt
├── alembic.ini
├── Dockerfile
└── docker-compose.yml
```

### Root Structure

```
card-market-intelligence/
├── frontend/                 # Next.js application
├── backend/                  # FastAPI application
├── docs/                     # Additional design docs
│   ├── api-reference.md
│   ├── data-models.md
│   └── agent-prompts.md
├── docker-compose.yml        # Local dev: postgres + redis + backend
├── .gitignore
└── README.md
```

---

## 5. Database Schema

### `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),                    -- null if using Supabase Auth
  full_name     VARCHAR(255),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `cards`
```sql
CREATE TABLE cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- AI-extracted identity
  card_name        VARCHAR(255) NOT NULL,
  set_name         VARCHAR(255),
  set_code         VARCHAR(50),
  card_number      VARCHAR(50),
  year             INTEGER,
  rarity           VARCHAR(100),
  card_type        VARCHAR(50),         -- pokemon | sports | mtg | yugioh | other
  language         VARCHAR(50) DEFAULT 'English',
  -- External ID references
  pokemon_tcg_id   VARCHAR(100),        -- ID from Pokémon TCG API
  pricecharting_id VARCHAR(100),        -- ID from PriceCharting
  -- Image
  image_url        TEXT,
  thumbnail_url    TEXT,
  -- Status
  scan_status      VARCHAR(50) DEFAULT 'pending',   -- pending | identified | failed
  pricing_status   VARCHAR(50) DEFAULT 'pending',   -- pending | complete | failed
  -- Metadata
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_card_name ON cards(card_name);
CREATE INDEX idx_cards_set_code ON cards(set_code);
CREATE INDEX idx_cards_card_type ON cards(card_type);
```

### `portfolio_holdings`
```sql
CREATE TABLE portfolio_holdings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity        INTEGER DEFAULT 1,
  condition       VARCHAR(50),          -- raw | psa8 | psa9 | psa10 | bgs9 | etc.
  purchase_price  DECIMAL(10,2),        -- what user paid (optional)
  purchase_date   DATE,
  notes           TEXT,
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id, condition)
);

CREATE INDEX idx_portfolio_user_id ON portfolio_holdings(user_id);
```

### `price_history`
```sql
CREATE TABLE price_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id               UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  recorded_at           TIMESTAMPTZ DEFAULT NOW(),
  -- Weighted calculated price
  estimated_value       DECIMAL(10,2),
  confidence_score      FLOAT,           -- 0.0 to 1.0
  -- Raw breakdown
  raw_price             DECIMAL(10,2),
  -- Graded prices
  psa8_price            DECIMAL(10,2),
  psa9_price            DECIMAL(10,2),
  psa10_price           DECIMAL(10,2),
  -- Source data
  pricecharting_raw     DECIMAL(10,2),
  pricecharting_psa9    DECIMAL(10,2),
  pricecharting_psa10   DECIMAL(10,2),
  ebay_avg_last_10      DECIMAL(10,2),   -- avg of last 10 eBay sold listings
  ebay_median_last_10   DECIMAL(10,2),
  ebay_sales_count      INTEGER,
  -- Trend
  price_7d_ago          DECIMAL(10,2),
  price_30d_ago         DECIMAL(10,2),
  pct_change_7d         FLOAT,
  pct_change_30d        FLOAT,
  volatility_score      FLOAT            -- std dev of last 10 sales / mean
);

CREATE INDEX idx_price_history_card_id ON price_history(card_id);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);
```

### `ai_scan_results`
```sql
CREATE TABLE ai_scan_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id           UUID REFERENCES cards(id) ON DELETE SET NULL,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url         TEXT,
  raw_ai_response   JSONB,              -- full response from OpenRouter
  extracted_data    JSONB,              -- structured fields extracted
  model_used        VARCHAR(100),
  confidence        FLOAT,
  processing_time_ms INTEGER,
  status            VARCHAR(50),        -- success | failed | low_confidence
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### `ai_insights`
```sql
CREATE TABLE ai_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Insight content
  market_trend    VARCHAR(50),          -- rising | stable | declining
  trend_reason    TEXT,
  investment_signal VARCHAR(50),        -- buy | hold | sell | grade
  signal_reasoning TEXT,
  grade_recommendation BOOLEAN,         -- true if AI recommends grading
  grade_roi_estimate FLOAT,             -- estimated ROI % from grading
  -- Generated
  model_used      VARCHAR(100),
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ           -- 24h from generated_at
);
```

### `ebay_sold_listings` (cache table)
```sql
CREATE TABLE ebay_sold_listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id       UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  ebay_item_id  VARCHAR(100),
  title         TEXT,
  sold_price    DECIMAL(10,2),
  condition     VARCHAR(100),
  sold_date     TIMESTAMPTZ,
  listing_url   TEXT,
  fetched_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ebay_card_id ON ebay_sold_listings(card_id);
CREATE INDEX idx_ebay_sold_date ON ebay_sold_listings(sold_date DESC);
```

---

## 6. AI Agent Design

### Overview

The AI layer consists of three agents, each using OpenRouter as the unified LLM gateway. All agents use `claude-3-5-sonnet` or `gpt-4o` as the primary vision/reasoning model.

---

### Agent 1 — Vision Agent (`vision_agent.py`)

**Purpose:** Analyze a trading card image and extract structured card identity data.

**Trigger:** When a user uploads a card image via POST /cards/scan

**Input:** Base64-encoded card image

**Model:** `anthropic/claude-3-5-sonnet` via OpenRouter (vision-capable)

**System Prompt:**
```
You are an expert trading card identifier with encyclopedic knowledge of 
Pokémon TCG, Magic: The Gathering, Yu-Gi-Oh!, sports cards (baseball, 
basketball, football), and other collectible card games.

When given an image of a trading card, extract ALL visible information 
from the card with high precision. Be conservative with confidence — 
if you are not certain of a field, mark it as null rather than guessing.

Always respond ONLY with valid JSON matching the schema below. 
Do not include any explanation, markdown, or preamble.
```

**User Prompt:**
```
Analyze this trading card image and extract the following information.

Return ONLY valid JSON with this exact structure:
{
  "card_name": "string — the card's character or player name",
  "set_name": "string — the full set/expansion name",
  "set_code": "string — the short set code if visible (e.g., 'BS' for Base Set)",
  "card_number": "string — e.g., '4/102' or '11/264'",
  "year": integer or null,
  "rarity": "string — Common / Uncommon / Rare / Holo Rare / Ultra Rare / Secret Rare / etc.",
  "card_type": "pokemon | sports | mtg | yugioh | other",
  "language": "string — English / Japanese / Korean / etc.",
  "sport_or_game": "string — e.g., Baseball, Basketball, Pokémon, Magic: The Gathering",
  "player_or_character": "string — athlete name or character name",
  "team_or_series": "string — team name or game series",
  "edition": "string — 1st Edition / Unlimited / Shadowless / etc. if visible",
  "condition_hints": [
    "list of strings describing visible condition issues",
    "e.g.: 'whitening on edges', 'surface scratch visible', 'centering off'"
  ],
  "estimated_condition": "Mint | Near Mint | Excellent | Good | Poor",
  "confidence": float between 0.0 and 1.0,
  "identification_notes": "string — any uncertainty or additional context"
}
```

**Processing Logic (`card_scan_service.py`):**

```python
class CardScanService:
    async def scan_card_image(self, image_data: bytes, user_id: str) -> ScanResult:
        # 1. Validate image (size, format)
        validated_image = await image_utils.validate_and_resize(image_data)
        
        # 2. Check image hash in Redis cache (avoid re-scanning same image)
        image_hash = hashlib.md5(image_data).hexdigest()
        cached = await cache_utils.get(f"scan_result:{image_hash}")
        if cached:
            return ScanResult(**cached)
        
        # 3. Encode as base64
        b64_image = base64.b64encode(validated_image).decode()
        
        # 4. Call OpenRouter vision API
        response = await openrouter_client.chat_completion(
            model="anthropic/claude-3-5-sonnet",
            messages=[
                {"role": "system", "content": VISION_SYSTEM_PROMPT},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}},
                    {"type": "text", "text": VISION_USER_PROMPT}
                ]}
            ]
        )
        
        # 5. Parse JSON response
        extracted_data = json.loads(response.content)
        
        # 6. Validate via Pokémon TCG API (if card_type == pokemon)
        if extracted_data["card_type"] == "pokemon":
            validated = await card_identity_service.validate_pokemon_card(extracted_data)
            extracted_data.update(validated)
        
        # 7. Store scan result in DB
        scan_result = await self.save_scan_result(extracted_data, user_id)
        
        # 8. Cache result (24h TTL)
        await cache_utils.set(f"scan_result:{image_hash}", scan_result.dict(), ttl=86400)
        
        return scan_result
```

**Confidence Threshold Logic:**
- confidence >= 0.85 → Auto-accept identification, proceed to pricing
- confidence 0.6–0.84 → Flag for user confirmation before adding to portfolio
- confidence < 0.6 → Return as "low_confidence", ask user to retry or enter manually

---

### Agent 2 — Market Intelligence Agent (`market_agent.py`)

**Purpose:** Analyze price data and generate human-readable market insights for each card.

**Trigger:** Called when user opens a card detail page (cached for 24h)

**Input:** Card metadata + last 30 days of price history + recent eBay sales data

**Model:** `anthropic/claude-3-haiku` or `openai/gpt-4o-mini` (cost-efficient, text-only)

**System Prompt:**
```
You are a trading card market analyst with deep expertise in collectible 
card valuations. You analyze price data to generate clear, actionable 
market insights for collectors and investors.

Keep your responses concise, factual, and jargon-free. Speak to collectors 
who care about value but may not be finance experts.

Always respond ONLY with valid JSON matching the requested schema.
```

**User Prompt Template:**
```
Analyze the following market data for this trading card and generate insights.

Card: {card_name} — {set_name} #{card_number}
Type: {card_type} | Rarity: {rarity}

Current Market Data:
- Raw Price: ${raw_price}
- PSA 8: ${psa8_price}
- PSA 9: ${psa9_price}  
- PSA 10: ${psa10_price}
- 7-Day Change: {pct_change_7d}%
- 30-Day Change: {pct_change_30d}%
- Volatility Score: {volatility_score}/10

Recent eBay Sales (last 10):
{ebay_sales_summary}

Return ONLY valid JSON:
{
  "market_trend": "rising | stable | declining",
  "trend_reason": "2-3 sentence explanation of why the price is moving this way",
  "investment_signal": "buy | hold | sell | grade",
  "signal_reasoning": "2-3 sentences explaining the recommendation",
  "grade_recommendation": true | false,
  "grade_roi_estimate": float (estimated % gain from grading raw to PSA 9, or null),
  "key_risks": ["list of 1-3 risk factors"],
  "key_catalysts": ["list of 1-3 positive drivers"],
  "summary": "1 sentence market summary for display on card tile"
}
```

---

### Agent 3 — Portfolio Advisor Agent (`portfolio_agent.py`)

**Purpose:** Analyze the user's entire portfolio and generate strategic recommendations.

**Trigger:** Weekly cron job OR user manually requests portfolio report

**Input:** All holdings, their current values, purchase prices, and performance data

**Model:** `anthropic/claude-3-5-sonnet` (reasoning-heavy task)

**System Prompt:**
```
You are a portfolio advisor specializing in collectible trading cards. 
You help collectors optimize their collection strategy by identifying 
grading opportunities, timing, and portfolio concentration risks.

Analyze the portfolio data and provide specific, actionable advice.
Always respond ONLY with valid JSON.
```

**Output Schema:**
```json
{
  "portfolio_health": "excellent | good | fair | poor",
  "total_value_assessment": "string",
  "top_grading_candidates": [
    {
      "card_id": "uuid",
      "card_name": "string",
      "raw_price": 0.0,
      "psa10_price": 0.0,
      "estimated_roi_pct": 0.0,
      "reasoning": "string"
    }
  ],
  "sell_candidates": [
    {
      "card_id": "uuid",
      "reasoning": "string"
    }
  ],
  "concentration_warnings": ["string"],
  "market_opportunities": ["string"],
  "overall_recommendation": "string"
}
```

---

## 7. Backend API Reference

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### Card Routes (`/api/cards`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cards/scan` | Upload image, trigger AI scan |
| GET | `/api/cards/scan/{scan_id}/status` | Poll scan status |
| GET | `/api/cards/search` | Search card database (query, set, type) |
| GET | `/api/cards/{id}` | Get card by ID with latest pricing |
| GET | `/api/cards/{id}/detail` | Full card detail (pricing + history + insights) |
| GET | `/api/cards/{id}/price-history` | Historical prices (days param) |
| GET | `/api/cards/{id}/ebay-sales` | Recent eBay sold listings |
| POST | `/api/cards/{id}/refresh-price` | Force price refresh for one card |

### Portfolio Routes (`/api/portfolio`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio` | Get user's full portfolio with current values |
| POST | `/api/portfolio/add` | Add card to portfolio (with condition, purchase price) |
| PUT | `/api/portfolio/{holding_id}` | Update holding (quantity, condition, notes) |
| DELETE | `/api/portfolio/{holding_id}` | Remove card from portfolio |
| POST | `/api/portfolio/refresh` | Refresh all prices in portfolio |
| GET | `/api/portfolio/stats` | Portfolio summary stats (total value, gains, etc.) |
| GET | `/api/portfolio/performance` | Historical portfolio value time series |

### Market Routes (`/api/market`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market/trending` | Trending cards in the market |
| GET | `/api/market/prices/{card_id}` | Current price breakdown for a card |
| GET | `/api/market/movers` | Biggest price movers today |

### Insights Routes (`/api/insights`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/insights/card/{card_id}` | AI insight for specific card |
| GET | `/api/insights/portfolio` | Portfolio-level AI analysis |
| POST | `/api/insights/generate/{card_id}` | Force regenerate insight for card |

---

### Key Request/Response Schemas

**POST `/api/cards/scan`**
```json
// Request (multipart form data)
{
  "image": "<binary file>",
  "card_type_hint": "pokemon"  // optional
}

// Response
{
  "scan_id": "uuid",
  "status": "processing",
  "poll_url": "/api/cards/scan/uuid/status"
}
```

**GET `/api/cards/scan/{scan_id}/status`**
```json
// Response when complete
{
  "status": "complete",
  "confidence": 0.92,
  "card": {
    "id": "uuid",
    "card_name": "Charizard",
    "set_name": "Base Set",
    "card_number": "4/102",
    "year": 1999,
    "rarity": "Holo Rare",
    "image_url": "https://...",
    "pricing_status": "pending"
  }
}
```

**GET `/api/portfolio`**
```json
{
  "summary": {
    "total_value": 4250.00,
    "total_cost": 1800.00,
    "total_gain_loss": 2450.00,
    "total_gain_loss_pct": 136.1,
    "card_count": 23,
    "last_updated": "2024-01-15T10:30:00Z"
  },
  "holdings": [
    {
      "holding_id": "uuid",
      "card": {
        "id": "uuid",
        "card_name": "Charizard",
        "set_name": "Base Set",
        "card_number": "4/102",
        "image_url": "https://...",
        "rarity": "Holo Rare"
      },
      "condition": "raw",
      "quantity": 1,
      "purchase_price": 200.00,
      "current_value": 450.00,
      "gain_loss": 250.00,
      "gain_loss_pct": 125.0,
      "price_change_24h": 12.50,
      "price_change_24h_pct": 2.85,
      "trend": "rising",
      "last_price_update": "2024-01-15T08:00:00Z"
    }
  ]
}
```

---

## 8. Frontend Pages & Components

### Page: Dashboard (`/dashboard`)

**Purpose:** Main portfolio overview page

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR: Logo | Search | Notification Bell | User Avatar │
├──────────┬──────────────────────────────────────────────┤
│          │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │
│ SIDEBAR  │  │ Total   │ │ Today's │ │ Portfolio       │ │
│          │  │ Value   │ │ Gain    │ │ Value Chart     │ │
│ Dashboard│  │ $4,250  │ │ +$124   │ │ (30 days)       │ │
│ Upload   │  │         │ │ +2.4%   │ │                 │ │
│ Search   │  └─────────┘ └─────────┘ └─────────────────┘ │
│ Portfolio│                                                │
│ Insights │  ┌──────────────────────────────────────────┐ │
│          │  │  TOP MOVERS TODAY                        │ │
│          │  │  🔥 Charizard Base Set +12%  📉 Pikachu │ │
│          │  └──────────────────────────────────────────┘ │
│          │                                                │
│          │  MY COLLECTION (23 cards)  [Add Card] [Sort] │
│          │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐   │
│          │  │ Card  │ │ Card  │ │ Card  │ │ Card  │   │
│          │  │ Tile  │ │ Tile  │ │ Tile  │ │ Tile  │   │
│          │  └───────┘ └───────┘ └───────┘ └───────┘   │
└──────────┴──────────────────────────────────────────────┘
```

**Key Components Used:**
- `PortfolioSummaryCard` — total value, gain/loss, card count
- `PortfolioValueChart` — Recharts LineChart with 7d/30d/all-time toggle
- `TopMoversWidget` — horizontal scroll of biggest movers
- `CardGrid` — responsive grid of `CardTile` components

---

### Page: Upload (`/upload`)

**Purpose:** Upload a card image and have AI identify it

**Flow:**
1. `ImageDropzone` — drag-and-drop or click to upload
2. Image preview shown
3. "Scan Card" button triggers scan
4. `ScanProgressModal` shows progress steps:
   - "Uploading image..."
   - "AI analyzing card..."
   - "Validating identity..."
   - "Fetching market prices..."
5. `ScanResultPreview` shows identified card + confidence score
6. User confirms or rejects identification
7. On confirm → card added to portfolio

**Scan Progress Steps UI:**
```
┌─────────────────────────────────────┐
│  🔍 Analyzing your card...          │
│                                     │
│  ✅ Image uploaded                  │
│  ✅ AI scanning complete            │
│  ⏳ Validating card identity...     │
│  ⏳ Fetching market prices...       │
│                                     │
│  Identified with 94% confidence     │
└─────────────────────────────────────┘
```

---

### Page: Card Detail (`/cards/[id]`)

**Purpose:** Full card information with market data and AI insights

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  ← Back to Portfolio                                 │
│                                                      │
│  ┌───────────┐  Charizard — Base Set #4/102          │
│  │           │  1999 | Holo Rare | Near Mint         │
│  │  CARD     │                                       │
│  │  IMAGE    │  Estimated Value: $450.00             │
│  │           │  ↑ $12.50 (2.85%) today               │
│  └───────────┘  [Refresh Price] [Remove from Portfolio]│
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ PRICE TIERS                                     │ │
│  │  Raw: $450  PSA 8: $850  PSA 9: $1,400  PSA 10: $8,500│ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  [Price History] [Recent Sales] [AI Insights]        │
│  ┌─────────────────────────────────────────────────┐ │
│  │           PRICE HISTORY CHART (30 days)         │ │
│  │           Multiple lines: Raw / PSA 9 / PSA 10  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🤖 AI MARKET INSIGHT                            │ │
│  │ Trend: 📈 Rising                                │ │
│  │ Signal: Consider Grading (Est. ROI: +211%)      │ │
│  │ "Charizard Base Set has seen renewed interest..." │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

### CardTile Component

```tsx
// components/cards/CardTile.tsx
interface CardTileProps {
  holding: PortfolioHolding;
  onClick: () => void;
}

// Renders:
// - Card image (thumbnail)
// - Card name + set
// - Current value (large, prominent)
// - 24h change badge (green/red)
// - Trend indicator icon
// - Condition badge
```

---

### PriceHistoryChart Component

```tsx
// components/cards/PriceHistoryChart.tsx
// Uses Recharts LineChart
// Lines: raw (blue), psa8 (yellow), psa9 (green), psa10 (purple)
// X-axis: dates (last 30 days)
// Y-axis: USD price
// Tooltip: shows all prices on hover
// Toggle: 7D | 30D | 90D | All Time
```

---

## 9. Market Data Engine

### PriceCharting Integration (`price_charting_service.py`)

PriceCharting does not have a public REST API, so we use a combination of their URL patterns and HTTP scraping.

**URL Patterns:**
```
# Game pricing page
https://www.pricecharting.com/game/pokemon-base-set/charizard

# API-style endpoint (returns JSON for some pages)
https://www.pricecharting.com/api/products?q={card_name}&status=completed
```

**Scraping Strategy:**
```python
class PriceChartingService:
    BASE_URL = "https://www.pricecharting.com"
    
    async def get_card_prices(self, card: Card) -> PriceChartingData:
        # Build search query
        query = f"{card.card_name} {card.set_name}"
        
        # Try API endpoint first
        api_url = f"{self.BASE_URL}/api/products?q={urllib.parse.quote(query)}&status=completed"
        response = await httpx_client.get(api_url, headers={"User-Agent": "..."})
        
        if response.status_code == 200:
            data = response.json()
            return self._parse_api_response(data, card)
        
        # Fallback: scrape HTML page
        page_url = self._build_page_url(card)
        return await self._scrape_page(page_url)
    
    def _build_page_url(self, card: Card) -> str:
        # Convert card name to URL slug
        # e.g., "Charizard" → "charizard"
        # e.g., "Base Set" → "pokemon-base-set"
        slug = f"pokemon-{card.set_name.lower().replace(' ', '-')}"
        card_slug = card.card_name.lower().replace(' ', '-')
        return f"{self.BASE_URL}/game/{slug}/{card_slug}"
    
    def _parse_prices(self, soup: BeautifulSoup) -> dict:
        # Extract prices from HTML using CSS selectors
        # #used_price → raw/ungraded
        # #graded-card-prices tbody tr → graded rows
        return {
            "raw": self._extract_price(soup, "#used_price"),
            "psa8": self._extract_graded_price(soup, "PSA 8"),
            "psa9": self._extract_graded_price(soup, "PSA 9"),
            "psa10": self._extract_graded_price(soup, "PSA 10"),
        }
```

**Error Handling:**
- Rate limiting: max 1 request per 2 seconds per IP
- Cache results in Redis for 6 hours
- If scraping fails: use last known price from PostgreSQL

---

### eBay Integration (`ebay_service.py`)

**Method:** eBay Finding API (free, no key required for basic access) + Browse API

**Finding API for Sold Listings:**
```python
EBAY_FINDING_URL = "https://svcs.ebay.com/services/search/FindingService/v1"

async def get_sold_listings(self, card: Card, limit: int = 10) -> list[EbaySale]:
    params = {
        "OPERATION-NAME": "findCompletedItems",
        "SERVICE-VERSION": "1.0.0",
        "SECURITY-APPNAME": settings.EBAY_APP_ID,
        "RESPONSE-DATA-FORMAT": "JSON",
        "keywords": f"{card.card_name} {card.set_name} {card.card_number} pokemon card",
        "itemFilter(0).name": "SoldItemsOnly",
        "itemFilter(0).value": "true",
        "itemFilter(1).name": "Condition",
        "itemFilter(1).value": "3000",  # Used
        "sortOrder": "EndTimeSoonest",
        "paginationInput.entriesPerPage": limit,
        "outputSelector": "SellingStatus"
    }
    
    response = await httpx_client.get(EBAY_FINDING_URL, params=params)
    return self._parse_sold_listings(response.json())
```

**Alternative: eBay Browse API (OAuth)**
```python
# For more reliable data, use Browse API with OAuth
# Requires eBay developer account (free)
EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"

async def search_sold_items(self, query: str) -> list[EbaySale]:
    headers = {
        "Authorization": f"Bearer {await self.get_oauth_token()}",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
    }
    params = {
        "q": query,
        "filter": "buyingOptions:{FIXED_PRICE},conditions:{USED}",
        "sort": "endTime",
        "limit": 20
    }
    response = await httpx_client.get(EBAY_BROWSE_URL, params=params, headers=headers)
    return self._parse_browse_response(response.json())
```

---

### Pokémon TCG API (`card_identity_service.py`)

Free API, no key required for basic usage (100 requests/day), or register for 20,000/day.

```python
POKEMON_TCG_URL = "https://api.pokemontcg.io/v2"

async def search_card(self, name: str, set_code: str = None, number: str = None) -> PokemonCard | None:
    params = {"q": f'name:"{name}"'}
    if set_code:
        params["q"] += f' set.id:{set_code}'
    if number:
        params["q"] += f' number:{number}'
    
    headers = {}
    if settings.POKEMON_TCG_API_KEY:
        headers["X-Api-Key"] = settings.POKEMON_TCG_API_KEY
    
    response = await httpx_client.get(f"{POKEMON_TCG_URL}/cards", params=params, headers=headers)
    data = response.json()
    
    if data["data"]:
        return self._parse_card(data["data"][0])
    return None
```

---

## 10. Pricing Algorithm

### Weighted Price Calculation (`pricing_engine.py`)

The final `estimated_value` for each card is computed using a weighted model that balances stable long-term pricing with recent market transaction data.

**Algorithm:**

```python
class PricingEngine:
    
    # Weight configuration
    WEIGHTS = {
        "pricecharting_raw": 0.30,     # Stable baseline (30%)
        "ebay_median": 0.45,           # Recent market median (45%)
        "ebay_avg": 0.25,              # Recent market average (25%)
    }
    
    def calculate_estimated_value(
        self,
        pricecharting_raw: float | None,
        ebay_sales: list[float],
        condition: str = "raw"
    ) -> PriceEstimate:
        
        components = {}
        
        # PriceCharting component
        if pricecharting_raw:
            components["pricecharting_raw"] = pricecharting_raw
        
        # eBay components (filter outliers first)
        if ebay_sales:
            filtered_sales = self._remove_outliers(ebay_sales)
            if filtered_sales:
                components["ebay_median"] = statistics.median(filtered_sales)
                components["ebay_avg"] = statistics.mean(filtered_sales)
        
        # If we have both sources: use weights
        if "pricecharting_raw" in components and len(components) > 1:
            weighted_sum = sum(
                components[key] * self.WEIGHTS[key]
                for key in components
                if key in self.WEIGHTS
            )
            total_weight = sum(
                self.WEIGHTS[key]
                for key in components
                if key in self.WEIGHTS
            )
            estimated_value = weighted_sum / total_weight
            confidence = 0.85 if len(ebay_sales) >= 5 else 0.65
        
        # If only PriceCharting: use as-is with lower confidence
        elif "pricecharting_raw" in components:
            estimated_value = components["pricecharting_raw"]
            confidence = 0.60
        
        # If only eBay: use median with moderate confidence
        elif "ebay_median" in components:
            estimated_value = components["ebay_median"]
            confidence = 0.70
        
        else:
            raise ValueError("No pricing data available")
        
        return PriceEstimate(
            estimated_value=round(estimated_value, 2),
            confidence=confidence,
            components=components
        )
    
    def _remove_outliers(self, prices: list[float]) -> list[float]:
        if len(prices) < 3:
            return prices
        mean = statistics.mean(prices)
        stdev = statistics.stdev(prices)
        # Remove prices beyond 2 standard deviations
        return [p for p in prices if abs(p - mean) <= 2 * stdev]
    
    def calculate_volatility_score(self, prices: list[float]) -> float:
        if len(prices) < 2:
            return 0.0
        mean = statistics.mean(prices)
        if mean == 0:
            return 0.0
        # Coefficient of variation (0 to 1 scale, capped at 1)
        cv = statistics.stdev(prices) / mean
        return min(cv, 1.0)
    
    def calculate_grading_roi(self, raw_price: float, psa9_price: float, psa10_price: float) -> dict:
        grading_cost = 25.0  # PSA bulk tier estimate
        
        return {
            "roi_to_psa9": ((psa9_price - raw_price - grading_cost) / raw_price) * 100,
            "roi_to_psa10": ((psa10_price - raw_price - grading_cost) / raw_price) * 100,
            "breakeven_grade": "PSA 9" if psa9_price > raw_price + grading_cost else "PSA 10"
        }
```

---

## 11. Background Jobs & Caching

### Celery Tasks (`tasks/price_tasks.py`)

```python
from celery import shared_task
from app.services.market_data_service import MarketDataService
from app.services.pricing_engine import PricingEngine

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def fetch_card_prices(self, card_id: str):
    """
    Triggered: Immediately after a card is added to portfolio
    Fetches prices from PriceCharting + eBay, computes weighted value,
    stores in price_history table.
    """
    try:
        market_service = MarketDataService()
        pricing_engine = PricingEngine()
        
        card = Card.get(card_id)
        
        # Fetch from all sources
        pc_prices = market_service.get_pricecharting_prices(card)
        ebay_sales = market_service.get_ebay_sold_listings(card, limit=10)
        
        # Compute weighted price
        raw_prices = [sale.price for sale in ebay_sales]
        estimate = pricing_engine.calculate_estimated_value(
            pricecharting_raw=pc_prices.raw,
            ebay_sales=raw_prices
        )
        
        # Store in price_history
        PriceHistory.create(
            card_id=card_id,
            estimated_value=estimate.estimated_value,
            confidence_score=estimate.confidence,
            raw_price=estimate.estimated_value,
            psa8_price=pc_prices.psa8,
            psa9_price=pc_prices.psa9,
            psa10_price=pc_prices.psa10,
            pricecharting_raw=pc_prices.raw,
            ebay_avg_last_10=statistics.mean(raw_prices) if raw_prices else None,
            ebay_median_last_10=statistics.median(raw_prices) if raw_prices else None,
            ebay_sales_count=len(raw_prices),
            volatility_score=pricing_engine.calculate_volatility_score(raw_prices)
        )
        
        # Update card status
        card.update(pricing_status="complete")
        
        # Invalidate Redis cache
        cache_utils.delete(f"card_price:{card_id}")
        
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task
def refresh_all_portfolio_prices():
    """
    Cron: Every 6 hours
    Refreshes prices for all cards that have at least one portfolio holding
    """
    active_card_ids = PortfolioHolding.get_unique_card_ids()
    for card_id in active_card_ids:
        fetch_card_prices.delay(card_id)


@shared_task  
def compute_trending_cards():
    """
    Cron: Every 24 hours
    Computes which cards have biggest price movement over 7 days
    Stored in Redis as sorted set for fast retrieval
    """
    pass
```

### Celery Beat Schedule (`celery_app.py`)

```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    "refresh-all-prices-every-6h": {
        "task": "app.tasks.price_tasks.refresh_all_portfolio_prices",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "compute-trending-daily": {
        "task": "app.tasks.maintenance_tasks.compute_trending_cards",
        "schedule": crontab(minute=0, hour=0),  # midnight
    },
    "generate-portfolio-reports-weekly": {
        "task": "app.tasks.insight_tasks.generate_all_portfolio_reports",
        "schedule": crontab(day_of_week=1, hour=6, minute=0),  # Monday 6am
    },
}
```

### Redis Caching Strategy

| Cache Key | Content | TTL |
|---|---|---|
| `card_price:{card_id}` | Latest price estimate for card | 1 hour |
| `portfolio:{user_id}` | Full portfolio with values | 30 minutes |
| `portfolio_stats:{user_id}` | Summary stats | 30 minutes |
| `ai_insight:{card_id}` | AI market insight text | 24 hours |
| `scan_result:{image_hash}` | Vision scan result | 24 hours |
| `pc_prices:{card_slug}` | PriceCharting scrape result | 6 hours |
| `ebay_sales:{card_id}` | eBay sold listings | 2 hours |
| `trending_cards` | Global trending cards list | 1 hour |
| `pokemon_tcg:{query}` | Pokémon TCG API search result | 12 hours |

---

## 12. Authentication & Security

### JWT Authentication Flow

```
1. User POST /auth/login → server returns { access_token, refresh_token }
2. access_token: JWT, expires in 15 minutes, stored in memory (not localStorage)
3. refresh_token: Opaque token, expires in 30 days, stored in httpOnly cookie
4. All API calls include: Authorization: Bearer {access_token}
5. When access_token expires: POST /auth/refresh (cookie sent automatically)
6. Server validates refresh_token, issues new access_token
```

### Security Measures

- All endpoints require authentication except /auth/*
- User can only access their own portfolio holdings (row-level security)
- Card images stored in Supabase Storage with private bucket
- Rate limiting: 100 requests/minute per user, 10 scan requests/hour per user
- Input validation via Pydantic on all API endpoints
- SQL injection prevention via SQLAlchemy ORM (no raw SQL)
- CORS configured to allow only frontend domain
- Environment variables for all secrets (never hardcoded)
- OpenRouter API key stored server-side only, never exposed to frontend

### Row-Level Security (Supabase PostgreSQL)

```sql
-- Only allow users to see their own portfolio holdings
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own holdings"
ON portfolio_holdings
FOR ALL
USING (user_id = auth.uid());
```

---

## 13. Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (`backend/.env`)

```env
# App
APP_ENV=development
SECRET_KEY=your-very-long-random-secret-key-here
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/card_market_db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Redis
REDIS_URL=redis://localhost:6379/0
UPSTASH_REDIS_URL=rediss://your-upstash-url

# AI
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Market Data
EBAY_APP_ID=your-ebay-app-id
EBAY_CERT_ID=your-ebay-cert-id
EBAY_DEV_ID=your-ebay-dev-id
EBAY_OAUTH_TOKEN=your-oauth-token
POKEMON_TCG_API_KEY=your-pokemon-tcg-key  # optional, increases rate limit

# Storage
SUPABASE_STORAGE_BUCKET=card-images

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

---

## 14. External API Integration Details

### OpenRouter API

```python
# backend/agents/vision_agent.py

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

async def call_vision_model(self, b64_image: str, prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": settings.FRONTEND_URL,
        "X-Title": "Card Market Intelligence Platform",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "anthropic/claude-3-5-sonnet",  # Primary vision model
        "messages": [
            {"role": "system", "content": VISION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_image}",
                            "detail": "high"
                        }
                    },
                    {"type": "text", "text": prompt}
                ]
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.1  # Low temp for consistent structured output
    }
    
    response = await httpx_client.post(
        f"{OPENROUTER_BASE}/chat/completions",
        headers=headers,
        json=payload,
        timeout=30.0
    )
    
    return response.json()["choices"][0]["message"]["content"]
```

**Model Fallback Chain:**
1. `anthropic/claude-3-5-sonnet` (best vision, primary)
2. `openai/gpt-4o` (fallback if Claude unavailable)
3. `google/gemini-pro-vision` (secondary fallback)

---

### eBay Developer Account Setup

1. Register at https://developer.ebay.com
2. Create application → get App ID, Cert ID, Dev ID
3. For sold listings: use **Finding API** with `findCompletedItems` operation
4. For broader search: use **Browse API** with OAuth2 token

---

### Pokémon TCG API

- No key required for 100 req/day
- Register at https://pokemontcg.io for 20,000 req/day
- Base URL: `https://api.pokemontcg.io/v2`
- Key endpoints: `/cards?q=name:"Charizard" set.id:base1`

---

## 15. Deployment Guide

### Local Development Setup

```bash
# 1. Start infrastructure
docker-compose up -d  # starts postgres + redis

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Celery worker (separate terminal)
cd backend
celery -A app.celery_app worker --loglevel=info

# 4. Celery beat scheduler (separate terminal)
cd backend
celery -A app.celery_app beat --loglevel=info

# 5. Frontend
cd frontend
npm install
npm run dev
```

### `docker-compose.yml` (Local Dev)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: card_market_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Production Deployment

**Frontend → Vercel:**
```bash
cd frontend
vercel --prod
# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-backend.render.com
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Backend → Render:**
```yaml
# render.yaml
services:
  - type: web
    name: card-market-api
    env: python
    buildCommand: pip install -r requirements.txt && alembic upgrade head
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    
  - type: worker
    name: card-market-celery
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A app.celery_app worker --loglevel=info
    
  - type: cron
    name: card-market-beat
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A app.celery_app beat --loglevel=info
    schedule: "0 * * * *"  # Render cron triggers Celery beat
```

**Database → Supabase:**
- Create project at supabase.com
- Run `alembic upgrade head` against Supabase connection string
- Enable Row Level Security policies (see section 12)

**Cache → Upstash Redis:**
- Create database at upstash.com
- Use REST API URL in `REDIS_URL` env var

---

## 16. Cursor Prompting Strategy

When building this application with Cursor, use the following prompting approach for each phase. Always reference this document by saying "according to CARD_MARKET_INTELLIGENCE_PLATFORM.md" to give Cursor full context.

### Phase 1 — Database & Backend Foundation

**Prompt 1:**
```
Using the schema in CARD_MARKET_INTELLIGENCE_PLATFORM.md section 5, create all 
SQLAlchemy models in backend/app/models/. Create: user.py, card.py, 
portfolio.py, price_history.py, scan_result.py, ai_insights.py, 
ebay_sold_listings.py. Include all columns, indexes, and relationships. 
Use UUID primary keys and TIMESTAMPTZ for all timestamps. 
Also create alembic migration: 001_initial_schema.py.
```

**Prompt 2:**
```
Create all Pydantic schemas in backend/app/schemas/ based on the API 
reference in CARD_MARKET_INTELLIGENCE_PLATFORM.md section 7. Include 
request schemas, response schemas, and shared base schemas. Add proper 
Optional fields and validation. Create: auth.py, card.py, portfolio.py, 
market.py, insights.py.
```

### Phase 2 — AI Agents

**Prompt 3:**
```
Create backend/app/agents/vision_agent.py using the design in section 6 
of CARD_MARKET_INTELLIGENCE_PLATFORM.md. Use the exact system prompt and 
user prompt templates defined there. Use OpenRouter API with 
anthropic/claude-3-5-sonnet as primary model. Include model fallback chain, 
base64 image encoding, JSON response parsing, and confidence threshold logic. 
Use httpx for async HTTP calls.
```

**Prompt 4:**
```
Create backend/app/agents/market_agent.py and portfolio_agent.py using 
section 6 of CARD_MARKET_INTELLIGENCE_PLATFORM.md. Use claude-3-haiku for 
market agent (cost-efficient) and claude-3-5-sonnet for portfolio agent. 
Include all prompt templates and output schemas defined in the design doc.
```

### Phase 3 — Market Data

**Prompt 5:**
```
Create backend/app/services/price_charting_service.py using the integration 
design in section 9 of CARD_MARKET_INTELLIGENCE_PLATFORM.md. Implement 
get_card_prices() with httpx. Try the API endpoint first, fall back to HTML 
scraping with BeautifulSoup. Include Redis caching (6h TTL) and rate limiting 
(1 req/2 sec). Handle errors gracefully by falling back to last known DB price.
```

**Prompt 6:**
```
Create backend/app/services/ebay_service.py using section 9 of 
CARD_MARKET_INTELLIGENCE_PLATFORM.md. Implement eBay Finding API integration 
with findCompletedItems for sold listings. Include OAuth token management for 
Browse API. Parse sold listing prices, dates, and conditions. Cache results 
in Redis for 2 hours.
```

### Phase 4 — Pricing Engine & Services

**Prompt 7:**
```
Create backend/app/services/pricing_engine.py using the exact algorithm in 
section 10 of CARD_MARKET_INTELLIGENCE_PLATFORM.md. Implement 
calculate_estimated_value() with weights: PriceCharting 30%, eBay median 45%, 
eBay average 25%. Include _remove_outliers() (2 std dev filter), 
calculate_volatility_score(), and calculate_grading_roi(). All methods should 
be sync (no async needed).
```

**Prompt 8:**
```
Create backend/app/services/card_scan_service.py using the processing logic 
in section 6 of CARD_MARKET_INTELLIGENCE_PLATFORM.md. Orchestrate: 
image validation → Redis cache check via MD5 hash → vision_agent call → 
Pokémon TCG API validation → DB storage → cache result. Include confidence 
threshold handling (0.85 auto, 0.6-0.84 flag for user confirmation, <0.6 reject).
```

### Phase 5 — API Routes

**Prompt 9:**
```
Create all FastAPI route files in backend/app/api/ following section 7 of 
CARD_MARKET_INTELLIGENCE_PLATFORM.md. Create: auth.py, cards.py, portfolio.py, 
market.py, insights.py. Include proper dependency injection for DB session and 
current user. Add appropriate HTTP status codes. Wire all routes in main.py 
with /api prefix.
```

### Phase 6 — Celery Tasks

**Prompt 10:**
```
Create backend/app/tasks/price_tasks.py and celery_app.py using section 11 of 
CARD_MARKET_INTELLIGENCE_PLATFORM.md. Implement: fetch_card_prices() task with 
3 retries, refresh_all_portfolio_prices() cron task, compute_trending_cards() 
daily task. Configure Celery Beat schedule as defined in the design doc. 
Use Redis as broker and result backend.
```

### Phase 7 — Frontend

**Prompt 11:**
```
Set up the Next.js frontend structure as defined in section 4 of 
CARD_MARKET_INTELLIGENCE_PLATFORM.md. Create the app router structure with 
(auth) and (dashboard) route groups. Install and configure: TanStack Query, 
ShadCN/UI, Recharts, Axios. Create lib/api.ts with Axios instance pointing to 
NEXT_PUBLIC_API_URL with JWT token interceptor. Create lib/queryClient.ts.
```

**Prompt 12:**
```
Create the dashboard page at app/(dashboard)/dashboard/page.tsx using the 
layout design in section 8 of CARD_MARKET_INTELLIGENCE_PLATFORM.md. Build 
these components: PortfolioSummaryCard, PortfolioValueChart (Recharts 
LineChart with 7d/30d toggle), TopMoversWidget, CardGrid with CardTile. 
Use TanStack Query hook usePortfolio to fetch data from GET /api/portfolio. 
Use ShadCN Card, Badge, Skeleton components. Style with Tailwind.
```

**Prompt 13:**
```
Create the upload page at app/(dashboard)/upload/page.tsx using section 8 of 
CARD_MARKET_INTELLIGENCE_PLATFORM.md. Build: ImageDropzone with react-dropzone, 
ScanProgressModal with 4 step indicators, ScanResultPreview with confidence 
display and confirm/reject buttons. Use the useCardScan hook that calls 
POST /api/cards/scan then polls GET /api/cards/scan/{id}/status every 2 seconds 
until status is complete.
```

**Prompt 14:**
```
Create the card detail page at app/(dashboard)/cards/[id]/page.tsx using the 
layout in section 8 of CARD_MARKET_INTELLIGENCE_PLATFORM.md. Build: 
PriceHistoryChart (Recharts with multi-line: raw/psa8/psa9/psa10), 
GradingROITable comparing raw vs graded prices and ROI%, RecentSalesTable 
for eBay sold listings, AIInsightPanel showing trend/signal/summary from AI. 
Use tabs (ShadCN Tabs) to switch between chart/sales/insights.
```

---

## Appendix: Key Dependencies

### Backend `requirements.txt`
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
alembic==1.13.1
pydantic==2.5.3
pydantic-settings==2.1.0
httpx==0.26.0
celery==5.3.4
redis==5.0.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
beautifulsoup4==4.12.3
pillow==10.2.0
supabase==2.3.0
python-dotenv==1.0.0
```

### Frontend `package.json` key dependencies
```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "typescript": "5.3.3",
    "tailwindcss": "3.4.1",
    "@tanstack/react-query": "5.17.19",
    "axios": "1.6.7",
    "recharts": "2.10.4",
    "react-dropzone": "14.2.3",
    "zod": "3.22.4",
    "@supabase/supabase-js": "2.39.3",
    "lucide-react": "0.316.0",
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.0",
    "tailwind-merge": "2.2.1"
  }
}
```

---

*Document version: 1.0 — Generated for Cursor AI implementation*
*Platform: Card Market Intelligence Platform*
*Stack: Next.js 14 + FastAPI + OpenRouter + Supabase + Redis + Celery*

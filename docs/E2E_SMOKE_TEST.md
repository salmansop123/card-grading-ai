# Card Market Intelligence Platform - E2E Smoke Test Checklist

Run these flows after starting all services locally.

## Prerequisites
- [ ] `docker-compose up -d` (postgres + redis)
- [ ] Backend running on :8000
- [ ] Celery worker running
- [ ] Frontend running on :3000
- [ ] Supabase project configured with env vars

## Flow 1: Auth
- [ ] Sign up at /signup
- [ ] Sign in at /login
- [ ] Redirect to /dashboard

## Flow 2: Search & Add
- [ ] Search "Charizard" at /search
- [ ] Add card to portfolio
- [ ] Card appears on dashboard

## Flow 3: Upload & Scan
- [ ] Upload card image at /upload
- [ ] AI scan completes
- [ ] Confirm and add to portfolio

## Flow 4: Card Detail
- [ ] Click card tile
- [ ] View price history, sales, grading ROI, AI insights

## Flow 5: Refresh Prices
- [ ] Click "Refresh Prices" on dashboard
- [ ] Values update after Celery task completes

## API Health
- [ ] GET http://localhost:8000/health returns 200
- [ ] GET http://localhost:8000/docs accessible

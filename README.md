# Personal Investment Dashboard

A desktop-first investment dashboard built with Next.js, TypeScript, Tailwind CSS, and TradingView Lightweight Charts.

## Features

- Macro cards for gold, Bitcoin, US dollar strength, and crude oil
- Default watchlist with 7 A-share / Hong Kong assets
- Add and remove A-share / Hong Kong symbols from the watchlist
- Daily and weekly candlestick charts with volume and MACD
- Server-side technical signal calculation for trend, MACD, and divergence
- A-share market heat analysis panel based on top turnover stocks
- Unified provider layer with real data and mock fallback

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- TradingView Lightweight Charts
- Server routes / API routes

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local` when needed:

```env
MARKET_PROVIDER=real
MX_APIKEY=your_key_here
```

Notes:
- `MARKET_PROVIDER=real` uses live market data providers.
- If the A-share heat provider is unstable, the app falls back automatically.

## Deployment

Recommended free deployment path:

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Add required environment variables in Vercel.
4. Deploy with the free plan.

GitHub Pages is not suitable for this project because it uses Next.js server routes and API endpoints.

## SGC Weekly Tender Monitor

This repository now includes a weekly `South Gas Company` tender monitor designed for Vercel Cron.

### What It Does

- Fetches the latest tender list from the official South Gas Company page: `https://sgc.oil.gov.iq/?tender`
- Pulls each tender detail page and normalizes the title, tender number, publish date, summary, and source link
- Exposes a manual report endpoint at `/api/sgc/report`
- Exposes a weekly cron endpoint at `/api/cron/sgc-weekly`
- Runs automatically every Saturday at `06:00 UTC`, which is `09:00` in Baghdad
- Can send weekly email reports through Resend
- Can persist the previous snapshot locally for development, or back to GitHub for production diff tracking

### Why It Uses The Official SGC Site

The ITP tender portal uses a human verification layer, which is not reliable for unattended Vercel cron jobs.
For stable weekly automation, this monitor uses the official South Gas Company tender source.

### API Endpoints

- Manual report: `/api/sgc/report`
- Manual report and persist snapshot: `/api/sgc/report?persist=1`
- Manual report, persist snapshot, and send email: `/api/sgc/report?persist=1&email=1`
- Weekly cron route: `/api/cron/sgc-weekly`

### Environment Variables

Optional email settings:

```env
RESEND_API_KEY=your_resend_api_key
SGC_EMAIL_FROM=monitor@your-domain.com
SGC_EMAIL_TO=2374564535@qq.com,wanghonghai@antonoil.com
```

Optional cron secret for manual triggering:

```env
CRON_SECRET=your_random_secret
```

Optional GitHub-backed snapshot persistence:

```env
GITHUB_TOKEN=your_github_token
GITHUB_REPO_OWNER=your_github_username_or_org
GITHUB_REPO_NAME=your_repo_name
GITHUB_REPO_BRANCH=main
GITHUB_STATE_PATH=data/sgc-tenders-state.json
```

Notes:

- If GitHub persistence is not configured, local development writes the snapshot to `.data/sgc-tenders-state.json`.
- On Vercel, local filesystem writes are not durable, so GitHub persistence is recommended if you want change detection between weekly runs.
- If email settings are not configured, the cron route still runs and returns JSON, but it skips email delivery.

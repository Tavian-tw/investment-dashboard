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
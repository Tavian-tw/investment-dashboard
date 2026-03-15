import YahooFinance from "yahoo-finance2";
import type { AssetSnapshot, Candle } from "@/lib/types";
import type { AssetDefinition, MarketDataProvider } from "@/lib/providers/base";

type CachedSnapshot = {
  expiresAt: number;
  value: AssetSnapshot;
};

type CachedMiniSeries = {
  expiresAt: number;
  value: Array<{ time: string; value: number }>;
};

type SymbolResolution = {
  primary: string;
  fallbacks?: string[];
};

const CACHE_TTL_MS = 60_000;

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

const snapshotCache = new Map<string, CachedSnapshot>();
const miniSeriesCache = new Map<string, CachedMiniSeries>();

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeSymbol(symbol: string): SymbolResolution {
  if (symbol === "DXY.PROXY") {
    return { primary: "DX-Y.NYB", fallbacks: ["UUP"] };
  }
  if (symbol === "XAUUSD") {
    return { primary: "GC=F", fallbacks: ["XAUUSD=X"] };
  }
  if (symbol === "BTCUSD") {
    return { primary: "BTC-USD" };
  }
  if (symbol === "WTI") {
    return { primary: "CL=F", fallbacks: ["BZ=F"] };
  }
  if (/^0\d{4}\.HK$/.test(symbol)) {
    return { primary: symbol.slice(1) };
  }
  if (symbol.endsWith(".SH")) {
    return { primary: symbol.replace(/\.SH$/, ".SS") };
  }
  return { primary: symbol };
}

function toCandle(row: {
  date: Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
}): Candle | null {
  if (row.open == null || row.high == null || row.low == null || row.close == null) {
    return null;
  }

  return {
    time: formatDate(row.date),
    open: Number(row.open.toFixed(2)),
    high: Number(row.high.toFixed(2)),
    low: Number(row.low.toFixed(2)),
    close: Number(row.close.toFixed(2)),
    volume: row.volume ?? undefined,
  };
}

function getUtcWeekday(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`).getUTCDay();
}

function normalizeCandleSeries(candles: Candle[], interval: "1d" | "1wk") {
  const firstByTime = new Map<string, Candle>();

  for (const candle of candles) {
    // Yahoo sometimes appends a second intraday snapshot for the same date.
    // Keep the first completed OHLCV bar to avoid inflated volume on duplicate rows.
    if (!firstByTime.has(candle.time)) {
      firstByTime.set(candle.time, candle);
    }
  }

  const normalized = Array.from(firstByTime.values()).sort((left, right) => left.time.localeCompare(right.time));
  if (interval !== "1wk" || normalized.length < 3) {
    return normalized;
  }

  const weekdayCounts = new Map<number, number>();
  for (const candle of normalized.slice(0, -1)) {
    const weekday = getUtcWeekday(candle.time);
    weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
  }

  const dominantWeekday = Array.from(weekdayCounts.entries())
    .sort((left, right) => right[1] - left[1])[0]?.[0];
  const lastCandle = normalized[normalized.length - 1];

  if (dominantWeekday != null && getUtcWeekday(lastCandle.time) !== dominantWeekday) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

async function fetchChartWithFallback(
  symbol: string,
  interval: "1d" | "1wk",
  period1: Date,
) {
  const resolution = normalizeSymbol(symbol);
  const candidates = [resolution.primary, ...(resolution.fallbacks ?? [])];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const chart = await yahooFinance.chart(
        candidate,
        {
          period1,
          interval,
        },
        { validateResult: false },
      );
      return { candidate, chart: chart as { meta: any; quotes: Array<any> } };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`No data source available for ${symbol}`);
}

async function loadSnapshot(definition: AssetDefinition): Promise<AssetSnapshot> {
  const now = Date.now();
  const cached = snapshotCache.get(definition.symbol);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const dailyStart = new Date();
  dailyStart.setUTCFullYear(dailyStart.getUTCFullYear() - 1);
  const weeklyStart = new Date();
  weeklyStart.setUTCFullYear(weeklyStart.getUTCFullYear() - 5);

  const [dailyResult, weeklyResult] = await Promise.all([
    fetchChartWithFallback(definition.symbol, "1d", dailyStart),
    fetchChartWithFallback(definition.symbol, "1wk", weeklyStart),
  ]);

  const dailyCandles = normalizeCandleSeries(
    dailyResult.chart.quotes
      .map(toCandle)
      .filter((candle): candle is Candle => candle !== null),
    "1d",
  );
  const weeklyCandles = normalizeCandleSeries(
    weeklyResult.chart.quotes
      .map(toCandle)
      .filter((candle): candle is Candle => candle !== null),
    "1wk",
  );

  if (dailyCandles.length < 2 || weeklyCandles.length < 2) {
    throw new Error(`Insufficient chart data for ${definition.symbol}`);
  }

  const latest = dailyCandles[dailyCandles.length - 1];
  const previous = dailyCandles[dailyCandles.length - 2];
  const meta = dailyResult.chart.meta ?? {};
  const rawPrice = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : latest.close;
  const price = Number(rawPrice.toFixed(2));
  const previousClose = Number(previous.close.toFixed(2));
  const change = Number((price - previousClose).toFixed(2));
  const changePercent = previousClose === 0 ? 0 : Number((((price - previousClose) / previousClose) * 100).toFixed(2));

  const latestDate = new Date(`${latest.time}T00:00:00Z`);
  const regularMarketTime = meta.regularMarketTime instanceof Date ? meta.regularMarketTime : latestDate;
  const updatedAt = regularMarketTime.getTime() < latestDate.getTime()
    ? latestDate.toISOString()
    : regularMarketTime.toISOString();

  const snapshot: AssetSnapshot = {
    symbol: definition.symbol,
    name: definition.name,
    price,
    change,
    changePercent,
    updatedAt,
    marketTimeZone: typeof meta.exchangeTimezoneName === "string" ? meta.exchangeTimezoneName : "UTC",
    dailyCandles,
    weeklyCandles,
  };

  snapshotCache.set(definition.symbol, {
    expiresAt: now + CACHE_TTL_MS,
    value: snapshot,
  });

  return snapshot;
}

export class RealMarketDataProvider implements MarketDataProvider {
  readonly kind = "real" as const;

  async getAssetSnapshot(definition: AssetDefinition): Promise<AssetSnapshot> {
    return loadSnapshot(definition);
  }

  async getMiniSeries(
    definition: AssetDefinition,
  ): Promise<Array<{ time: string; value: number }>> {
    const now = Date.now();
    const cached = miniSeriesCache.get(definition.symbol);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const snapshot = await loadSnapshot(definition);
    const value = snapshot.dailyCandles.slice(-30).map((candle) => ({
      time: candle.time,
      value: candle.close,
    }));

    miniSeriesCache.set(definition.symbol, {
      expiresAt: now + CACHE_TTL_MS,
      value,
    });

    return value;
  }
}
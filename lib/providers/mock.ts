import { DAILY_CANDLE_COUNT, WEEKLY_CANDLE_COUNT } from "@/lib/constants";
import type { AssetSnapshot, Candle } from "@/lib/types";
import type { AssetDefinition, MarketDataProvider } from "@/lib/providers/base";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rand(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function buildCandles(
  seed: number,
  basePrice: number,
  count: number,
  stepDays: number,
): Candle[] {
  const candles: Candle[] = [];
  const end = new Date();
  let previousClose = basePrice;

  for (let index = count - 1; index >= 0; index -= 1) {
    const current = new Date(end);
    current.setUTCDate(current.getUTCDate() - index * stepDays);

    const drift = Math.sin((seed + index) / 11) * basePrice * 0.009;
    const noise = (rand(seed * 13 + index) - 0.5) * basePrice * 0.025;
    const open = previousClose;
    const close = Math.max(0.1, open + drift + noise);
    const high = Math.max(open, close) + Math.abs(noise) * 0.6 + basePrice * 0.004;
    const low = Math.min(open, close) - Math.abs(noise) * 0.6 - basePrice * 0.004;
    const volume = Math.round(1000000 + rand(seed * 17 + index) * 3000000);

    candles.push({
      time: formatDate(current),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(Math.max(0.1, low).toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    previousClose = close;
  }

  return candles;
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly kind = "mock" as const;

  async getAssetSnapshot(definition: AssetDefinition): Promise<AssetSnapshot> {
    const dailyCandles = buildCandles(definition.seed, definition.basePrice, DAILY_CANDLE_COUNT, 1);
    const weeklyCandles = buildCandles(
      definition.seed + 500,
      definition.basePrice,
      WEEKLY_CANDLE_COUNT,
      7,
    );
    const latest = dailyCandles[dailyCandles.length - 1];
    const previous = dailyCandles[dailyCandles.length - 2] ?? latest;
    const price = latest.close;
    const change = Number((price - previous.close).toFixed(2));
    const changePercent = Number((((price - previous.close) / previous.close) * 100).toFixed(2));

    return {
      symbol: definition.symbol,
      name: definition.name,
      price,
      change,
      changePercent,
      updatedAt: new Date().toISOString(),
      marketTimeZone: "Asia/Shanghai",
      dailyCandles,
      weeklyCandles,
    };
  }

  async getMiniSeries(definition: AssetDefinition) {
    const candles = buildCandles(definition.seed + 900, definition.basePrice, 30, 1);
    return candles.map((candle) => ({ time: candle.time, value: candle.close }));
  }
}
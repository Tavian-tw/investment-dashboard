import { DAILY_PIVOT_LOOKBACK, WEEKLY_PIVOT_LOOKBACK } from "@/lib/constants";
import type { Candle, MacdPoint, TechnicalSignal } from "@/lib/types";

function sma(values: number[], period: number) {
  return values.map((_, index) => {
    if (index + 1 < period) {
      return Number.NaN;
    }
    const slice = values.slice(index + 1 - period, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / period;
  });
}

function ema(values: number[], period: number) {
  const multiplier = 2 / (period + 1);
  return values.reduce<number[]>((result, value, index) => {
    if (index === 0) {
      result.push(value);
    } else {
      const previous = result[index - 1];
      result.push((value - previous) * multiplier + previous);
    }
    return result;
  }, []);
}

export function calculateMacd(candles: Candle[]): MacdPoint[] {
  const closes = candles.map((candle) => candle.close);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const dif = closes.map((_, index) => ema12[index] - ema26[index]);
  const dea = ema(dif, 9);

  return candles.map((candle, index) => ({
    time: candle.time,
    dif: Number(dif[index].toFixed(4)),
    dea: Number(dea[index].toFixed(4)),
    hist: Number((dif[index] - dea[index]).toFixed(4)),
  }));
}

function getTrend(candles: Candle[]) {
  const closes = candles.map((candle) => candle.close);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const latestIndex = closes.length - 1;
  const close = closes[latestIndex];
  const latestMa20 = ma20[latestIndex];
  const latestMa60 = ma60[latestIndex];

  if (Number.isNaN(latestMa20) || Number.isNaN(latestMa60)) {
    return "neutral" as const;
  }
  if (close > latestMa20 && latestMa20 > latestMa60) {
    return "bull" as const;
  }
  if (close < latestMa20 && latestMa20 < latestMa60) {
    return "bear" as const;
  }
  return "neutral" as const;
}

function getMacdSignal(macd: MacdPoint[]) {
  const current = macd[macd.length - 1];
  const previous = macd[macd.length - 2];
  if (!current || !previous) {
    return "none" as const;
  }
  if (previous.dif <= previous.dea && current.dif > current.dea) {
    return "golden_cross" as const;
  }
  if (previous.dif >= previous.dea && current.dif < current.dea) {
    return "dead_cross" as const;
  }
  return "none" as const;
}

type Pivot = { price: number; macdValue: number; histValue: number };

function findPivotHighs(candles: Candle[], macd: MacdPoint[], lookback: number) {
  const pivots: Pivot[] = [];
  for (let index = lookback; index < candles.length - lookback; index += 1) {
    const high = candles[index].high;
    const window = candles.slice(index - lookback, index + lookback + 1);
    const isPivot = window.every((candle, localIndex) => {
      const actualIndex = index - lookback + localIndex;
      return actualIndex === index || candle.high <= high;
    });
    if (isPivot) {
      pivots.push({ price: high, macdValue: macd[index].dif, histValue: macd[index].hist });
    }
  }
  return pivots.slice(-2);
}

function findPivotLows(candles: Candle[], macd: MacdPoint[], lookback: number) {
  const pivots: Pivot[] = [];
  for (let index = lookback; index < candles.length - lookback; index += 1) {
    const low = candles[index].low;
    const window = candles.slice(index - lookback, index + lookback + 1);
    const isPivot = window.every((candle, localIndex) => {
      const actualIndex = index - lookback + localIndex;
      return actualIndex === index || candle.low >= low;
    });
    if (isPivot) {
      pivots.push({ price: low, macdValue: macd[index].dif, histValue: macd[index].hist });
    }
  }
  return pivots.slice(-2);
}

function getDivergence(candles: Candle[], macd: MacdPoint[], lookback: number) {
  const highs = findPivotHighs(candles, macd, lookback);
  if (highs.length === 2) {
    const [left, right] = highs;
    if (
      right.price > left.price &&
      (right.macdValue <= left.macdValue || right.histValue <= left.histValue)
    ) {
      return "bearish" as const;
    }
  }

  const lows = findPivotLows(candles, macd, lookback);
  if (lows.length === 2) {
    const [left, right] = lows;
    if (
      right.price < left.price &&
      (right.macdValue >= left.macdValue || right.histValue >= left.histValue)
    ) {
      return "bullish" as const;
    }
  }

  return "none" as const;
}

function toTrendLabel(trend: TechnicalSignal["trend"]) {
  if (trend === "bull") return "偏多";
  if (trend === "bear") return "偏空";
  return "中性";
}

function toMacdLabel(signal: TechnicalSignal["macdSignal"]) {
  if (signal === "golden_cross") return "MACD 刚金叉";
  if (signal === "dead_cross") return "MACD 刚死叉";
  return "MACD 无明确交叉";
}

function toDivergenceLabel(divergence: TechnicalSignal["divergence"]) {
  if (divergence === "bearish") return "出现顶背离";
  if (divergence === "bullish") return "出现底背离";
  return "暂未出现背离";
}

export function buildTechnicalSignal(
  candles: Candle[],
  timeframe: "daily" | "weekly",
): TechnicalSignal {
  const trend = getTrend(candles);
  const macd = calculateMacd(candles);
  const macdSignal = getMacdSignal(macd);
  const divergence = getDivergence(
    candles,
    macd,
    timeframe === "daily" ? DAILY_PIVOT_LOOKBACK : WEEKLY_PIVOT_LOOKBACK,
  );

  return {
    trend,
    macdSignal,
    divergence,
    summary: `${timeframe === "weekly" ? "周线" : "日线"}${toTrendLabel(trend)}，${toMacdLabel(
      macdSignal,
    )}，${toDivergenceLabel(divergence)}`,
  };
}
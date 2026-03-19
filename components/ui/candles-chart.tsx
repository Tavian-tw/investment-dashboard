"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
} from "lightweight-charts";
import { calculateMacd } from "@/lib/indicators";
import type { Candle } from "@/lib/types";

type CandlesChartProps = {
  candles: Candle[];
  title: string;
};

function ensureSortedCandles(candles: Candle[]) {
  return [...candles].sort((left, right) => left.time.localeCompare(right.time));
}

export function CandlesChart({ candles, title }: CandlesChartProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const priceContainerRef = useRef<HTMLDivElement | null>(null);
  const volumeContainerRef = useRef<HTMLDivElement | null>(null);
  const macdContainerRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (
      !wrapperRef.current ||
      !priceContainerRef.current ||
      !volumeContainerRef.current ||
      !macdContainerRef.current
    ) {
      return;
    }

    const sortedCandles = ensureSortedCandles(candles);
    const initialWidth = Math.max(wrapperRef.current.clientWidth - 8, 320);

    const commonOptions = {
      width: initialWidth,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#57534e",
      },
      grid: {
        vertLines: { color: "rgba(87, 83, 78, 0.08)" },
        horzLines: { color: "rgba(87, 83, 78, 0.08)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    } as const;

    const priceChart = createChart(priceContainerRef.current, {
      ...commonOptions,
      height: 320,
    });
    const volumeChart = createChart(volumeContainerRef.current, {
      ...commonOptions,
      height: 120,
    });
    const macdChart = createChart(macdContainerRef.current, {
      ...commonOptions,
      height: 170,
    });

    const candleSeries = priceChart.addSeries(CandlestickSeries, {
      upColor: "#0b7a4b",
      downColor: "#b42318",
      wickUpColor: "#0b7a4b",
      wickDownColor: "#b42318",
      borderVisible: false,
    });
    candleSeries.setData(
      sortedCandles.map((candle) => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    );

    const volumeSeries = volumeChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
    });
    volumeSeries.setData(
      sortedCandles.map((candle) => ({
        time: candle.time,
        value: candle.volume ?? 0,
        color: candle.close >= candle.open ? "rgba(11,122,75,0.72)" : "rgba(180,35,24,0.72)",
      })),
    );

    const macd = calculateMacd(sortedCandles);
    const histogramSeries = macdChart.addSeries(HistogramSeries, {
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
    });
    const difSeries = macdChart.addSeries(LineSeries, { color: "#ab3b1f", lineWidth: 2 });
    const deaSeries = macdChart.addSeries(LineSeries, { color: "#2563eb", lineWidth: 2 });

    histogramSeries.setData(
      macd.map((point) => ({
        time: point.time,
        value: point.hist,
        color: point.hist >= 0 ? "rgba(11,122,75,0.75)" : "rgba(180,35,24,0.75)",
      })),
    );
    difSeries.setData(macd.map((point) => ({ time: point.time, value: point.dif })));
    deaSeries.setData(macd.map((point) => ({ time: point.time, value: point.dea })));

    priceChart.timeScale().fitContent();
    volumeChart.timeScale().fitContent();
    macdChart.timeScale().fitContent();

    const syncRange = (source: typeof priceChart, targets: Array<typeof priceChart>) => {
      source.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (!range || syncingRef.current) {
          return;
        }
        syncingRef.current = true;
        for (const target of targets) {
          target.timeScale().setVisibleLogicalRange(range);
        }
        syncingRef.current = false;
      });
    };

    syncRange(priceChart, [volumeChart, macdChart]);
    syncRange(volumeChart, [priceChart, macdChart]);
    syncRange(macdChart, [priceChart, volumeChart]);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const nextWidth = Math.max(Math.floor(entry.contentRect.width) - 8, 320);
      priceChart.applyOptions({ width: nextWidth });
      volumeChart.applyOptions({ width: nextWidth });
      macdChart.applyOptions({ width: nextWidth });
      priceChart.timeScale().fitContent();
    });

    resizeObserver.observe(wrapperRef.current);

    return () => {
      resizeObserver.disconnect();
      priceChart.remove();
      volumeChart.remove();
      macdChart.remove();
    };
  }, [candles]);

  return (
    <div ref={wrapperRef} className="rounded-[28px] bg-white/65 p-4">
      <p className="mb-3 text-base font-medium text-ink">{title}</p>
      <div ref={priceContainerRef} />
      <div className="mt-4">
        <p className="mb-2 text-sm text-stone-500">成交量</p>
        <div ref={volumeContainerRef} />
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm text-stone-500">MACD</p>
        <div ref={macdContainerRef} />
      </div>
    </div>
  );
}


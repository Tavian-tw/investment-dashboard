"use client";

import { useEffect, useRef } from "react";
import { AreaSeries, ColorType, createChart } from "lightweight-charts";
import type { MacroViewModel } from "@/lib/types";

type MacroCardProps = {
  macro: MacroViewModel;
};

function trendClass(value: "bull" | "bear" | "neutral") {
  if (value === "bull") return "text-bull font-semibold";
  if (value === "bear") return "text-bear font-semibold";
  return "text-neutral font-medium";
}

function labelTrend(value: "bull" | "bear" | "neutral") {
  if (value === "bull") return "多头";
  if (value === "bear") return "空头";
  return "中性";
}

function timeZoneLabel(timeZone?: string) {
  if (timeZone === "Asia/Shanghai") return "北京时间";
  if (timeZone === "Asia/Hong_Kong") return "香港时间";
  if (timeZone === "America/New_York") return "纽约时间";
  return "市场时间";
}

function formatMarketDateTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function MacroCard({ macro }: MacroCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 90,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#57534e",
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0)" },
        horzLines: { color: "rgba(0,0,0,0)" },
      },
      rightPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: false,
      },
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: macro.changePercent >= 0 ? "#0b7a4b" : "#b42318",
      topColor: macro.changePercent >= 0 ? "rgba(11,122,75,0.26)" : "rgba(180,35,24,0.26)",
      bottomColor: "rgba(255,255,255,0)",
      lineWidth: 2,
    });

    series.setData(macro.miniSeries);

    return () => chart.remove();
  }, [macro]);

  return (
    <div className="card-surface rounded-[30px] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-stone-500">{macro.symbol}</p>
          <h3 className="mt-1 text-2xl font-semibold text-ink">{macro.name}</h3>
        </div>
        <div className={`text-right ${macro.changePercent >= 0 ? "text-bull" : "text-bear"}`}>
          <p className="text-2xl font-semibold">{macro.price.toFixed(2)}</p>
          <p className="text-sm">
            {macro.changePercent >= 0 ? "+" : ""}
            {macro.changePercent.toFixed(2)}%
          </p>
        </div>
      </div>
      <div ref={containerRef} />
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-stone-500">{timeZoneLabel(macro.marketTimeZone)} {formatMarketDateTime(macro.updatedAt, macro.marketTimeZone)}</span>
        <span className={trendClass(macro.trend)}>{labelTrend(macro.trend)}</span>
      </div>
    </div>
  );
}
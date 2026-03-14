"use client";

import { useMemo, useState } from "react";
import type { AssetViewModel } from "@/lib/types";
import { CandlesChart } from "@/components/ui/candles-chart";

type AssetDetailProps = {
  asset: AssetViewModel;
};

const copy = {
  dayTrend: "\u65e5\u7ebf\u5224\u65ad",
  weekTrend: "\u5468\u7ebf\u5224\u65ad",
  currentPrice: "\u5f53\u524d\u4ef7\u683c",
  dayK: "\u65e5\u7ebf K \u7ebf",
  weekK: "\u5468\u7ebf K \u7ebf",
};

function translateTrend(value: "bull" | "bear" | "neutral") {
  if (value === "bull") return "\u5468\u7ebf\u504f\u591a";
  if (value === "bear") return "\u5468\u7ebf\u504f\u7a7a";
  return "\u5468\u7ebf\u4e2d\u6027";
}

export function AssetDetail({ asset }: AssetDetailProps) {
  const [timeframe, setTimeframe] = useState<"1D" | "1W">("1D");

  const technicalConclusion = useMemo(() => {
    return `${translateTrend(asset.signalWeekly.trend)}，${asset.signalDaily.summary}`;
  }, [asset.signalDaily.summary, asset.signalWeekly.trend]);

  const activeCandles = timeframe === "1D" ? asset.snapshot.dailyCandles : asset.snapshot.weeklyCandles;

  return (
    <div className="card-surface rounded-[34px] p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-stone-500">{asset.symbol}</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">{asset.name}</h2>
          <p className="mt-3 text-base text-stone-600">{technicalConclusion}</p>
        </div>
        <div className="flex gap-2">
          {(["1D", "1W"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeframe(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                timeframe === value
                  ? "bg-ink text-white"
                  : "bg-stone-200 text-stone-700 hover:bg-stone-300"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <CandlesChart
          key={`${asset.symbol}-${timeframe}`}
          candles={activeCandles}
          title={timeframe === "1D" ? copy.dayK : copy.weekK}
        />
        <div className="grid gap-4">
          <div className="rounded-[24px] bg-stone-100/85 p-4">
            <p className="text-sm text-stone-500">{copy.dayTrend}</p>
            <p className="mt-2 text-base font-medium text-ink">{asset.signalDaily.summary}</p>
          </div>
          <div className="rounded-[24px] bg-stone-100/85 p-4">
            <p className="text-sm text-stone-500">{copy.weekTrend}</p>
            <p className="mt-2 text-base font-medium text-ink">{asset.signalWeekly.summary}</p>
          </div>
          <div className="rounded-[24px] bg-stone-100/85 p-4">
            <p className="text-sm text-stone-500">{copy.currentPrice}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{asset.snapshot.price.toFixed(2)}</p>
            <p className={asset.snapshot.change >= 0 ? "mt-2 text-bull" : "mt-2 text-bear"}>
              {asset.snapshot.change >= 0 ? "+" : ""}
              {asset.snapshot.change.toFixed(2)} / {asset.snapshot.changePercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
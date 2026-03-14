import type { KeyboardEvent } from "react";
import type { AssetViewModel } from "@/lib/types";

type AssetCardProps = {
  asset: AssetViewModel;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
};

const copy = {
  remove: "\u79fb\u9664",
  updatedAt: "\u66f4\u65b0\u65f6\u95f4\uff08",
  closeParen: "\uff09",
  trend: "\u8d8b\u52bf\u5224\u65ad",
  macd: "MACD \u4fe1\u53f7",
  divergence: "\u80cc\u79bb\u63d0\u793a",
};

function clsTrend(value: "bull" | "bear" | "neutral") {
  if (value === "bull") return "text-bull font-semibold";
  if (value === "bear") return "text-bear font-semibold";
  return "text-neutral font-medium";
}

function clsDivergence(value: "bearish" | "bullish" | "none") {
  if (value === "bearish") return "text-bear font-bold";
  if (value === "bullish") return "text-bull font-semibold";
  return "text-ink font-medium";
}

function labelTrend(value: "bull" | "bear" | "neutral") {
  if (value === "bull") return "\u591a\u5934";
  if (value === "bear") return "\u7a7a\u5934";
  return "\u4e2d\u6027";
}

function labelMacd(value: "golden_cross" | "dead_cross" | "none") {
  if (value === "golden_cross") return "\u91d1\u53c9";
  if (value === "dead_cross") return "\u6b7b\u53c9";
  return "\u65e0";
}

function labelDivergence(value: "bearish" | "bullish" | "none") {
  if (value === "bearish") return "\u9876\u80cc\u79bb";
  if (value === "bullish") return "\u5e95\u80cc\u79bb";
  return "\u65e0";
}

function timeZoneLabel(timeZone?: string) {
  if (timeZone === "Asia/Shanghai") return "\u5317\u4eac\u65f6\u95f4";
  if (timeZone === "Asia/Hong_Kong") return "\u9999\u6e2f\u65f6\u95f4";
  if (timeZone === "America/New_York") return "\u7ebd\u7ea6\u65f6\u95f4";
  return "\u5e02\u573a\u65f6\u95f4";
}

function formatMarketDateTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function AssetCard({ asset, isActive, onClick, onRemove }: AssetCardProps) {
  const positive = asset.snapshot.change >= 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`card-surface relative cursor-pointer rounded-[28px] p-5 text-left transition duration-200 hover:-translate-y-1 ${
        isActive ? "border-accent ring-2 ring-accent/30" : ""
      }`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute right-4 top-4 rounded-full border border-line bg-white/85 px-2 py-1 text-xs text-stone-500 transition hover:border-bear hover:text-bear"
        aria-label={`${copy.remove} ${asset.name}`}
      >
        {copy.remove}
      </button>

      <div className="mb-4 flex items-start justify-between gap-4 pr-14">
        <div>
          <h3 className="text-xl font-semibold text-ink">{asset.name}</h3>
          <p className="mt-1 text-sm text-stone-500">{asset.symbol}</p>
        </div>
        <div className={`text-right ${positive ? "text-bull" : "text-bear"}`}>
          <p className="text-2xl font-semibold">{asset.snapshot.price.toFixed(2)}</p>
          <p className="text-sm">
            {positive ? "+" : ""}
            {asset.snapshot.change.toFixed(2)} ({positive ? "+" : ""}
            {asset.snapshot.changePercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-stone-100/80 p-3">
          <p className="text-stone-500">{copy.updatedAt}{timeZoneLabel(asset.snapshot.marketTimeZone)}{copy.closeParen}</p>
          <p className="mt-1 font-medium text-ink">{formatMarketDateTime(asset.snapshot.updatedAt, asset.snapshot.marketTimeZone)}</p>
        </div>
        <div className="rounded-2xl bg-stone-100/80 p-3">
          <p className="text-stone-500">{copy.trend}</p>
          <p className={`mt-1 ${clsTrend(asset.signalDaily.trend)}`}>{labelTrend(asset.signalDaily.trend)}</p>
        </div>
        <div className="rounded-2xl bg-stone-100/80 p-3">
          <p className="text-stone-500">{copy.macd}</p>
          <p className="mt-1 font-medium text-ink">{labelMacd(asset.signalDaily.macdSignal)}</p>
        </div>
        <div className="rounded-2xl bg-stone-100/80 p-3">
          <p className="text-stone-500">{copy.divergence}</p>
          <p className={`mt-1 ${clsDivergence(asset.signalDaily.divergence)}`}>{labelDivergence(asset.signalDaily.divergence)}</p>
        </div>
      </div>
    </div>
  );
}
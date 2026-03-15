import type { AShareHeatSummary } from "@/lib/types";

type AShareHeatPanelProps = {
  summary: AShareHeatSummary;
  generatedAt: string;
  provider: "mock" | "real";
};

const copy = {
  title: "\u0041\u80a1\u5e02\u573a\u70ed\u5ea6\u5206\u6790",
  subtitle: "\u57fa\u4e8e\u5f53\u65e5\u6210\u4ea4\u989d\u524d 20 \u53ea\u80a1\u7968\u7684\u884c\u4e1a\u5206\u5e03\u4e0e\u8d44\u91d1\u6d3b\u8dc3\u5ea6\u7edf\u8ba1",
  provider: "\u6570\u636e\u6e90\uff1a",
  generatedAt: "\u751f\u6210\u65f6\u95f4\uff1a",
  top3: "\u6700\u70ed\u884c\u4e1a TOP3",
  appeared: "\u51fa\u73b0",
  times: "\u6b21",
  activity: "\u8d44\u91d1\u6d3b\u8dc3\u5ea6",
  over100b: "\u6210\u4ea4\u989d\u524d 20 \u4e2d\uff0c\u6210\u4ea4\u989d\u5927\u4e8e 100 \u4ebf\u7684\u80a1\u7968\u6570\u91cf",
  level: "\u5e02\u573a\u70ed\u5ea6\u7b49\u7ea7\uff1a",
  top5: "\u6210\u4ea4\u989d\u5927\u4e8e 100 \u4ebf\u7684\u884c\u4e1a\u5206\u5e03\u524d\u4e94",
  summary: "\u5e02\u573a\u7ed3\u8bba",
  sample: "\u6210\u4ea4\u989d\u5927\u4e8e 100 \u4ebf\u660e\u7ec6",
  stocks: "\u4ee3\u8868\u80a1",
  empty: "\u6210\u4ea4\u989d\u524d 20 \u4e2d\u6682\u65e0\u6210\u4ea4\u989d\u5927\u4e8e 100 \u4ebf\u7684\u80a1\u7968",
};

function levelLabel(level: AShareHeatSummary["marketHeatLevel"]) {
  if (level === "hot") return "\u706b\u70ed";
  if (level === "warm") return "\u504f\u70ed";
  if (level === "neutral") return "\u4e2d\u6027";
  return "\u504f\u51b7";
}

function levelClass(level: AShareHeatSummary["marketHeatLevel"]) {
  if (level === "hot") return "bg-bear text-white";
  if (level === "warm") return "bg-accent text-white";
  if (level === "neutral") return "bg-stone-700 text-white";
  return "bg-stone-300 text-stone-800";
}

function formatTurnover(value: number) {
  return `${(value / 100000000).toFixed(1)}\u4ebf`;
}

function formatChangePercent(value: number) {
  const positive = value >= 0;
  return `${positive ? "+" : ""}${value.toFixed(2)}%`;
}

export function AShareHeatPanel({ summary, generatedAt, provider }: AShareHeatPanelProps) {
  return (
    <section className="mb-8 rounded-[30px] bg-[#111827] p-6 text-stone-100 shadow-card">
      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-[#f59e0b]">A-share pulse</p>
          <h2 className="mt-2 text-3xl font-semibold">{copy.title}</h2>
          <p className="mt-2 text-sm text-stone-300">{copy.subtitle}</p>
        </div>
        <div className="text-sm text-stone-400">
          <p>{copy.provider}{provider}</p>
          <p>{copy.generatedAt}{new Date(generatedAt).toLocaleString("zh-CN")}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <div className="rounded-[24px] bg-white/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{copy.top3}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelClass(summary.marketHeatLevel)}`}>
              {summary.marketHeatLevel.toUpperCase()} / {levelLabel(summary.marketHeatLevel)}
            </span>
          </div>
          <div className="space-y-3">
            {summary.top3Industries.map((item, index) => {
              const stocks = summary.turnoverOver100BStocks
                .filter((stock) => stock.industry === item.industry)
                .sort((left, right) => right.turnover - left.turnover)
                .slice(0, 3);

              return (
                <div key={item.industry} className="rounded-2xl bg-white/5 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-400">TOP {index + 1}</p>
                      <p className="mt-1 text-lg font-semibold">{item.industry}</p>
                    </div>
                    <p className="text-sm text-stone-300">{copy.appeared} {item.count} {copy.times}</p>
                  </div>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-stone-400">{copy.stocks}</p>
                    <div className="space-y-2">
                      {stocks.map((stock) => (
                        <div key={stock.symbol} className="grid grid-cols-[minmax(0,1fr)_72px_62px] items-center gap-3 text-sm">
                          <span className="truncate text-white">{stock.name}</span>
                          <span className="text-right text-stone-300">{formatTurnover(stock.turnover)}</span>
                          <span className={`text-right ${stock.changePercent >= 0 ? "text-bull" : "text-bear"}`}>
                            {formatChangePercent(stock.changePercent)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] bg-white/5 p-5">
          <h3 className="text-lg font-semibold">{copy.activity}</h3>
          <p className="mt-4 text-sm text-stone-400">{copy.over100b}</p>
          <p className="mt-3 text-5xl font-semibold text-white">{summary.turnoverOver100BCount}</p>
          <p className="mt-3 text-sm text-stone-300">{copy.level}{summary.marketHeatLevel}</p>
          <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm text-stone-300">
            <p className="font-medium text-white">{copy.top5}</p>
            <div className="mt-3 space-y-2">
              {summary.industryRanking.slice(0, 5).map((item) => (
                <div key={item.industry} className="flex items-center justify-between">
                  <span>{item.industry}</span>
                  <span>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-white/5 p-5">
          <h3 className="text-lg font-semibold">{copy.summary}</h3>
          <p className="mt-4 rounded-2xl bg-[#f8fafc] px-4 py-4 text-sm leading-7 text-stone-800">{summary.summary}</p>
          <div className="mt-5 rounded-2xl bg-white/5 p-4">
            <p className="text-sm font-medium text-white">{copy.sample}</p>
            <div className="mt-3 space-y-2 text-sm text-stone-300">
              {summary.turnoverOver100BStocks.length > 0 ? (
                summary.turnoverOver100BStocks.map((stock) => (
                  <div key={stock.symbol} className="grid grid-cols-[minmax(0,1fr)_72px_62px] items-center gap-3">
                    <span className="truncate">{stock.name}</span>
                    <span className="text-right">{formatTurnover(stock.turnover)}</span>
                    <span className={`text-right ${stock.changePercent >= 0 ? "text-bull" : "text-bear"}`}>
                      {formatChangePercent(stock.changePercent)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-400">{copy.empty}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
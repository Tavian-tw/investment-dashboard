"use client";

import { useEffect, useMemo, useState } from "react";
import type { AShareHeatApiResponse, AssetViewModel, DashboardPayload } from "@/lib/types";
import { AShareHeatPanel } from "@/components/AShareHeatPanel";
import { AssetDetail } from "@/components/ui/asset-detail";
import { AssetCard } from "@/components/ui/asset-card";
import { MacroCard } from "@/components/ui/macro-card";

type DashboardClientProps = {
  initialData: DashboardPayload;
  initialHeat: AShareHeatApiResponse;
};

const copy = {
  title: "\u4e2a\u4eba\u6295\u8d44\u770b\u677f",
  provider: "\u6570\u636e\u6e90\uff1a",
  generatedAt: "\u751f\u6210\u65f6\u95f4\uff1a",
  watchlist: "\u63a8\u8350 Watchlist",
  watchlistHint: "\u652f\u6301\u65b0\u589e\u548c\u5220\u9664 A \u80a1\u3001\u6e2f\u80a1\u6807\u7684\uff0c\u70b9\u51fb\u5361\u7247\u67e5\u770b\u65e5\u7ebf / \u5468\u7ebf K \u7ebf\u4e0e MACD",
  restore: "\u6dfb\u52a0\u56de\u770b\u677f\uff1a",
  allVisible: "\u5f53\u524d\u5df2\u5c55\u793a\u5168\u90e8\u63a8\u8350\u6807\u7684",
  symbolPlaceholder: "\u8f93\u5165\u4ee3\u7801\uff0c\u5982 601318.SH \u6216 0700.HK",
  namePlaceholder: "\u8f93\u5165\u540d\u79f0\uff0c\u5982 \u4e2d\u56fd\u5e73\u5b89 / \u817e\u8baf\u63a7\u80a1",
  addIdle: "\u65b0\u589e\u6807\u7684",
  addPending: "\u6dfb\u52a0\u4e2d...",
  format: "\u652f\u6301\u683c\u5f0f\uff1aA \u80a1 600000.SH / 000001.SZ\uff0c\u6e2f\u80a1 0700.HK / 09988.HK",
  emptyTitle: "\u5f53\u524d\u63a8\u8350 Watchlist \u5df2\u6e05\u7a7a\u3002",
  emptyHint: "\u53ef\u5728\u4e0a\u65b9\u8f93\u5165\u4ee3\u7801\u548c\u540d\u79f0\u65b0\u589e\u6807\u7684\uff0c\u6216\u5728\u201c\u6dfb\u52a0\u56de\u770b\u677f\u201d\u4e2d\u6062\u590d\u3002",
  author: "\u4f5c\u8005\uff1a\u5510\u73ae \u00b7 Tavian",
  email: "\u90ae\u7bb1\uff1a2374564535@qq.com",
  requiredError: "\u8bf7\u540c\u65f6\u586b\u5199\u4ee3\u7801\u548c\u540d\u79f0\uff0c\u4f8b\u5982\uff1a601318.SH / \u4e2d\u56fd\u5e73\u5b89",
  symbolError: "\u4ec5\u652f\u6301 A \u80a1\u548c\u6e2f\u80a1\u4ee3\u7801\uff0c\u4f8b\u5982\uff1a601318.SH\u3001000001.SZ\u30010700.HK\u30019988.HK",
  addFailed: "\u6dfb\u52a0\u6807\u7684\u5931\u8d25",
};

function normalizeInputSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function isSupportedChinaSymbol(symbol: string) {
  return /^(\d{6}\.(SH|SZ)|\d{4,5}\.HK)$/.test(symbol);
}

export function DashboardClient({ initialData, initialHeat }: DashboardClientProps) {
  const [payload, setPayload] = useState(initialData);
  const [heatPayload, setHeatPayload] = useState(initialHeat);
  const [customAssets, setCustomAssets] = useState<AssetViewModel[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(
    initialData.assets.map((asset) => asset.symbol),
  );
  const [selectedSymbol, setSelectedSymbol] = useState(initialData.assets[0]?.symbol ?? "");
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      const [dashboardResponse, heatResponse] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/a-share-heat", { cache: "no-store" }),
      ]);

      if (dashboardResponse.ok) {
        const nextPayload = (await dashboardResponse.json()) as DashboardPayload;
        setPayload(nextPayload);
      }

      if (heatResponse.ok) {
        const nextHeat = (await heatResponse.json()) as AShareHeatApiResponse;
        setHeatPayload(nextHeat);
      }
    };

    const timer = window.setInterval(refresh, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const allAssets = useMemo(() => {
    const map = new Map<string, AssetViewModel>();
    for (const asset of payload.assets) {
      map.set(asset.symbol, asset);
    }
    for (const asset of customAssets) {
      map.set(asset.symbol, asset);
    }
    return Array.from(map.values());
  }, [payload.assets, customAssets]);

  const visibleAssets = useMemo(
    () => allAssets.filter((asset) => watchlistSymbols.includes(asset.symbol)),
    [allAssets, watchlistSymbols],
  );

  const hiddenAssets = useMemo(
    () => allAssets.filter((asset) => !watchlistSymbols.includes(asset.symbol)),
    [allAssets, watchlistSymbols],
  );

  const selectedAsset = useMemo<AssetViewModel | undefined>(() => {
    return visibleAssets.find((asset) => asset.symbol === selectedSymbol) ?? visibleAssets[0];
  }, [visibleAssets, selectedSymbol]);

  const removeFromWatchlist = (symbol: string) => {
    const nextVisible = visibleAssets.filter((asset) => asset.symbol !== symbol);
    setWatchlistSymbols((current) => current.filter((item) => item !== symbol));
    if (selectedSymbol === symbol) {
      setSelectedSymbol(nextVisible[0]?.symbol ?? "");
    }
  };

  const addToWatchlist = (symbol: string) => {
    setWatchlistSymbols((current) => (current.includes(symbol) ? current : [...current, symbol]));
    setSelectedSymbol(symbol);
  };

  const handleAddAsset = async () => {
    const symbol = normalizeInputSymbol(newSymbol);
    const name = newName.trim();

    if (!symbol || !name) {
      setAddError(copy.requiredError);
      return;
    }
    if (!isSupportedChinaSymbol(symbol)) {
      setAddError(copy.symbolError);
      return;
    }
    if (allAssets.some((asset) => asset.symbol === symbol)) {
      addToWatchlist(symbol);
      setNewSymbol("");
      setNewName("");
      setAddError("");
      return;
    }

    setIsAdding(true);
    setAddError("");
    try {
      const response = await fetch(`/api/asset?symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(name)}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || copy.addFailed);
      }
      const asset = body as AssetViewModel;
      setCustomAssets((current) => [...current, asset]);
      setWatchlistSymbols((current) => [...current, asset.symbol]);
      setSelectedSymbol(asset.symbol);
      setNewSymbol("");
      setNewName("");
    } catch (error) {
      setAddError(error instanceof Error ? error.message : copy.addFailed);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-6 py-8 lg:px-8">
      <section className="mb-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-accent">Investment cockpit</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">{copy.title}</h1>
          </div>
          <div className="text-right text-sm text-stone-600">
            <p>{copy.provider}{payload.provider}</p>
            <p>{copy.generatedAt}{new Date(payload.generatedAt).toLocaleString("zh-CN")}</p>
          </div>
        </div>
        <div className="grid-shell md:grid-cols-2 xl:grid-cols-4">
          {payload.macros.map((macro) => (
            <MacroCard key={macro.symbol} macro={macro} />
          ))}
        </div>
      </section>

      <AShareHeatPanel
        summary={heatPayload.data}
        generatedAt={heatPayload.generatedAt}
        provider={heatPayload.provider}
      />

      <section className="mb-8">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-ink">{copy.watchlist}</h2>
              <p className="text-sm text-stone-600">{copy.watchlistHint}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-500">{copy.restore}</span>
              {hiddenAssets.length > 0 ? (
                hiddenAssets.map((asset) => (
                  <button
                    key={asset.symbol}
                    type="button"
                    onClick={() => addToWatchlist(asset.symbol)}
                    className="rounded-full border border-line bg-white/70 px-3 py-1 text-sm text-ink transition hover:border-accent hover:text-accent"
                  >
                    + {asset.name}
                  </button>
                ))
              ) : (
                <span className="text-sm text-stone-400">{copy.allVisible}</span>
              )}
            </div>
          </div>

          <div className="card-surface rounded-[26px] p-4">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_1.4fr_auto]">
              <input
                value={newSymbol}
                onChange={(event) => setNewSymbol(event.target.value)}
                placeholder={copy.symbolPlaceholder}
                className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-accent"
              />
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={copy.namePlaceholder}
                className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none placeholder:text-stone-400 focus:border-accent"
              />
              <button
                type="button"
                onClick={handleAddAsset}
                disabled={isAdding}
                className="rounded-2xl bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAdding ? copy.addPending : copy.addIdle}
              </button>
            </div>
            <p className="mt-2 text-xs text-stone-500">{copy.format}</p>
            {addError ? <p className="mt-2 text-sm font-medium text-bear">{addError}</p> : null}
          </div>
        </div>

        <div className="mt-4 grid-shell md:grid-cols-2 xl:grid-cols-3">
          {visibleAssets.map((asset) => (
            <AssetCard
              key={asset.symbol}
              asset={asset}
              isActive={asset.symbol === selectedAsset?.symbol}
              onClick={() => setSelectedSymbol(asset.symbol)}
              onRemove={() => removeFromWatchlist(asset.symbol)}
            />
          ))}
        </div>
      </section>

      {selectedAsset ? (
        <section className="pb-8">
          <AssetDetail asset={selectedAsset} />
        </section>
      ) : (
        <section className="pb-8">
          <div className="card-surface rounded-[34px] p-8 text-center text-stone-600">
            <p>{copy.emptyTitle}</p>
            <p className="mt-2">{copy.emptyHint}</p>
          </div>
        </section>
      )}

      <footer className="mt-auto border-t border-line/70 pt-6 text-sm text-stone-600">
        <p>{copy.author}</p>
        <p>{copy.email}</p>
      </footer>
    </main>
  );
}
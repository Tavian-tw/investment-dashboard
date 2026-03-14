import { buildTechnicalSignal } from "@/lib/indicators";
import type { AssetDefinition, MarketDataProvider } from "@/lib/providers/base";
import { MockMarketDataProvider } from "@/lib/providers/mock";
import { RealMarketDataProvider } from "@/lib/providers/real";
import type { AssetViewModel, DashboardPayload, MacroViewModel } from "@/lib/types";
import { DEFAULT_MACROS, DEFAULT_WATCHLIST } from "@/lib/watchlist";

function resolveProvider(): MarketDataProvider {
  return process.env.MARKET_PROVIDER === "mock"
    ? new MockMarketDataProvider()
    : new RealMarketDataProvider();
}

function normalizeDefinition(definition: Partial<AssetDefinition> & Pick<AssetDefinition, "symbol" | "name">): AssetDefinition {
  const seed = Array.from(definition.symbol).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    symbol: definition.symbol.trim().toUpperCase(),
    name: definition.name.trim(),
    seed,
    basePrice: definition.basePrice ?? 100,
  };
}

export async function buildAssetViewModel(
  definitionInput: Partial<AssetDefinition> & Pick<AssetDefinition, "symbol" | "name">,
): Promise<AssetViewModel> {
  const provider = resolveProvider();
  const definition = normalizeDefinition(definitionInput);
  const snapshot = await provider.getAssetSnapshot(definition);

  return {
    symbol: definition.symbol,
    name: definition.name,
    snapshot,
    signalDaily: buildTechnicalSignal(snapshot.dailyCandles, "daily"),
    signalWeekly: buildTechnicalSignal(snapshot.weeklyCandles, "weekly"),
  };
}

async function buildMacro(
  provider: MarketDataProvider,
  definition: AssetDefinition,
): Promise<MacroViewModel> {
  const snapshot = await provider.getAssetSnapshot(definition);
  const miniSeries = await provider.getMiniSeries(definition);
  const trend = buildTechnicalSignal(snapshot.dailyCandles, "daily").trend;

  return {
    symbol: definition.symbol,
    name: definition.name,
    price: snapshot.price,
    changePercent: snapshot.changePercent,
    updatedAt: snapshot.updatedAt,
    marketTimeZone: snapshot.marketTimeZone,
    trend,
    miniSeries,
  };
}

export async function getDashboardData(): Promise<DashboardPayload> {
  const provider = resolveProvider();

  const assets = await Promise.all(
    DEFAULT_WATCHLIST.map(async (definition) => {
      const snapshot = await provider.getAssetSnapshot(definition);
      return {
        symbol: definition.symbol,
        name: definition.name,
        snapshot,
        signalDaily: buildTechnicalSignal(snapshot.dailyCandles, "daily"),
        signalWeekly: buildTechnicalSignal(snapshot.weeklyCandles, "weekly"),
      };
    }),
  );

  const macros = await Promise.all(
    DEFAULT_MACROS.map((definition) => buildMacro(provider, definition)),
  );

  return {
    assets,
    macros,
    generatedAt: new Date().toISOString(),
    provider: provider.kind,
  };
}
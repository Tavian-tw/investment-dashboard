import type { AssetSnapshot } from "@/lib/types";

export type AssetDefinition = {
  symbol: string;
  name: string;
  seed: number;
  basePrice: number;
};

export interface MarketDataProvider {
  readonly kind: "mock" | "real";
  getAssetSnapshot(definition: AssetDefinition): Promise<AssetSnapshot>;
  getMiniSeries(definition: AssetDefinition): Promise<Array<{ time: string; value: number }>>;
}
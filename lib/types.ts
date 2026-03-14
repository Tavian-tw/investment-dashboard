export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type AssetSnapshot = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
  marketTimeZone?: string;
  dailyCandles: Candle[];
  weeklyCandles: Candle[];
};

export type TechnicalSignal = {
  trend: "bull" | "bear" | "neutral";
  macdSignal: "golden_cross" | "dead_cross" | "none";
  divergence: "bearish" | "bullish" | "none";
  summary: string;
};

export type AssetViewModel = {
  symbol: string;
  name: string;
  snapshot: AssetSnapshot;
  signalDaily: TechnicalSignal;
  signalWeekly: TechnicalSignal;
};

export type MacroViewModel = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  updatedAt: string;
  marketTimeZone?: string;
  trend: "bull" | "bear" | "neutral";
  miniSeries: Array<{ time: string; value: number }>;
};

export type MarketTopTurnoverStock = {
  symbol: string;
  name: string;
  industry: string;
  turnover: number;
  changePercent: number;
};

export type IndustryHeatItem = {
  industry: string;
  count: number;
};

export type AShareHeatSummary = {
  top20: MarketTopTurnoverStock[];
  industryRanking: IndustryHeatItem[];
  top3Industries: IndustryHeatItem[];
  turnoverOver100BCount: number;
  marketHeatLevel: "hot" | "warm" | "neutral" | "cold";
  summary: string;
};

export type AShareHeatApiResponse = {
  data: AShareHeatSummary;
  provider: "mock" | "real";
  generatedAt: string;
};

export type DashboardPayload = {
  assets: AssetViewModel[];
  macros: MacroViewModel[];
  generatedAt: string;
  provider: "mock" | "real";
};

export type MacdPoint = {
  time: string;
  dif: number;
  dea: number;
  hist: number;
};
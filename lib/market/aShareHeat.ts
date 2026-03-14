import type {
  AShareHeatApiResponse,
  AShareHeatSummary,
  IndustryHeatItem,
  MarketTopTurnoverStock,
} from "@/lib/types";

type EastmoneyDiffItem = {
  f3?: number;
  f6?: number;
  f12?: string;
  f13?: number;
  f14?: string;
  f100?: string;
};

type EastmoneyResponse = {
  data?: {
    diff?: Record<string, EastmoneyDiffItem>;
  };
};

type MxEntityTag = {
  marketChar?: string;
  fullName?: string;
};

type MxTableDto = {
  code?: string;
  entityName?: string;
  table?: Record<string, unknown>;
  rawTable?: Record<string, unknown>;
  nameMap?: Record<string, string>;
  indicatorOrder?: string[];
  entityTagDTO?: MxEntityTag;
};

type MxDataResponse = {
  status?: number;
  message?: string;
  data?: {
    dataTableDTOList?: MxTableDto[];
    rawDataTableDTOList?: MxTableDto[];
  };
};

const CACHE_TTL_MS = 60_000;
const MX_QUERY = "A股今日成交额前20股票及所属行业、涨跌幅";
const MX_ENDPOINT = "https://mkapi2.dfcfs.com/finskillshub/api/claw/query";
const EASTMONEY_TOP20_URL = "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=2&fltt=2&invt=2&fid=f6&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f3,f6,f12,f13,f14,f100";
const EASTMONEY_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Referer: "https://quote.eastmoney.com/",
};

const MOCK_TOP20: MarketTopTurnoverStock[] = [
  { symbol: "300750.SZ", name: "\u5b81\u5fb7\u65f6\u4ee3", industry: "\u9502\u7535\u6c60", turnover: 15_600_000_000, changePercent: 3.12 },
  { symbol: "601318.SH", name: "\u4e2d\u56fd\u5e73\u5b89", industry: "\u4fdd\u9669", turnover: 10_800_000_000, changePercent: 1.26 },
  { symbol: "002594.SZ", name: "\u6bd4\u4e9a\u8fea", industry: "\u6c7d\u8f66\u6574\u8f66", turnover: 13_900_000_000, changePercent: 2.18 },
  { symbol: "600036.SH", name: "\u62db\u5546\u94f6\u884c", industry: "\u94f6\u884c", turnover: 11_200_000_000, changePercent: -0.36 },
  { symbol: "300059.SZ", name: "\u4e1c\u65b9\u8d22\u5bcc", industry: "\u4e92\u8054\u7f51\u91d1\u878d", turnover: 12_400_000_000, changePercent: 4.22 },
  { symbol: "000063.SZ", name: "\u4e2d\u5174\u901a\u8baf", industry: "\u901a\u4fe1\u8bbe\u5907", turnover: 10_500_000_000, changePercent: 2.06 },
  { symbol: "601127.SH", name: "\u8d5b\u529b\u65af", industry: "\u6c7d\u8f66\u6574\u8f66", turnover: 14_300_000_000, changePercent: 5.17 },
  { symbol: "600519.SH", name: "\u8d35\u5dde\u8305\u53f0", industry: "\u767d\u9152", turnover: 10_100_000_000, changePercent: -0.84 },
  { symbol: "603259.SH", name: "\u836f\u660e\u5eb7\u5fb7", industry: "\u521b\u65b0\u836f", turnover: 8_600_000_000, changePercent: 1.92 },
  { symbol: "688041.SH", name: "\u6d77\u5149\u4fe1\u606f", industry: "\u534a\u5bfc\u4f53", turnover: 11_700_000_000, changePercent: 6.55 },
  { symbol: "002371.SZ", name: "\u5317\u65b9\u534e\u521b", industry: "\u534a\u5bfc\u4f53", turnover: 10_300_000_000, changePercent: 3.94 },
  { symbol: "300308.SZ", name: "\u4e2d\u9645\u65ed\u521b", industry: "\u901a\u4fe1\u8bbe\u5907", turnover: 12_100_000_000, changePercent: 4.11 },
  { symbol: "000977.SZ", name: "\u6d6a\u6f6e\u4fe1\u606f", industry: "\u7b97\u529b\u670d\u52a1\u5668", turnover: 10_600_000_000, changePercent: 2.68 },
  { symbol: "600941.SH", name: "\u4e2d\u56fd\u79fb\u52a8", industry: "\u8fd0\u8425\u5546", turnover: 6_900_000_000, changePercent: 0.73 },
  { symbol: "300502.SZ", name: "\u65b0\u6613\u76db", industry: "\u901a\u4fe1\u8bbe\u5907", turnover: 10_200_000_000, changePercent: 7.14 },
  { symbol: "600050.SH", name: "\u4e2d\u56fd\u8054\u901a", industry: "\u8fd0\u8425\u5546", turnover: 7_300_000_000, changePercent: 1.48 },
  { symbol: "002415.SZ", name: "\u6d77\u5eb7\u5a01\u89c6", industry: "\u5b89\u9632\u8bbe\u5907", turnover: 5_800_000_000, changePercent: -0.22 },
  { symbol: "601899.SH", name: "\u7d2b\u91d1\u77ff\u4e1a", industry: "\u6709\u8272\u91d1\u5c5e", turnover: 9_400_000_000, changePercent: 1.37 },
  { symbol: "600030.SH", name: "\u4e2d\u4fe1\u8bc1\u5238", industry: "\u8bc1\u5238", turnover: 8_200_000_000, changePercent: 0.96 },
  { symbol: "000725.SZ", name: "\u4eac\u4e1c\u65b9A", industry: "\u9762\u677f", turnover: 6_500_000_000, changePercent: -0.58 },
];

let cachedResponse: { expiresAt: number; value: AShareHeatApiResponse } | null = null;

function buildIndustryRanking(top20: MarketTopTurnoverStock[]): IndustryHeatItem[] {
  const counts = new Map<string, number>();

  for (const stock of top20) {
    counts.set(stock.industry, (counts.get(stock.industry) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([industry, count]) => ({ industry, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.industry.localeCompare(right.industry, "zh-CN");
    });
}

function getMarketHeatLevel(turnoverOver100BCount: number): AShareHeatSummary["marketHeatLevel"] {
  if (turnoverOver100BCount >= 15) return "hot";
  if (turnoverOver100BCount >= 10) return "warm";
  if (turnoverOver100BCount >= 6) return "neutral";
  return "cold";
}

function getHeatSummary(level: AShareHeatSummary["marketHeatLevel"]): string {
  if (level === "hot") {
    return "\u5e02\u573a\u975e\u5e38\u706b\u70ed\uff0c\u6210\u4ea4\u989d\u8fc7\u767e\u4ebf\u4e2a\u80a1\u6570\u91cf\u8f83\u591a\uff0c\u8d44\u91d1\u6d3b\u8dc3\u5ea6\u9ad8\uff0c\u77ed\u7ebf\u53c2\u4e0e\u73af\u5883\u8f83\u597d\uff0c\u53ef\u91cd\u70b9\u5173\u6ce8\u5f3a\u52bf\u4e3b\u7ebf\u884c\u4e1a\u9f99\u5934\u3002";
  }
  if (level === "warm") {
    return "\u5e02\u573a\u4e2d\u6027\u504f\u5f3a\uff0c\u70ed\u70b9\u8f83\u4e3a\u96c6\u4e2d\uff0c\u8d44\u91d1\u627f\u63a5\u5c1a\u53ef\uff0c\u53ef\u4f18\u5148\u5173\u6ce8\u70ed\u5ea6\u5c45\u524d\u884c\u4e1a\u7684\u6838\u5fc3\u4e2a\u80a1\u3002";
  }
  if (level === "neutral") {
    return "\u5e02\u573a\u70ed\u5ea6\u4e00\u822c\uff0c\u70ed\u70b9\u6301\u7eed\u6027\u4ecd\u9700\u89c2\u5bdf\uff0c\u64cd\u4f5c\u4e0a\u5b9c\u9002\u5ea6\u8c28\u614e\uff0c\u907f\u514d\u76f2\u76ee\u8ffd\u9ad8\u3002";
  }
  return "\u5e02\u573a\u504f\u51b7\uff0c\u9ad8\u6210\u4ea4\u989d\u4e2a\u80a1\u8f83\u5c11\uff0c\u8d44\u91d1\u6d3b\u8dc3\u5ea6\u4e0d\u8db3\uff0c\u77ed\u7ebf\u64cd\u4f5c\u9700\u63a7\u5236\u4ed3\u4f4d\uff0c\u8010\u5fc3\u7b49\u5f85\u66f4\u6e05\u6670\u673a\u4f1a\u3002";
}

function createSummary(top20: MarketTopTurnoverStock[]): AShareHeatSummary {
  const industryRanking = buildIndustryRanking(top20);
  const top3Industries = industryRanking.slice(0, 3);
  const turnoverOver100BCount = top20.filter((stock) => stock.turnover >= 10_000_000_000).length;
  const marketHeatLevel = getMarketHeatLevel(turnoverOver100BCount);

  return {
    top20,
    industryRanking,
    top3Industries,
    turnoverOver100BCount,
    marketHeatLevel,
    summary: getHeatSummary(marketHeatLevel),
  };
}

function resolveAshareSymbol(code: string, market?: number, marketChar?: string) {
  if (marketChar === ".SH" || market === 1) return `${code}.SH`;
  return `${code}.SZ`;
}

function firstString(values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function findColumnName(nameMap: Record<string, string>, matcher: (name: string) => boolean) {
  return Object.entries(nameMap).find(([, name]) => matcher(name))?.[0];
}

function extractMxRows(dto: MxTableDto) {
  const table = dto.table ?? dto.rawTable;
  if (!table || typeof table !== "object") {
    return [];
  }

  const headName = Array.isArray((table as Record<string, unknown>).headName)
    ? ((table as Record<string, unknown>).headName as unknown[])
    : [];

  const columnKeys = Object.entries(table)
    .filter(([key, value]) => key !== "headName" && Array.isArray(value))
    .map(([key]) => key);

  const rowCount = Math.max(
    headName.length,
    ...columnKeys.map((key) => (((table as Record<string, unknown>)[key] as unknown[]) ?? []).length),
  );

  return Array.from({ length: rowCount }, (_, index) => {
    const row: Record<string, unknown> = {
      headName: headName[index],
    };

    for (const key of columnKeys) {
      const values = (table as Record<string, unknown>)[key] as unknown[];
      row[key] = values[index];
    }

    return row;
  });
}

function parseMxTop20(payload: MxDataResponse): MarketTopTurnoverStock[] {
  const tables = payload.data?.dataTableDTOList ?? payload.data?.rawDataTableDTOList ?? [];
  const results: MarketTopTurnoverStock[] = [];

  for (const dto of tables) {
    const nameMap = dto.nameMap ?? {};
    const codeKey = findColumnName(nameMap, (name) => name.includes("\u4ee3\u7801"));
    const nameKey = findColumnName(nameMap, (name) => name.includes("\u540d\u79f0") || name.includes("\u7b80\u79f0"));
    const industryKey = findColumnName(nameMap, (name) => name.includes("\u6240\u5c5e\u884c\u4e1a") || name === "\u884c\u4e1a");
    const turnoverKey = findColumnName(nameMap, (name) => name.includes("\u6210\u4ea4\u989d") || name.includes("\u6210\u4ea4\u91d1\u989d"));
    const changePercentKey = findColumnName(nameMap, (name) => name.includes("\u6da8\u8dcc\u5e45"));
    const rows = extractMxRows(dto);

    for (const row of rows) {
      const code = typeof row[codeKey ?? ""] === "string"
        ? (row[codeKey ?? ""] as string)
        : dto.code;
      const name = typeof row[nameKey ?? ""] === "string"
        ? (row[nameKey ?? ""] as string)
        : firstString([dto.entityTagDTO?.fullName, dto.entityName]);
      const industry = typeof row[industryKey ?? ""] === "string"
        ? (row[industryKey ?? ""] as string)
        : undefined;
      const turnover = typeof row[turnoverKey ?? ""] === "number"
        ? (row[turnoverKey ?? ""] as number)
        : Number(row[turnoverKey ?? ""]);
      const changePercent = typeof row[changePercentKey ?? ""] === "number"
        ? (row[changePercentKey ?? ""] as number)
        : Number(row[changePercentKey ?? ""]);

      if (!code || !name || !Number.isFinite(turnover) || turnover <= 0) {
        continue;
      }

      results.push({
        symbol: resolveAshareSymbol(code.replace(/\.(SH|SZ)$/i, ""), undefined, dto.entityTagDTO?.marketChar),
        name: name.trim(),
        industry: industry?.trim() || "\u5176\u4ed6",
        turnover,
        changePercent: Number.isFinite(changePercent) ? Number(changePercent.toFixed(2)) : 0,
      });
    }
  }

  const unique = new Map<string, MarketTopTurnoverStock>();
  for (const item of results) {
    if (!unique.has(item.symbol)) {
      unique.set(item.symbol, item);
    }
  }

  return Array.from(unique.values())
    .sort((left, right) => right.turnover - left.turnover)
    .slice(0, 20);
}

function toEastmoneyStock(item: EastmoneyDiffItem): MarketTopTurnoverStock | null {
  if (!item.f12 || !item.f14 || typeof item.f6 !== "number") {
    return null;
  }

  return {
    symbol: resolveAshareSymbol(item.f12, item.f13),
    name: item.f14.trim(),
    industry: item.f100?.trim() || "\u5176\u4ed6",
    turnover: Number(item.f6),
    changePercent: typeof item.f3 === "number" ? Number(item.f3.toFixed(2)) : 0,
  };
}

async function fetchMxTop20(apiKey: string): Promise<MarketTopTurnoverStock[]> {
  const response = await fetch(MX_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ toolQuery: MX_QUERY }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`mx_data request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as MxDataResponse;
  if (payload.status && payload.status !== 200) {
    throw new Error(payload.message || "mx_data request failed");
  }

  const top20 = parseMxTop20(payload);
  if (top20.length < 10) {
    throw new Error("mx_data returned insufficient A-share turnover data");
  }

  return top20;
}

async function fetchEastmoneyTop20(): Promise<MarketTopTurnoverStock[]> {
  const response = await fetch(EASTMONEY_TOP20_URL, {
    headers: EASTMONEY_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Eastmoney request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as EastmoneyResponse;
  const diff = payload.data?.diff;
  if (!diff) {
    throw new Error("Eastmoney payload missing data.diff");
  }

  const top20 = Object.values(diff)
    .map(toEastmoneyStock)
    .filter((stock): stock is MarketTopTurnoverStock => stock !== null)
    .filter((stock) => stock.turnover > 0)
    .slice(0, 20);

  if (top20.length < 10) {
    throw new Error("Eastmoney returned insufficient A-share turnover data");
  }

  return top20;
}

function toResponse(summary: AShareHeatSummary, provider: "mock" | "real"): AShareHeatApiResponse {
  return {
    data: summary,
    provider,
    generatedAt: new Date().toISOString(),
  };
}

export function getAShareHeatSummary(top20: MarketTopTurnoverStock[] = MOCK_TOP20): AShareHeatSummary {
  return createSummary(top20);
}

export async function getAShareHeatResponse(): Promise<AShareHeatApiResponse> {
  const now = Date.now();
  if (cachedResponse && cachedResponse.expiresAt > now) {
    return cachedResponse.value;
  }

  const preferredProvider = process.env.ASHARE_HEAT_PROVIDER ?? "real";
  const mxApiKey = process.env.MX_APIKEY;

  if (preferredProvider !== "mock") {
    try {
      if (mxApiKey) {
        const mxResponse = toResponse(createSummary(await fetchMxTop20(mxApiKey)), "real");
        cachedResponse = {
          expiresAt: now + CACHE_TTL_MS,
          value: mxResponse,
        };
        return mxResponse;
      }
    } catch {
      // Fall through to the verified public Eastmoney endpoint.
    }

    try {
      const eastmoneyResponse = toResponse(createSummary(await fetchEastmoneyTop20()), "real");
      cachedResponse = {
        expiresAt: now + CACHE_TTL_MS,
        value: eastmoneyResponse,
      };
      return eastmoneyResponse;
    } catch {
      // Fall through to mock to keep the dashboard available.
    }
  }

  const mockResponse = toResponse(createSummary(MOCK_TOP20), "mock");
  cachedResponse = {
    expiresAt: now + CACHE_TTL_MS,
    value: mockResponse,
  };
  return mockResponse;
}
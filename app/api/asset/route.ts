import { NextRequest, NextResponse } from "next/server";
import { buildAssetViewModel } from "@/lib/dashboard";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!symbol || !name) {
    return NextResponse.json({ message: "symbol and name are required" }, { status: 400 });
  }

  try {
    const asset = await buildAssetViewModel({ symbol, name });
    return NextResponse.json(asset, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
import { NextResponse } from "next/server";
import { runSgcMonitor } from "@/lib/sgc-monitor";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const persist = searchParams.get("persist") === "1";
  const email = searchParams.get("email") === "1";

  try {
    const report = await runSgcMonitor({ persist, email });

    return NextResponse.json(report, {
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

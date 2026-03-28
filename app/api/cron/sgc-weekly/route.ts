import { NextResponse } from "next/server";
import { runSgcMonitor } from "@/lib/sgc-monitor";

export const runtime = "nodejs";
export const revalidate = 0;

function isAuthorized(request: Request): boolean {
  const vercelCron = request.headers.get("x-vercel-cron");
  if (vercelCron) {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.VERCEL === "1";
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runSgcMonitor({ persist: true, email: true });
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

import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";

export const revalidate = 0;

export async function GET() {
  try {
    const payload = await getDashboardData();
    return NextResponse.json(payload, {
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

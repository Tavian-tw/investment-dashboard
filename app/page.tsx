import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardData } from "@/lib/dashboard";
import { getAShareHeatResponse } from "@/lib/market/aShareHeat";

export default async function HomePage() {
  const [dashboard, heat] = await Promise.all([getDashboardData(), getAShareHeatResponse()]);

  return <DashboardClient initialData={dashboard} initialHeat={heat} />;
}
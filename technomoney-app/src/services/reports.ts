import { authApi } from "./http";
import type { MonthlyAccessReport } from "../types/reports";

export async function fetchMonthlyAccessReport(month: string): Promise<MonthlyAccessReport> {
  const params = month ? { month } : undefined;
  const { data } = await authApi.get<MonthlyAccessReport>("/auth/reports/monthly-access", {
    params,
  });
  return data;
}

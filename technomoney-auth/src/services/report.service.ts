import { SessionRepository, SessionDailyCount } from "../repositories/session.repository";

export interface MonthlyAccessReport {
  month: string;
  period: {
    start: string;
    endExclusive: string;
  };
  totals: {
    created: number;
    revoked: number;
  };
  daily: SessionDailyCount[];
}

export class ReportService {
  private sessionRepo: SessionRepository;

  constructor(sessionRepo = new SessionRepository()) {
    this.sessionRepo = sessionRepo;
  }

  async monthlyAccessReport(monthInput?: string): Promise<MonthlyAccessReport> {
    const { start, end, year, month } = this.resolveMonth(monthInput);
    const rows = await this.sessionRepo.getDailyAccessCounts(start, end);
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const byDate = new Map(rows.map((row) => [row.day, row]));

    const daily: SessionDailyCount[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
      const existing = byDate.get(date);
      daily.push({
        day: date,
        created: existing?.created ?? 0,
        revoked: existing?.revoked ?? 0,
      });
    }

    const totals = daily.reduce(
      (acc, cur) => {
        acc.created += cur.created;
        acc.revoked += cur.revoked;
        return acc;
      },
      { created: 0, revoked: 0 }
    );

    return {
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      period: {
        start: start.toISOString(),
        endExclusive: end.toISOString(),
      },
      totals,
      daily,
    };
  }

  private resolveMonth(monthInput?: string) {
    if (monthInput && !/^\d{4}-\d{2}$/.test(monthInput)) {
      const err = new Error("INVALID_MONTH");
      (err as any).code = "INVALID_MONTH";
      throw err;
    }

    const [year, month] = monthInput
      ? monthInput.split("-").map((n) => parseInt(n, 10))
      : [undefined, undefined];
    const resolvedYear = Number.isFinite(year) ? (year as number) : new Date().getUTCFullYear();
    const resolvedMonth = Number.isFinite(month) ? (month as number) - 1 : new Date().getUTCMonth();

    if (resolvedMonth < 0 || resolvedMonth > 11) {
      const err = new Error("INVALID_MONTH");
      (err as any).code = "INVALID_MONTH";
      throw err;
    }

    const start = new Date(Date.UTC(resolvedYear, resolvedMonth, 1));
    const end = new Date(Date.UTC(resolvedYear, resolvedMonth + 1, 1));

    return { start, end, year: resolvedYear, month: resolvedMonth };
  }
}

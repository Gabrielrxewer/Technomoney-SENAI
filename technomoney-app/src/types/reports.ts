export interface DailyAccessEntry {
  day: string;
  created: number;
  revoked: number;
}

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
  daily: DailyAccessEntry[];
}

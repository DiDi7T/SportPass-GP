
import { apiFetch } from "./api";
import { toQuery } from "./absence-review";

export type AbsenceAnalyticsFilters = {
  from: string;
  to: string;
  groupBy: "week" | "month";
};

export type AbsenceAnalyticsResponse = {
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  bySport: {
    sport: string;
    total: number;
  }[];
  timeline: {
    period: string;
    total: number;
  }[];
  groupBy: "week" | "month";
};

export function fetchAdminAbsenceAnalytics(
  filters: AbsenceAnalyticsFilters,
) {
  return apiFetch<AbsenceAnalyticsResponse>(
    `/absence-analytics/admin${toQuery(filters)}`,
  );
}

export function fetchCoachAbsenceAnalytics(
  filters: AbsenceAnalyticsFilters,
) {
  return apiFetch<AbsenceAnalyticsResponse>(
    `/absence-analytics/coach${toQuery(filters)}`,
  );
}

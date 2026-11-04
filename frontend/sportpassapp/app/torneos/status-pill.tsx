import { STATUS_LABELS, type MatchStatus } from "@/lib/tournaments";

export function MatchStatusPill({ status }: { status: MatchStatus }) {
  return <span className={`match-status match-status-${status}`}>{STATUS_LABELS[status]}</span>;
}

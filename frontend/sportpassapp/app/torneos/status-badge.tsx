import { STATUS_LABELS, STATUS_STYLES, type MatchStatus } from "@/lib/tournaments";

export function StatusBadge({ status }: { status: MatchStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}

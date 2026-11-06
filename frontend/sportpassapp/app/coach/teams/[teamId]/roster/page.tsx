import { Suspense } from "react";
import TeamRosterContent from "./team-roster-content";

export default function TeamRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="dashboard-shell">
          <p className="dashboard-loading">Cargando equipo…</p>
        </main>
      }
    >
      <TeamRosterContent params={params} />
    </Suspense>
  );
}
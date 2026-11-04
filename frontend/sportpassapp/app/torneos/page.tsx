"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TYPE_LABELS } from "@/lib/competitions";
import { fetchMatches, formatMatchRange, matchup, type Match } from "@/lib/tournaments";
import { useSession } from "../competencias/session";
import { StatusBadge } from "./status-badge";

export default function TournamentsPage() {
  const { user, signOut } = useSession();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches().then(setMatches).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Programación de partidos</h1>
          <p className="text-sm text-zinc-500">{user.fullName}</p>
        </div>
        <button onClick={signOut} className="text-sm text-zinc-500 hover:underline">Salir</button>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <section aria-label="Partidos" className="space-y-3">
        {matches === null && !error && <p className="text-sm text-zinc-500">Cargando…</p>}
        {matches?.length === 0 && <p className="text-sm text-zinc-500">Aún no hay partidos programados.</p>}
        <ul className="space-y-3">
          {matches?.map((match) => (
            <li key={match.id}>
              <Link
                href={`/torneos/${match.id}`}
                className="block space-y-1 rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className={`font-medium ${match.status === "cancelada" ? "line-through decoration-zinc-400" : ""}`}>{matchup(match)}</p>
                  <StatusBadge status={match.status} />
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{match.tournament}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMatchRange(match)}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{match.venue.name}</p>
                <p className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{match.teams.sport}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-950 dark:text-blue-300">{TYPE_LABELS[match.type]}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

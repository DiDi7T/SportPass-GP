"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { TYPE_LABELS } from "@/lib/competitions";
import { fetchMatch, formatMatchRange, type Match } from "@/lib/tournaments";
import { StatusBadge } from "../status-badge";

// Con cacheComponents el id solo se conoce al pedir la página, así que useParams necesita Suspense.
export default function MatchPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-zinc-500">Cargando…</p>}>
      <MatchDetail />
    </Suspense>
  );
}

function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Un id mal formado (400) es, para quien navega, lo mismo que uno inexistente (404).
    fetchMatch(id)
      .then(setMatch)
      .catch((err) => setError(err instanceof ApiError && err.status === 400 ? "Partido no encontrado." : err.message));
  }, [id]);

  return (
    <div className="space-y-6">
      <Link href="/torneos" className="text-sm text-blue-700 hover:underline dark:text-blue-400">← Volver a la programación</Link>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
      {!match && !error && <p className="text-sm text-zinc-500">Cargando…</p>}

      {match && (
        <article className="space-y-5">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={match.status} />
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">{TYPE_LABELS[match.type]}</span>
            </div>
            <h1 className="text-2xl font-semibold">{match.tournament}</h1>
            <p className="text-sm text-zinc-500">{match.teams.sport}</p>
          </header>

          <dl className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            <Row label="Equipos">
              {match.teams.icesi} vs {match.teams.opponent ?? <span className="text-zinc-500">Rival por confirmar</span>}
            </Row>
            <Row label="Fecha y hora">{formatMatchRange(match)}</Row>
            <Row label="Escenario">{match.venue.name}</Row>
            <Row label="Dirección">
              {match.venue.address ? (
                <>
                  {match.venue.address}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-sm text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Ver en el mapa
                  </a>
                </>
              ) : (
                <span className="text-zinc-500">No disponible</span>
              )}
            </Row>
          </dl>
        </article>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 p-4 sm:grid-cols-3">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="sm:col-span-2">{children}</dd>
    </div>
  );
}

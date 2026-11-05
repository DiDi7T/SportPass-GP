"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  CallupAthlete,
  CompetitionCallup,
  fetchCompetitionCallup,
  saveCompetitionCallup,
} from "@/lib/competitions";

type Props = {
  params?: Promise<{
    competitionId: string;
  }>;
  competitionId?: string;
};

export default function ConvocatoriaContent({
  params,
  competitionId: propCompetitionId,
}: Props = {}) {
  const unwrappedParams = params ? use(params) : undefined;
  const routeParams = useParams<{ competitionId: string }>();
  const competitionId =
    propCompetitionId ??
    unwrappedParams?.competitionId ??
    routeParams?.competitionId ??
    "";

  const [data, setData] = useState<CompetitionCallup | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!competitionId) return;

    let active = true;

    async function loadCallup() {
      try {
        setLoading(true);
        setError("");

        const response = await fetchCompetitionCallup(competitionId);

        if (!active) return;

        setData(response);
        setSelectedIds(
          response.athletes
            .filter((athlete) => athlete.calledUp)
            .map((athlete) => athlete.id),
        );
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar la convocatoria.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCallup();

    return () => {
      active = false;
    };
  }, [competitionId]);

  const toggleAthlete = (athleteId: string) => {
    setSelectedIds((current) =>
      current.includes(athleteId)
        ? current.filter((id) => id !== athleteId)
        : [...current, athleteId],
    );

    setSuccess("");
  };

  const selectAll = () => {
    if (!data) return;

    setSelectedIds(data.athletes.map((athlete) => athlete.id));
    setSuccess("");
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSuccess("");
  };

  const handleSave = async () => {
    if (!competitionId) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await saveCompetitionCallup(competitionId, {
        athleteIds: selectedIds,
      });

      setData(response);
      setSelectedIds(
        response.athletes
          .filter((athlete) => athlete.calledUp)
          .map((athlete) => athlete.id),
      );

      setSuccess("La convocatoria se guardó correctamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar la convocatoria.",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredAthletes = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    if (!term) return data.athletes;

    return data.athletes.filter((athlete) => {
      const fullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
      return (
        fullName.includes(term) ||
        athlete.studentCode.toLowerCase().includes(term) ||
        athlete.email.toLowerCase().includes(term)
      );
    });
  }, [data, search]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Link href="/competencias" className="back-link">
          ← Volver a competencias
        </Link>
        <p className="admin-loading">Cargando convocatoria y deportistas…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link href="/competencias" className="back-link">
          ← Volver a competencias
        </Link>

        <div className="roster-alert roster-alert-error">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const allSelected =
    data.athletes.length > 0 &&
    selectedIds.length === data.athletes.length;

  return (
    <div className="space-y-6">
      <Link href="/competencias" className="back-link">
        ← Volver a competencias
      </Link>

      <section className="coach-teams-header !px-0 !py-0 !border-0 bg-transparent">
        <div>
          <p className="eyebrow">SPORTPASS · GESTIÓN DE CONVOCATORIA</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-(--ink)">
            {data.competitionName}
          </h1>
          <p className="mt-1 text-sm text-(--muted)">
            Selecciona los deportistas del equipo que participarán en esta competencia.
          </p>
        </div>

        <div className="coach-teams-count text-center">
          <strong className="text-xl font-bold text-(--icesi)">
            {selectedIds.length}
          </strong>
          <span className="block text-[11px] text-(--muted)">
            Convocados de {data.athletes.length}
          </span>
        </div>
      </section>

      {error && (
        <div className="roster-alert roster-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="roster-alert roster-alert-success">
          {success}
        </div>
      )}

      <section className="rounded-xl border border-(--line) bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-(--line) p-5 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-(--ink)">
              Integrantes del equipo
            </h2>
            <p className="mt-0.5 text-xs text-(--muted)">
              {data.athletes.length}{" "}
              {data.athletes.length === 1
                ? "deportista registrado"
                : "deportistas registrados"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={data.athletes.length === 0 || allSelected}
              className="btn-secondary !text-xs !py-1.5 !px-3 disabled:opacity-50"
            >
              Seleccionar todos
            </button>

            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedIds.length === 0}
              className="btn-secondary !text-xs !py-1.5 !px-3 disabled:opacity-50"
            >
              Limpiar selección
            </button>
          </div>
        </div>

        {data.athletes.length > 5 && (
          <div className="p-4 border-b border-(--line) bg-white">
            <div className="roster-search !mb-0 !max-w-none">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar deportista por nombre, código o correo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        )}

        {data.athletes.length === 0 ? (
          <div className="coach-empty-state !m-0 !border-0 !rounded-none">
            <div className="coach-empty-icon">♜</div>
            <h3>No hay integrantes registrados en este equipo</h3>
            <p>
              Primero debes incorporar deportistas al equipo desde el módulo de gestión de integrantes.
            </p>
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div className="coach-empty-state !m-0 !border-0 !rounded-none">
            <div className="coach-empty-icon">⌕</div>
            <h3>No encontramos deportistas</h3>
            <p>Intenta buscar con otro nombre, código o correo.</p>
          </div>
        ) : (
          <div className="divide-y divide-(--line)">
            {filteredAthletes.map((athlete) => (
              <AthleteRow
                key={athlete.id}
                athlete={athlete}
                checked={selectedIds.includes(athlete.id)}
                onToggle={() => toggleAthlete(athlete.id)}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-(--line) p-5 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <p className="text-xs font-medium text-(--muted)">
            <span className="font-bold text-(--ink)">{selectedIds.length}</span> de{" "}
            <span className="font-bold text-(--ink)">{data.athletes.length}</span>{" "}
            deportistas seleccionados para la convocatoria
          </p>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary !min-h-10 !px-6 !text-xs !py-2.5 font-bold"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando convocatoria…
              </span>
            ) : (
              "Guardar convocatoria"
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

type AthleteRowProps = {
  athlete: CallupAthlete;
  checked: boolean;
  onToggle: () => void;
};

function AthleteRow({ athlete, checked, onToggle }: AthleteRowProps) {
  return (
    <label className="flex cursor-pointer items-center gap-4 p-4 transition hover:bg-slate-50 sm:px-5">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-(--icesi) focus:ring-(--icesi) accent-[#5454e9]"
        checked={checked}
        onChange={onToggle}
      />

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--lavender) text-xs font-bold text-(--icesi)">
        {athlete.firstName.charAt(0)}
        {athlete.lastName.charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-(--ink)">
          {athlete.firstName} {athlete.lastName}
        </p>

        <p className="truncate text-xs text-(--muted)">
          {athlete.studentCode} · {athlete.email}
        </p>
      </div>

      {checked ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#ccebd8] bg-[#f1fbf5] px-2.5 py-0.5 text-[11px] font-semibold text-[#247447]">
          <span>✓</span> Convocado
        </span>
      ) : (
        <span className="text-xs text-(--muted) hidden sm:inline">
          No convocado
        </span>
      )}
    </label>
  );
}

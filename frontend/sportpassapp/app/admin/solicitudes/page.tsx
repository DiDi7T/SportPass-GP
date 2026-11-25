"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleNavbar from "@/components/role-navbar";
import AbsenceRequestDetail, { StatusBadge } from "@/components/absence-request-detail";
import { useRoleSession } from "@/lib/use-role-session";
import {
  exportAdminRequests,
  fetchAdminFilterOptions,
  fetchAdminRequest,
  fetchAdminRequests,
  formatDay,
  STATUS_OPTIONS,
  type AdminFilterOptions,
  type AdminFilters,
  type FilterOption,
  type ReviewedAbsenceRequest,
} from "@/lib/absence-review";

const HISTORY_PERMISSION = "absence-requests:history";
const EMPTY_FILTERS: AdminFilters = { teamId: "", athleteId: "", competitionId: "", teacherEmail: "", status: "", from: "", to: "" };
const NO_OPTIONS: AdminFilterOptions = { teams: [], athletes: [], competitions: [], teachers: [] };
const inputClass = "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

type Result = { key: string; requests: ReviewedAbsenceRequest[]; error: string };

export default function AdminRequestsHistoryPage() {
  const { session, logout, handleAuthError } = useRoleSession();
  const canView = session?.user.permissions.includes(HISTORY_PERMISSION) ?? false;

  const [filters, setFilters] = useState<AdminFilters>(EMPTY_FILTERS);
  const [options, setOptions] = useState<AdminFilterOptions>(NO_OPTIONS);
  const [result, setResult] = useState<Result | null>(null);
  const [detail, setDetail] = useState<ReviewedAbsenceRequest | null>(null);
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtersKey = JSON.stringify(filters);
  const loading = result?.key !== filtersKey;
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  useEffect(() => {
    if (!canView) return;
    fetchAdminFilterOptions().then(setOptions).catch(handleAuthError);
  }, [canView, handleAuthError]);

  useEffect(() => {
    if (!canView || invalidRange) return;
    let current = true;
    fetchAdminRequests(JSON.parse(filtersKey) as AdminFilters)
      .then((requests) => current && setResult({ key: filtersKey, requests, error: "" }))
      .catch((error) => {
        handleAuthError(error);
        if (current) setResult({ key: filtersKey, requests: [], error: error instanceof Error ? error.message : "No fue posible cargar el historial." });
      });
    return () => {
      current = false;
    };
  }, [canView, filtersKey, invalidRange, handleAuthError]);

  async function openDetail(id: string) {
    setNotice("");
    try {
      setDetail(await fetchAdminRequest(id));
    } catch (error) {
      handleAuthError(error);
      setNotice(error instanceof Error ? error.message : "No fue posible abrir la solicitud.");
    }
  }

  async function exportToExcel() {
    setExporting(true);
    setNotice("");
    try {
      await exportAdminRequests(filters);
    } catch (error) {
      handleAuthError(error);
      setNotice(error instanceof Error ? error.message : "No fue posible exportar el historial.");
    } finally {
      setExporting(false);
    }
  }

  const setFilter = (field: keyof AdminFilters) => (event: { target: { value: string } }) =>
    setFilters((current) => ({ ...current, [field]: event.target.value }));

  const select = (field: keyof AdminFilters, label: string, all: string, items: FilterOption[]) => (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select className={inputClass} value={filters[field]} onChange={setFilter(field)}>
        <option value="">{all}</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
  );

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando…</p>
      </main>
    );
  }

  const requests = result?.requests ?? [];
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <main className="role-page admin-management-page min-h-screen bg-slate-50/50">
      <RoleNavbar role={session.user.roles[0]} fullName={session.user.fullName} onLogout={logout} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Ruta" className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin" className="hover:text-blue-700">Inicio</Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-slate-800">Historial de solicitudes</span>
        </nav>

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Historial general</h1>
            <p className="mt-1 text-sm text-slate-600">Solicitudes de ausencia de todos los equipos representativos. Solo consulta.</p>
          </div>
          {canView && (
            <button type="button" className="primary-button" onClick={exportToExcel} disabled={exporting || loading || invalidRange || requests.length === 0}>
              {exporting ? "Exportando…" : "Exportar"} <span aria-hidden="true">↓</span>
            </button>
          )}
        </header>

        {!canView ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Tu cuenta no tiene permiso para consultar el historial de solicitudes.</p>
        ) : (
          <>
            <section aria-label="Filtros" className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              {select("teamId", "Equipo", "Todos los equipos", options.teams)}
              {select("athleteId", "Deportista", "Todos los deportistas", options.athletes)}
              {select("competitionId", "Competencia", "Todas las competencias", options.competitions)}
              {select("teacherEmail", "Profesor", "Todos los profesores", options.teachers)}
              {select("status", "Estado", "Todos los estados", STATUS_OPTIONS.map((status) => ({ id: status.value, label: status.label })))}
              <label className="text-sm font-medium text-slate-700">
                Clase desde
                <input type="date" className={inputClass} value={filters.from} max={filters.to || undefined} onChange={setFilter("from")} />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Clase hasta
                <input type="date" className={inputClass} value={filters.to} min={filters.from || undefined} onChange={setFilter("to")} />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  disabled={!hasFilters}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Limpiar filtros
                </button>
              </div>
            </section>

            {invalidRange && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">La fecha inicial no puede ser posterior a la fecha final.</p>}
            {result?.error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{result.error}</p>}
            {notice && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{notice}</p>}

            <section aria-label="Resultados" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
                <h2 className="text-lg font-bold text-slate-900">Solicitudes</h2>
                {!loading && !invalidRange && <p className="text-sm text-slate-500">{requests.length} resultados</p>}
              </div>

              {invalidRange ? null : loading ? (
                <p className="p-6 text-sm text-slate-500">Cargando historial…</p>
              ) : requests.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">{hasFilters ? "Ninguna solicitud coincide con los filtros." : "Aún no hay solicitudes registradas."}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Deportista</th>
                        <th className="px-4 py-3 font-semibold">Equipo</th>
                        <th className="px-4 py-3 font-semibold">Competencia</th>
                        <th className="px-4 py-3 font-semibold">Clase</th>
                        <th className="px-4 py-3 font-semibold">Profesor</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                        <th className="px-4 py-3"><span className="sr-only">Detalle</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {requests.map((request) => (
                        <tr key={request.id} className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-900">{request.athlete.fullName}</td>
                          <td className="px-4 py-3 text-slate-600">{request.competition.team.name}</td>
                          <td className="px-4 py-3 text-slate-600">{request.competition.name}</td>
                          <td className="px-4 py-3 text-slate-600">{request.subjectName}<span className="block text-xs text-slate-500">{formatDay(request.trainingDate)} · {request.startTime} – {request.endTime}</span></td>
                          <td className="px-4 py-3 text-slate-600">{request.teacherName}</td>
                          <td className="px-4 py-3"><StatusBadge status={request.status} label={request.statusLabel} /></td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => openDetail(request.id)} className="font-semibold text-blue-700 hover:underline">Ver detalle</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {detail && <AbsenceRequestDetail request={detail} audience="admin" onClose={() => setDetail(null)} />}
    </main>
  );
}

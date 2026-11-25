"use client";

import { useEffect, useState } from "react";
import RoleNavbar from "@/components/role-navbar";
import AbsenceRequestDetail, { StatusBadge } from "@/components/absence-request-detail";
import { useRoleSession } from "@/lib/use-role-session";
import {
  fetchTeacherCourses,
  fetchTeacherRequest,
  fetchTeacherRequests,
  formatDay,
  STATUS_OPTIONS,
  type ReviewedAbsenceRequest,
  type TeacherFilters,
} from "@/lib/absence-review";

const REVIEW_PERMISSION = "absence-requests:review";
const EMPTY_FILTERS: TeacherFilters = { course: "", status: "", date: "" };
const selectClass = "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

type Result = { key: string; requests: ReviewedAbsenceRequest[]; error: string };

export default function TeacherRequestsPage() {
  const { session, logout, handleAuthError } = useRoleSession();
  const canReview = session?.user.permissions.includes(REVIEW_PERMISSION) ?? false;

  const [filters, setFilters] = useState<TeacherFilters>(EMPTY_FILTERS);
  const [courses, setCourses] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [detail, setDetail] = useState<ReviewedAbsenceRequest | null>(null);
  const [detailError, setDetailError] = useState("");

  const filtersKey = JSON.stringify(filters);
  const loading = result?.key !== filtersKey;

  useEffect(() => {
    if (!canReview) return;
    fetchTeacherCourses().then(setCourses).catch(handleAuthError);
  }, [canReview, handleAuthError]);

  useEffect(() => {
    if (!canReview) return;
    let current = true;
    fetchTeacherRequests(JSON.parse(filtersKey) as TeacherFilters)
      .then((requests) => current && setResult({ key: filtersKey, requests, error: "" }))
      .catch((error) => {
        handleAuthError(error);
        if (current) setResult({ key: filtersKey, requests: [], error: error instanceof Error ? error.message : "No fue posible cargar las solicitudes." });
      });
    return () => {
      current = false;
    };
  }, [canReview, filtersKey, handleAuthError]);

  async function openDetail(id: string) {
    setDetailError("");
    try {
      setDetail(await fetchTeacherRequest(id));
    } catch (error) {
      handleAuthError(error);
      setDetailError(error instanceof Error ? error.message : "No fue posible abrir la solicitud.");
    }
  }

  const setFilter = (field: keyof TeacherFilters) => (event: { target: { value: string } }) =>
    setFilters((current) => ({ ...current, [field]: event.target.value }));

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando…</p>
      </main>
    );
  }

  const requests = result?.requests ?? [];
  const pending = requests.filter((request) => request.status === "pending_coach_approval").length;
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <main className="role-page admin-management-page min-h-screen bg-slate-50/50">
      <RoleNavbar role={session.user.roles[0]} fullName={session.user.fullName} onLogout={logout} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Profesor</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Solicitudes</h1>
          <p className="mt-1 text-sm text-slate-600">Avisos de ausencia de los deportistas inscritos en los cursos que dictas.</p>
        </header>

        {!canReview ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Tu cuenta no tiene permiso para revisar solicitudes.</p>
        ) : (
          <>
            <section aria-label="Filtros" className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:items-end">
              <label className="text-sm font-medium text-slate-700">
                Curso
                <select className={selectClass} value={filters.course} onChange={setFilter("course")}>
                  <option value="">Todos mis cursos</option>
                  {courses.map((course) => <option key={course} value={course}>{course}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Estado
                <select className={selectClass} value={filters.status} onChange={setFilter("status")}>
                  <option value="">Todos los estados</option>
                  {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Fecha de la clase
                <input type="date" className={selectClass} value={filters.date} onChange={setFilter("date")} />
              </label>
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                disabled={!hasFilters}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Limpiar filtros
              </button>
            </section>

            {result?.error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{result.error}</p>}
            {detailError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{detailError}</p>}

            <section aria-label="Bandeja de solicitudes" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
                <h2 className="text-lg font-bold text-slate-900">Bandeja</h2>
                {!loading && <p className="text-sm text-slate-500">{requests.length} solicitudes · {pending} pendientes</p>}
              </div>

              {loading ? (
                <p className="p-6 text-sm text-slate-500">Cargando solicitudes…</p>
              ) : requests.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">{hasFilters ? "Ninguna solicitud coincide con los filtros." : "No tienes solicitudes de tus cursos."}</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {requests.map((request) => (
                    <li key={request.id}>
                      <button
                        type="button"
                        onClick={() => openDetail(request.id)}
                        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                      >
                        <span className="min-w-0 space-y-1">
                          <span className="block font-semibold text-slate-900">{request.athlete.fullName}</span>
                          <span className="block text-sm text-slate-600">{request.subjectName} · clase del {formatDay(request.trainingDate)}, {request.startTime} – {request.endTime}</span>
                          <span className="block text-xs text-slate-500">Competencia: {request.competition.name} · {formatDay(request.competition.startDate)}</span>
                        </span>
                        <StatusBadge status={request.status} label={request.statusLabel} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {detail && <AbsenceRequestDetail request={detail} audience="teacher" onClose={() => setDetail(null)} />}
    </main>
  );
}

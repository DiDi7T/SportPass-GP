"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleNavbar from "@/components/role-navbar";
import AbsenceRequestDetail, { StatusBadge } from "@/components/absence-request-detail";
import { useRoleSession } from "@/lib/use-role-session";
import {
  fetchCoachRequest,
  fetchCoachRequests,
  formatDay,
  type ReviewedAbsenceRequest,
} from "@/lib/absence-review";

const INBOX_PERMISSION = "permissions:manage";
const PENDING_STATUS = "pending_coach_approval";

type Result = { requests: ReviewedAbsenceRequest[]; error: string };

export default function CoachRequestsInboxPage() {
  const { session, logout, handleAuthError } = useRoleSession();
  const isCoach = session?.user.roles.includes("coach") ?? false;
  const canView = isCoach && (session?.user.permissions.includes(INBOX_PERMISSION) ?? false);

  const [result, setResult] = useState<Result | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);
  const [detail, setDetail] = useState<ReviewedAbsenceRequest | null>(null);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!canView) return;
    let current = true;
    fetchCoachRequests()
      .then((requests) => current && setResult({ requests, error: "" }))
      .catch((error) => {
        handleAuthError(error);
        if (current) setResult({ requests: [], error: error instanceof Error ? error.message : "No fue posible cargar las solicitudes." });
      });
    return () => {
      current = false;
    };
  }, [canView, handleAuthError]);

  async function openDetail(id: string) {
    setDetailError("");
    try {
      setDetail(await fetchCoachRequest(id));
    } catch (error) {
      handleAuthError(error);
      setDetailError(error instanceof Error ? error.message : "No fue posible abrir la solicitud.");
    }
  }

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando…</p>
      </main>
    );
  }

  const all = result?.requests ?? [];
  const pendingCount = all.filter((request) => request.status === PENDING_STATUS).length;
  // El backend ya entrega el orden de CA3: pendientes primero, desde el entrenamiento más próximo.
  const requests = onlyPending ? all.filter((request) => request.status === PENDING_STATUS) : all;

  return (
    <main className="role-page admin-management-page min-h-screen bg-slate-50/50">
      <RoleNavbar role={session.user.roles[0]} fullName={session.user.fullName} onLogout={logout} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Ruta" className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/coach" className="hover:text-blue-700">Inicio</Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-slate-800">Solicitudes</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Solicitudes de ausencia</h1>
          <p className="mt-1 text-sm text-slate-600">
            Avisos de los deportistas de tu disciplina. Verifica que estén convocados y que tengan entrenamiento en ese horario.
          </p>
        </header>

        {!canView ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Solo los entrenadores pueden consultar esta bandeja.</p>
        ) : (
          <>
            {result?.error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{result.error}</p>}
            {detailError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{detailError}</p>}

            <section aria-label="Bandeja de solicitudes" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Bandeja</h2>
                  {result && <p className="text-sm text-slate-500">{pendingCount} pendientes de {all.length} solicitudes</p>}
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" className="h-4 w-4 accent-blue-700" checked={onlyPending} onChange={(event) => setOnlyPending(event.target.checked)} />
                  Ver solo pendientes
                </label>
              </div>

              {!result ? (
                <p className="p-6 text-sm text-slate-500">Cargando solicitudes…</p>
              ) : requests.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">{onlyPending ? "No tienes solicitudes pendientes." : "Aún no hay solicitudes de los deportistas de tu disciplina."}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Deportista</th>
                        <th className="px-4 py-3 font-semibold">Competencia</th>
                        <th className="px-4 py-3 font-semibold">Entrenamiento</th>
                        <th className="px-4 py-3 font-semibold">Asignatura afectada</th>
                        <th className="px-4 py-3 font-semibold">Correo del docente</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                        <th className="px-4 py-3"><span className="sr-only">Detalle</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {requests.map((request) => (
                        <tr key={request.id} className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {request.athlete.fullName}
                            {!request.officialCallup && <span className="mt-1 block text-xs font-normal text-amber-700">Sin convocatoria registrada</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{request.competition.name}<span className="block text-xs text-slate-500">{request.competition.team.name}</span></td>
                          <td className="px-4 py-3 text-slate-600">{formatDay(request.trainingDate)}<span className="block text-xs text-slate-500">{request.startTime} – {request.endTime}</span></td>
                          <td className="px-4 py-3 text-slate-600">{request.subjectName}</td>
                          <td className="px-4 py-3 text-slate-600">{request.teacherEmail}</td>
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

      {detail && <AbsenceRequestDetail request={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}

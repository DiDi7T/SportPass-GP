'use client';

import { useState } from 'react';
import { fetchAcademicConflicts, type ConflictsResponse } from '@/lib/academic-conflicts';

export default function AcademicConflictsPanel({ competitionId }: { competitionId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConflictsResponse | null>(null);
  const [error, setError] = useState('');

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true); setError(''); setData(null);
    try { setData(await fetchAcademicConflicts(competitionId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'No fue posible consultar los cruces.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="mt-4 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" style={{ gridColumn: "1 / -1" }} onClick={event => event.stopPropagation()}>
      <button type="button" onClick={toggle} aria-expanded={open}
        className="font-semibold text-blue-900 underline-offset-2 hover:underline">
        {open ? 'Ocultar cruces con clases' : 'Consultar cruces con mis clases'}
      </button>
      {open && (
        <div className="mt-3">
          {loading && <p role="status">Consultando tu horario académico…</p>}
          {error && <p role="alert" className="text-red-700">{error}</p>}
          {data && <>
            <p role="status" className="text-slate-700">{data.message}</p>
            {data.conflicts.length > 0 && <ul className="mt-3 space-y-3">
              {data.conflicts.map(clash => <li key={clash.classSessionId} className="rounded-lg border border-amber-200 bg-white p-3">
                <strong className="block text-slate-900">{clash.subjectName}</strong>
                <span className="block">Código {clash.subjectCode} · NRC {clash.nrc}</span>
                <span className="block">Profesor(a): {clash.teacher.fullName}</span>
                <a className="break-all font-medium text-blue-800 underline" href={`mailto:${clash.teacher.email}`}>{clash.teacher.email}</a>
                <span className="mt-1 block text-xs text-slate-600">
                  {new Date(clash.startsAt).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}
                  {' – '}
                  {new Date(clash.endsAt).toLocaleString('es-CO', { timeZone: 'America/Bogota', timeStyle: 'short' })}
                </span>
              </li>)}
            </ul>}
          </>}
        </div>
      )}
    </div>
  );
}

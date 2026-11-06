"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import RoleNavbar from "@/components/role-navbar";
import { ApiError } from "@/lib/api";
import {
  checkInByDocument,
  fetchMySports,
  fetchParticipants,
  formatToday,
  markAttendance,
  normalizeName,
  type CoachSport,
  type Participant,
} from "@/lib/attendance";
import { dashboardPath } from "@/lib/auth";
import { useRoleSession } from "@/lib/use-role-session";

type Notice = { kind: "success" | "error"; text: string };

export default function AttendancePage() {
  const { session, logout, handleAuthError } = useRoleSession();
  const [sports, setSports] = useState<CoachSport[] | null>(null);
  const [sportId, setSportId] = useState("");
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [documentNumber, setDocumentNumber] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [search, setSearch] = useState("");
  const [marking, setMarking] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchMySports()
      .then((result) => {
        setSports(result);
        setSportId((current) => current || result[0]?.id || "");
      })
      .catch((err) => {
        handleAuthError(err);
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!sportId) return;
    fetchParticipants(sportId)
      .then(setParticipants)
      .catch((err) => {
        handleAuthError(err);
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportId]);

  const filtered = useMemo(() => {
    const term = normalizeName(search);
    return (participants ?? []).filter((participant) => normalizeName(participant.fullName).includes(term));
  }, [participants, search]);
  // Al cambiar de deporte se limpia la vista anterior; el efecto carga los participantes nuevos.
  function selectSport(id: string) {
    setParticipants(null);
    setNotice(null);
    setRowError(null);
    setSearch("");
    setSportId(id);
  }

  const presentCount =participants?.filter((participant) => participant.presentToday).length ?? 0;

  // Agrega o actualiza al participante en la lista y lo deja como "Presente".
  function upsertPresent(participant: Participant) {
    setParticipants((current) => {
      const others = (current ?? []).filter((item) => item.id !== participant.id);
      return [...others, { ...participant, presentToday: true }].sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
    });
  }

  // CA1 / CA2: primera vez, por cédula.
  async function submitDocument(event: FormEvent) {
    event.preventDefault();
    const value = documentNumber.trim();
    if (!value || checkingIn) return;
    setCheckingIn(true);
    setNotice(null);
    try {
      const { participant, newParticipant } = await checkInByDocument(sportId, value);
      upsertPresent(participant);
      setDocumentNumber("");
      setNotice({
        kind: "success",
        text: newParticipant
          ? `${participant.fullName} ya hace parte de los participantes y su asistencia de hoy quedó marcada.`
          : `Asistencia de hoy registrada para ${participant.fullName}.`,
      });
    } catch (err) {
      handleAuthError(err);
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "No fue posible registrar la asistencia." });
    } finally {
      setCheckingIn(false);
    }
  }

  // CA3 / CA4: recurrentes, un clic.
  async function mark(participant: Participant) {
    if (participant.presentToday || marking) return;
    setMarking(participant.id);
    setRowError(null);
    try {
      const result = await markAttendance(sportId, participant.id);
      upsertPresent(result.participant);
    } catch (err) {
      handleAuthError(err);
      // CA4: si otro dispositivo ya lo marcó, se muestra como "Presente".
      if (err instanceof ApiError && err.status === 409) upsertPresent(participant);
      else setRowError({ id: participant.id, text: err instanceof Error ? err.message : "No fue posible marcar la asistencia." });
    } finally {
      setMarking(null);
    }
  }

  if (!session) {
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando la asistencia…</p>
      </main>
    );
  }
  const role = session.user.roles[0];
  const sportName = sports?.find((sport) => sport.id === sportId)?.name ?? "";

  return (
    <main className="role-page tournaments-page">
      <RoleNavbar role={role} fullName={session.user.fullName} onLogout={logout} />
      <section className="tournaments-content">
        <Link className="back-link" href={dashboardPath(role)}>← Volver a mi inicio</Link>

        <div className="admin-page-heading">
          <div>
            <p className="eyebrow">SPORTPASS · ASISTENCIA</p>
            <h1>Asistencia a entrenamientos</h1>
            <p>Entrenamiento de hoy: {formatToday()}</p>
          </div>
          {participants && (
            <span className="role-chip">{presentCount} de {participants.length} presentes</span>
          )}
        </div>

        {error && <p role="alert" className="admin-error">{error}</p>}
        {sports === null && !error && <p className="admin-loading">Cargando tus deportes…</p>}
        {sports?.length === 0 && (
          <p className="admin-loading">No tienes equipos a cargo. Pide a un administrador que te asigne como entrenador de un equipo.</p>
        )}

        {sports && sports.length > 1 && (
          <label className="attendance-sport-select">
            <span>Deporte</span>
            <select className="input" value={sportId} onChange={(event) => selectSport(event.target.value)}>
              {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
            </select>
          </label>
        )}

        {sportId && (
          <div className="attendance-layout">
            {/* CA1 / CA2 */}
            <section className="admin-panel attendance-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>¿Primera vez en {sportName}?</h2>
                  <p>Busca al estudiante por su cédula. Si está en la lista oficial, se agregará a los participantes con la asistencia de hoy.</p>
                </div>
              </div>
              <form className="attendance-checkin" onSubmit={submitDocument}>
                <label className="sr-only" htmlFor="document">Cédula</label>
                <input
                  id="document"
                  className="input"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ej. 1107012345"
                  value={documentNumber}
                  maxLength={40}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                />
                <button className="btn-primary" disabled={!documentNumber.trim() || checkingIn}>
                  {checkingIn ? "Registrando…" : "Registrar asistencia"}
                </button>
              </form>
              {notice && (
                <p role={notice.kind === "error" ? "alert" : "status"} className={notice.kind === "error" ? "admin-error" : "admin-notice"}>
                  {notice.text}
                </p>
              )}
            </section>

            {/* CA3 / CA4 */}
            <section className="admin-panel attendance-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Participantes de {sportName}</h2>
                  <p>Busca por nombre y marca la asistencia con un clic.</p>
                </div>
              </div>
              <input
                className="input attendance-search"
                type="search"
                placeholder="Buscar por nombre"
                aria-label="Buscar participante por nombre"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {participants === null && <p className="admin-loading">Cargando participantes…</p>}
              {participants?.length === 0 && (
                <p className="admin-loading">Aún no hay participantes. Registra al primero con su cédula.</p>
              )}
              {participants && participants.length > 0 && filtered.length === 0 && (
                <p className="admin-loading">Ningún participante coincide con “{search}”.</p>
              )}
              <ul className="attendance-list" aria-label={`Participantes de ${sportName}`}>
                {filtered.map((participant) => (
                  <li key={participant.id} className={participant.presentToday ? "is-present" : undefined}>
                    <span className="attendance-person">
                      <span className="avatar" aria-hidden="true">{participant.fullName.charAt(0)}</span>
                      <span>
                        <strong>{participant.fullName}</strong>
                        <small>Código {participant.studentCode}</small>
                        {rowError?.id === participant.id && <small className="attendance-row-error">{rowError.text}</small>}
                      </span>
                    </span>
                    {participant.presentToday ? (
                      <span className="match-status match-status-programada" aria-label={`${participant.fullName}: presente`}>✓ Presente</span>
                    ) : (
                      <button
                        className="btn-secondary"
                        onClick={() => mark(participant)}
                        disabled={marking !== null}
                        aria-label={`Marcar asistencia de ${participant.fullName}`}
                      >
                        {marking === participant.id ? "Marcando…" : "Marcar"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

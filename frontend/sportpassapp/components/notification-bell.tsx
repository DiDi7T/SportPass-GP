"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchMyNotifications,
  markMyNotificationAsRead,
  type NotificationItem,
} from "@/lib/notifications";
import { useRoleSession } from "@/lib/use-role-session";

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default function NotificationBell() {
  const router = useRouter();
  const { handleAuthError } = useRoleSession();
  const anchor = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchMyNotifications();
      setItems(result.items);
      setUnreadCount(result.unreadCount);
      setError("");
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar tus notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchor.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function openRequest(item: NotificationItem) {
    setOpeningId(item.id);
    setError("");
    try {
      const updated = await markMyNotificationAsRead(item.id);
      setItems((current) => current.map((notification) =>
        notification.id === item.id ? { ...notification, readAt: updated.readAt } : notification
      ));
      if (!item.readAt) setUnreadCount((count) => Math.max(0, count - 1));
      setOpen(false);
      router.push("/mis-competencias/solicitudes/" + item.requestId);
    } catch (err) {
      handleAuthError(err);
      setError(err instanceof Error ? err.message : "No fue posible abrir esta solicitud.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="notification-center" ref={anchor}>
      <button
        type="button"
        className="notification-trigger"
        aria-label={unreadCount ? "Notificaciones, " + unreadCount + " sin leer" : "Notificaciones"}
        aria-expanded={open}
        aria-controls="athlete-notifications"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void refresh();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          className="notification-popover"
          id="athlete-notifications"
          aria-label="Notificaciones del deportista"
        >
          <header className="notification-popover-heading">
            <div>
              <p className="eyebrow">SPORTPASS · AVISOS</p>
              <h2>Notificaciones</h2>
            </div>
            {unreadCount > 0 && (
              <span className="notification-unread-summary">{unreadCount} sin leer</span>
            )}
          </header>

          {error && (
            <div className="notification-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => void refresh()}>Reintentar</button>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className="notification-state">Cargando notificaciones…</p>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="notification-empty">
              <span className="notification-empty-icon" aria-hidden="true">✓</span>
              <strong>Todo al día</strong>
              <p>Cuando tu entrenador responda una solicitud, te avisaremos aquí.</p>
            </div>
          )}

          {items.length > 0 && (
            <ul className="notification-list">
              {items.map((item) => {
                const rejected = item.type === "request_rejected";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={"notification-item" + (item.readAt ? "" : " is-unread")}
                      onClick={() => void openRequest(item)}
                      disabled={openingId === item.id}
                    >
                      <span className={"notification-item-icon" + (rejected ? " is-rejected" : " is-approved")} aria-hidden="true">
                        {rejected ? "!" : "✓"}
                      </span>
                      <span className="notification-item-copy">
                        <span className="notification-item-topline">
                          <strong>{rejected ? "Solicitud rechazada" : "Solicitud aprobada"}</strong>
                          {!item.readAt && <i aria-label="No leída" />}
                        </span>
                        <span className="notification-item-message">{item.message}</span>
                        <time dateTime={item.createdAt}>{DATE_FORMAT.format(new Date(item.createdAt))}</time>
                      </span>
                      <span className="notification-item-arrow" aria-hidden="true">
                        {openingId === item.id ? "…" : "›"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <footer className="notification-popover-footer">
            <span>Los avisos se actualizan automáticamente</span>
            <button type="button" onClick={() => void refresh()} disabled={loading}>Actualizar</button>
          </footer>
        </section>
      )}
    </div>
  );
}

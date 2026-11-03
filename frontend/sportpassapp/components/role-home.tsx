"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiUrl,
  dashboardPath,
  getSession,
  Role,
  roleNames,
  SESSION_KEY,
  Session,
} from "@/lib/auth";

const copy: Record<Role, { title: string; description: string; icon: string }> =
  {
    athlete: {
      title: "Tu vida deportiva empieza aquí",
      description:
        "Pronto podrás consultar tus actividades, horarios y logros.",
      icon: "↗",
    },
    coach: {
      title: "Gestiona tus equipos",
      description: "Pronto podrás organizar tus deportistas y actividades.",
      icon: "⌁",
    },
    admin: {
      title: "Administra SportPass",
      description: "Pronto podrás gestionar usuarios, roles y permisos.",
      icon: "✳",
    },
  };

export default function RoleHome({ role }: { role: Role }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const saved = getSession();
    if (!saved) {
      router.replace("/login");
      return;
    }
    if (!saved.user.roles.includes(role)) {
      router.replace(dashboardPath(saved.user.roles[0] ?? "athlete"));
      return;
    }
    setSession(saved);
  }, [role, router]);

  async function logout() {
    await fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    localStorage.removeItem(SESSION_KEY);
    router.replace("/");
  }

  if (!session)
    return (
      <main className="dashboard-shell">
        <p className="dashboard-loading">Cargando tu espacio…</p>
      </main>
    );
  const firstName = session.user.fullName.split(" ")[0];
  return (
    <main className="role-page">
      <header className="topbar role-topbar">
        <a className="brand" href="/">
          <img src="/images/ICESI_logo.svg" alt="Universidad Icesi" />
        </a>
        <nav className="role-nav">
          <span>{roleNames[role]}</span>
          <div className="user-menu">
            <span className="avatar">{session.user.fullName.charAt(0)}</span>
            <span>{session.user.fullName}</span>
            <button className="text-button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </nav>
      </header>
      <section className={`role-banner role-${role}`}>
        <div className="role-banner-shade" />
        <div className="role-banner-copy">
          <p className="eyebrow">SPORTPASS · {roleNames[role].toUpperCase()}</p>
          <h1>Hola, {firstName}.</h1>
          <p>Tu bienestar y tu vida deportiva, en un solo lugar.</p>
        </div>
      </section>
      <section className="role-content">
        <div className="role-section-heading">
          <div>
            <p className="eyebrow">TU ESPACIO SPORTPASS</p>
            <h2>{copy[role].title}</h2>
          </div>
          <span className="role-chip">
            {roleNames[role]}
            {session.user.permissions.length > 0 && (
              <span> · {session.user.permissions.length} permisos activos</span>
            )}
          </span>
        </div>
        <div className="role-welcome-card">
          <img src="/images/icesi-balon-de-basket.svg" alt="" />
          <div>
            <p className="eyebrow">PRÓXIMAMENTE</p>
            <h3>Un campus para vivir en movimiento</h3>
            <p>{copy[role].description}</p>
          </div>
        </div>
        <div className="role-quick-links">
          <article>
            <span>01</span>
            <h3>Actividades</h3>
            <p>Descubre opciones deportivas en el campus.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Comunidad</h3>
            <p>Conecta con las personas que comparten tu interés.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Bienestar</h3>
            <p>Encuentra tu próximo espacio para moverte.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleNavbar from "@/components/role-navbar";
import { useRoleSession } from "@/lib/use-role-session";
import {
  apiUrl,
  dashboardPath,
  Role,
  roleNames,
  SESSION_KEY,
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
      title: "Gestiona el acceso a SportPass",
      description:
        "Consulta los usuarios y administra los roles y permisos de la plataforma.",
      icon: "✳",
    },
  };

export default function RoleHome({ role }: { role: Role }) {
  const router = useRouter();
  const { session } = useRoleSession();
  useEffect(() => {
    if (session && !session.user.roles.includes(role)) {
      router.replace(dashboardPath(session.user.roles[0] ?? "athlete"));
    }
  }, [session, role, router]);

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
      <RoleNavbar
        role={role}
        fullName={session.user.fullName}
        onLogout={logout}
      />
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
          <article id={role === "athlete" ? "activities" : undefined}>
            <span>01</span>
            <h3>Actividades</h3>
            <p>Descubre opciones deportivas en el campus.</p>
          </article>
          <article id={role === "athlete" ? "community" : undefined}>
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

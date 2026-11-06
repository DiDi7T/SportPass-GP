
import Link from "next/link";
import { dashboardPath, Role, roleNames } from "@/lib/auth";

type RoleNavbarProps = {
  role: Role;
  fullName: string;
  onLogout: () => void | Promise<void>;
};

export default function RoleNavbar({
  role,
  fullName,
  onLogout,
}: RoleNavbarProps) {
  // Competencias: entrenadores y administradores.
  const managesCompetitions = role !== "athlete";

  const renderLinks = () => (
    <>
      <span className="role-menu-title">{roleNames[role]}</span>

      {/* Disponible para todos los roles */}
      <Link className="role-menu-placeholder role-menu-link" href="/torneos">
        Torneos
      </Link>

      {/* Entrenadores y administradores */}
      {managesCompetitions && (
        <Link
          className="role-menu-placeholder role-menu-link"
          href="/competencias"
        >
          Competencias
        </Link>
      )}

      {/* Opciones exclusivas del administrador */}
      {role === "admin" && (
        <>
          <Link
            className="role-menu-placeholder role-menu-link"
            href="/admin/athlete"
          >
            Deportistas
          </Link>

          <Link
            className="role-menu-placeholder role-menu-link"
            href="/admin/management/teams"
          >
            Equipos
          </Link>

          <Link className="role-settings-link" href="/admin/management">
            <span aria-hidden="true">⚙</span>
            Ajustes
          </Link>
        </>
      )}

      {role === "athlete" && (
        <>
          {/* HU5: competencias del deportista (requiere 70% de asistencia). */}
          <Link className="role-menu-placeholder role-menu-link" href="/mis-competencias">Mis competencias</Link>
          <Link className="role-menu-placeholder role-menu-link" href="/athlete#community">Opcion 3</Link>
        </>
      )}
      {role === "coach" && <span className="role-menu-placeholder">Opciones próximamente</span>}
    </>
  );

  return (
    <header className="topbar role-topbar">
      <Link className="brand" href={dashboardPath(role)}>
        <img src="/images/ICESI_logo.svg" alt="Universidad Icesi" />
      </Link>

      {/* Menú escritorio */}
      <nav
        className="role-nav-links role-nav-links-desktop"
        aria-label={`Navegación de ${roleNames[role]}`}
      >
        {renderLinks()}
      </nav>

      {/* Menú móvil */}
      <details className="role-mobile-menu">
        <summary>
          <span aria-hidden="true">☰</span>
          <span>Menú</span>
        </summary>

        <nav
          className="role-nav-links role-nav-links-mobile"
          aria-label={`Navegación de ${roleNames[role]}`}
        >
          {renderLinks()}
        </nav>
      </details>

      <div className="user-menu">
        <span className="avatar">{fullName.charAt(0)}</span>
        <span>{fullName}</span>

        <button className="text-button" onClick={onLogout}>
          <span className="logout-label-desktop">Cerrar sesión</span>
          <span className="logout-label-mobile">Salir</span>
        </button>
      </div>
    </header>
  );
}

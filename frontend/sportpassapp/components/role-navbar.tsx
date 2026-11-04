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
  const placeholders =
    role === "admin" ? ["Opción 2"] : ["Opción 2", "Opción 3"];
  const renderLinks = () => (
    <>
      <span className="role-menu-title">{roleNames[role]}</span>
      {/* Oferta de torneos (HU8): disponible para todos los roles. */}
      <Link className="role-menu-placeholder role-menu-link" href="/torneos">
        Torneos
      </Link>
      {placeholders.map((label) => (
        <span className="role-menu-placeholder" key={label}>
          {label}
        </span>
      ))}
      {role === "admin" && (
        <Link className="role-settings-link" href="/admin/management">
          <span aria-hidden="true">⚙</span>
          Ajustes
        </Link>
      )}
    </>
  );

  return (
    <header className="topbar role-topbar">
      <Link className="brand" href={dashboardPath(role)}>
        <img src="/images/ICESI_logo.svg" alt="Universidad Icesi" />
      </Link>
      <nav
        className="role-nav-links role-nav-links-desktop"
        aria-label={`Navegación de ${roleNames[role]}`}
      >
        {renderLinks()}
      </nav>
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

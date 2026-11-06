"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleNavbar from "@/components/role-navbar";
import { useRoleSession } from "@/lib/use-role-session";
import {
  apiUrl,
  roleNames,
  Role,
  SESSION_KEY,
} from "@/lib/auth";

type Permission = { id: string; code: string; description: string | null };
type AdminRole = {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
};
type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: { id: string; name: string }[];
};
type Section = "users" | "roles" | "permissions";

const sectionLabels: Record<Section, string> = {
  users: "Usuarios",
  roles: "Roles",
  permissions: "Permisos",
};

export default function AdminManagementPage() {
  const router = useRouter();
  const { session } = useRoleSession();
  const [section, setSection] = useState<Section>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState("");
  const [selectedUserRoleIds, setSelectedUserRoleIds] = useState<string[]>([]);
  const [confirmRoleId, setConfirmRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const apiRequest = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!session) throw new Error("No hay una sesión activa.");

      const response = await fetch(`${apiUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Tu sesión expiró o tu cuenta no tiene permiso para consultar esta sección.",
          );
        }

        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;

        throw new Error(
          Array.isArray(payload?.message)
            ? payload.message.join(" ")
            : (payload?.message ?? "No se pudo completar la solicitud."),
        );
      }

      return response.json() as Promise<unknown>;
    },
    [session],
  );

  const loadManagementData = useCallback(async () => {
    try {
      const [userData, roleData, permissionData] = await Promise.all([
        apiRequest("/admin/users") as Promise<AdminUser[]>,
        apiRequest("/admin/roles") as Promise<AdminRole[]>,
        apiRequest("/admin/permissions") as Promise<Permission[]>,
      ]);

      setUsers(userData);
      setRoles(roleData);
      setPermissions(permissionData);
      setSelectedRoleId((current) => current || roleData[0]?.id || "");
      setSelectedCodes(roleData[0]?.permissions.map((permission) => permission.code) ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la información.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // useRoleSession observa la sesión sin copiarla a un estado dentro del efecto.
  useEffect(() => {
    if (session && !session.user.roles.includes("admin")) {
      router.replace("/");
    }
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    // Cargar datos de forma asincrona, sin actualizaciones sincronas en el efecto.
    void Promise.resolve().then(() => {
      if (active) return loadManagementData();
    });
    return () => { active = false; };
  }, [session, loadManagementData]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const editingUser = users.find((user) => user.id === editingUserId);

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const created = (await apiRequest("/admin/roles", {
        method: "POST",
        body: JSON.stringify({ name: roleName, description: roleDescription }),
      })) as AdminRole;

      setRoles((current) => [...current, { ...created, permissions: [] }]);
      setSelectedRoleId(created.id);
      setSelectedCodes([]);
      setRoleName("");
      setRoleDescription("");
      setNotice("El rol se creó correctamente.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el rol.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRolePermissions() {
    if (!selectedRole) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const updated = (await apiRequest(
        `/admin/roles/${selectedRole.id}/permissions`,
        {
          method: "PUT",
          body: JSON.stringify({ codes: selectedCodes }),
        },
      )) as AdminRole;

      setRoles((current) =>
        current.map((role) => (role.id === updated.id ? updated : role)),
      );
      setNotice(`Permisos guardados para el rol ${updated.name}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron guardar los permisos.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: AdminRole) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/roles/${role.id}`, { method: "DELETE" });
      const affectedUsers = users.filter((user) =>
        user.roles.some((userRole) => userRole.id === role.id),
      ).length;
      const remainingRoles = roles.filter((item) => item.id !== role.id);

      setRoles(remainingRoles);
      setSelectedRoleId(remainingRoles[0]?.id ?? "");
      setSelectedCodes(remainingRoles[0]?.permissions.map((permission) => permission.code) ?? []);
      setConfirmRoleId("");
      setUsers((current) =>
        current.map((user) => ({
          ...user,
          roles: user.roles.filter((userRole) => userRole.id !== role.id),
        })),
      );
      setNotice(
        affectedUsers
          ? `Rol eliminado. ${affectedUsers} usuario(s) quedaron sin ese rol.`
          : "Rol eliminado correctamente.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo eliminar el rol.",
      );
    } finally {
      setSaving(false);
    }
  }

  function editUserRoles(user: AdminUser) {
    setEditingUserId(user.id);
    setSelectedUserRoleIds(user.roles.map((role) => role.id));
    setError("");
    setNotice("");
  }

  async function saveUserRoles(userId: string) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const updatedUser = (await apiRequest(`/admin/users/${userId}/roles`, {
        method: "PUT",
        body: JSON.stringify({ roleIds: selectedUserRoleIds }),
      })) as AdminUser;

      setUsers((current) =>
        current.map((user) => (user.id === userId ? updatedUser : user)),
      );
      setEditingUserId("");
      setNotice(`Roles actualizados para ${updatedUser.fullName}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron actualizar los roles del usuario.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    localStorage.removeItem(SESSION_KEY);
    router.replace("/");
  }

  const filteredUsers = users.filter((user) =>
    `${user.fullName} ${user.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <main className="admin-management-page">
      <RoleNavbar
        role="admin"
        fullName={session?.user.fullName ?? "Administrador"}
        onLogout={logout}
      />

      <section className="admin-management-content">
        <Link className="back-link" href="/admin">
          ← Volver al inicio del administrador
        </Link>

        <div className="admin-page-heading">
          <div>
            <p className="eyebrow">SPORTPASS · ADMINISTRACIÓN</p>
            <h1>Roles y permisos</h1>
            <p>
              Consulta las cuentas institucionales y define el acceso de cada
              rol.
            </p>
          </div>
          <div className="admin-summary">
            <span>
              <strong>{users.length}</strong> usuarios
            </span>
            <span>
              <strong>{roles.length}</strong> roles
            </span>
            <span>
              <strong>{permissions.length}</strong> permisos
            </span>
          </div>
        </div>

        <nav className="admin-tabs" aria-label="Secciones de administración">
          {(Object.keys(sectionLabels) as Section[]).map((item) => (
            <button
              className={section === item ? "active" : ""}
              key={item}
              onClick={() => {
                setSection(item);
                setNotice("");
              }}
            >
              {sectionLabels[item]}
              <span>
                {item === "users"
                  ? users.length
                  : item === "roles"
                    ? roles.length
                    : permissions.length}
              </span>
            </button>
          ))}
        </nav>

        {notice && <p className="admin-notice">{notice}</p>}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="admin-loading">Cargando información…</p>
        ) : (
          <>
            {section === "users" && (
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Usuarios registrados</h2>
                    <p>Consulta su estado y los roles asignados.</p>
                  </div>
                  <label className="admin-search">
                    <span aria-hidden="true">⌕</span>
                    <input
                      type="search"
                      placeholder="Buscar por nombre o correo"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Correo institucional</th>
                        <th>Roles</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.fullName}</strong>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <div className="admin-user-roles">
                              {user.roles.length ? (
                                user.roles.map((role) => (
                                  <span key={role.id}>
                                    {roleNames[role.name as Role] ?? role.name}
                                  </span>
                                ))
                              ) : (
                                <span className="no-role">Sin rol</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`status-pill ${user.isActive ? "active" : "inactive"}`}
                            >
                              {user.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="admin-edit-button"
                              onClick={() => editUserRoles(user)}
                            >
                              {editingUserId === user.id
                                ? "Editando…"
                                : "Editar roles"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {editingUser && (
                        <tr>
                          <td colSpan={5}>
                            <div className="user-role-editor">
                              <div>
                                <strong>
                                  Roles asignados a {editingUser.fullName}
                                </strong>
                                <p>
                                  Puedes seleccionar varios roles o dejar la
                                  cuenta sin rol.
                                </p>
                              </div>
                              <div className="user-role-options">
                                {roles.map((role) => (
                                  <label key={role.id}>
                                    <input
                                      type="checkbox"
                                      checked={selectedUserRoleIds.includes(
                                        role.id,
                                      )}
                                      onChange={(event) =>
                                        setSelectedUserRoleIds((current) =>
                                          event.target.checked
                                            ? [...current, role.id]
                                            : current.filter(
                                                (id) => id !== role.id,
                                              ),
                                        )
                                      }
                                    />
                                    {roleNames[role.name as Role] ?? role.name}
                                  </label>
                                ))}
                              </div>
                              <div className="user-role-actions">
                                <button
                                  className="admin-cancel-button"
                                  onClick={() => setEditingUserId("")}
                                >
                                  Cancelar
                                </button>
                                <button
                                  className="primary-button admin-submit"
                                  disabled={saving}
                                  onClick={() =>
                                    void saveUserRoles(editingUserId)
                                  }
                                >
                                  {saving ? "Guardando…" : "Guardar roles"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!filteredUsers.length && (
                        <tr>
                          <td colSpan={5} className="admin-empty">
                            No hay usuarios que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {section === "roles" && (
              <div className="admin-two-column">
                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Roles</h2>
                      <p>Selecciona un rol para editar sus permisos.</p>
                    </div>
                  </div>
                  <div className="role-list">
                    {roles.map((role) => (
                      <button
                        className={selectedRoleId === role.id ? "selected" : ""}
                        key={role.id}
                        onClick={() => {
                          setSelectedRoleId(role.id);
                          setSelectedCodes(role.permissions.map((permission) => permission.code));
                        }}
                      >
                        <span className="role-list-icon">◇</span>
                        <span>
                          <strong>
                            {roleNames[role.name as Role] ?? role.name}
                          </strong>
                          <small>{role.description || "Sin descripción"}</small>
                        </span>
                        <span className="role-count">
                          {role.permissions.length}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedRole && (
                    <div className="delete-role-area">
                      {confirmRoleId === selectedRole.id ? (
                        <div className="delete-role-confirmation" role="alert">
                          <p>
                            ¿Eliminar el rol{" "}
                            <strong>{selectedRole.name}</strong>? Los usuarios
                            asignados perderán este rol.
                          </p>
                          <div>
                            <button
                              className="admin-cancel-button"
                              onClick={() => setConfirmRoleId("")}
                              disabled={saving}
                            >
                              Cancelar
                            </button>
                            <button
                              className="delete-role-button"
                              onClick={() => void deleteRole(selectedRole)}
                              disabled={saving}
                            >
                              {saving ? "Eliminando…" : "Sí, eliminar rol"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="delete-role-button"
                          onClick={() => setConfirmRoleId(selectedRole.id)}
                        >
                          Eliminar rol seleccionado
                        </button>
                      )}
                    </div>
                  )}
                  <form className="create-role-form" onSubmit={createRole}>
                    <h3>Crear un rol</h3>
                    <label>
                      Nombre
                      <input
                        value={roleName}
                        onChange={(event) => setRoleName(event.target.value)}
                        placeholder="Ej. coordinador"
                        minLength={2}
                        maxLength={60}
                        required
                      />
                    </label>
                    <label>
                      Descripción <span>(opcional)</span>
                      <input
                        value={roleDescription}
                        onChange={(event) =>
                          setRoleDescription(event.target.value)
                        }
                        placeholder="Responsabilidades del rol"
                        maxLength={255}
                      />
                    </label>
                    <button
                      className="primary-button admin-submit"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? "Creando…" : "Crear rol"}
                    </button>
                  </form>
                </section>

                <section className="admin-panel permission-editor">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Permisos del rol</h2>
                      <p>
                        {selectedRole
                          ? `Define qué puede hacer ${roleNames[selectedRole.name as Role] ?? selectedRole.name}.`
                          : "Selecciona un rol para continuar."}
                      </p>
                    </div>
                  </div>
                  <div className="permission-checklist">
                    {permissions.map((permission) => (
                      <label className="permission-option" key={permission.id}>
                        <input
                          type="checkbox"
                          checked={selectedCodes.includes(permission.code)}
                          onChange={(event) =>
                            setSelectedCodes((current) =>
                              event.target.checked
                                ? [...current, permission.code]
                                : current.filter(
                                    (code) => code !== permission.code,
                                  ),
                            )
                          }
                          disabled={!selectedRole}
                        />
                        <span>
                          <strong>{permission.code}</strong>
                          <small>
                            {permission.description || "Sin descripción"}
                          </small>
                        </span>
                      </label>
                    ))}
                    {!permissions.length && (
                      <p className="admin-empty">
                        No hay permisos registrados.
                      </p>
                    )}
                  </div>
                  <button
                    className="primary-button admin-submit"
                    onClick={saveRolePermissions}
                    disabled={!selectedRole || saving}
                  >
                    {saving ? "Guardando…" : "Guardar permisos"}
                  </button>
                </section>
              </div>
            )}

            {section === "permissions" && (
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Catálogo de permisos</h2>
                    <p>
                      Los permisos se asignan a cada rol desde la sección Roles.
                    </p>
                  </div>
                </div>
                <div className="permission-catalog">
                  {permissions.map((permission) => (
                    <article key={permission.id}>
                      <span className="permission-code">{permission.code}</span>
                      <p>{permission.description || "Sin descripción"}</p>
                      <small>
                        Asignado a{" "}
                        {roles
                          .filter((role) =>
                            role.permissions.some(
                              (item) => item.code === permission.code,
                            ),
                          )
                          .map(
                            (role) => roleNames[role.name as Role] ?? role.name,
                          )
                          .join(", ") || "ningún rol"}
                      </small>
                    </article>
                  ))}
                  {!permissions.length && (
                    <p className="admin-empty">No hay permisos registrados.</p>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}

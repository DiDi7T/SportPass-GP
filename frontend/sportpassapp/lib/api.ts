import { getSession, SESSION_KEY } from "./auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const TOKEN_KEY = "sportpass_access_token";

export class ApiError extends Error {
  // `body` conserva la respuesta de error del backend (p. ej. HU5: el % de asistencia en el 403).
  constructor(message: string, readonly status: number, readonly body: unknown = null) {
    super(message);
  }
}

// El login de HU1 (/login) guarda la sesión en localStorage; su token tiene prioridad.
export function getToken() {
  try {
    return getSession()?.accessToken ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    // Al renovar el token se actualiza también la sesión de /login para que no quede vencida.
    const session = getSession();
    if (session && token) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, accessToken: token }));
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage no disponible (modo privado): la sesión dura lo que dure la pestaña.
  }
}

function errorMessage(body: { message?: unknown } | null) {
  const message = body?.message;
  if (Array.isArray(message)) return [...new Set(message)].join(" ");
  return typeof message === "string" ? message : "Ocurrió un error inesperado.";
}

// El backend rota el refresh token en cada uso, así que si varias peticiones reciben
// 401 a la vez deben compartir una sola renovación; de lo contrario la segunda falla.
let pendingRefresh: Promise<string | null> | null = null;

function refreshAccessToken() {
  pendingRefresh ??= (async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!response.ok) return null;
    const { accessToken } = await response.json();
    setToken(accessToken);
    return accessToken as string;
  })().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

// Envía la petición con el token vigente, renueva la sesión una vez ante un 401 y
// convierte cualquier respuesta no exitosa en ApiError.
async function authorizedFetch(path: string, init: RequestInit, retry: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  if (
  init.body &&
  !(init.body instanceof FormData) &&
  !headers.has("Content-Type")
) {
  headers.set("Content-Type", "application/json");
}
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry && (await refreshAccessToken())) return authorizedFetch(path, init, false);
  if (!response.ok) {
    if (response.status === 401) setToken(null);
    const body = await response.json().catch(() => null);
    throw new ApiError(errorMessage(body), response.status, body);
  }
  return response;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await authorizedFetch(path, init, retry);
  return response.json() as Promise<T>;
}

// Descarga un archivo protegido (p. ej. la exportación a Excel de HU20). El nombre se define en
// el cliente porque CORS no expone Content-Disposition a otro origen sin configuración adicional.
export async function apiDownload(path: string, fileName: string) {
  const response = await authorizedFetch(path, {}, true);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export type SessionUser = { id: string; email: string; fullName: string; roles: string[]; permissions: string[] };

export async function login(email: string, password: string) {
  const result = await apiFetch<{ accessToken: string; user: SessionUser }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  setToken(result.accessToken);
  return result.user;
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  setToken(null);
}

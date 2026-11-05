import { getSession, SESSION_KEY } from "./auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const TOKEN_KEY = "sportpass_access_token";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
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

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null);
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

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
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
  if (response.status === 401 && retry && (await refreshAccessToken())) return apiFetch<T>(path, init, false);
  if (!response.ok) {
    if (response.status === 401) setToken(null);
    throw new ApiError(await errorMessage(response), response.status);
  }
  return response.json() as Promise<T>;
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

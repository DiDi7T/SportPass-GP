export type Role = "athlete" | "coach" | "admin";
export type User = {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  permissions: string[];
};
export type Session = { accessToken: string; user: User };

export const SESSION_KEY = "sportpass-session";
export const ERROR_MESSAGE =
  "No fue posible iniciar sesión. Verifique que esté utilizando una cuenta institucional de Icesi válida.";
export const profiles: {
  role: Role;
  label: string;
  email: string;
  password: string;
  icon: string;
}[] = [
  {
    role: "athlete",
    label: "Deportista",
    email: "athlete.demo@icesi.edu.co",
    password: "SportPass-Athlete-2026!",
    icon: "↗",
  },
  {
    role: "coach",
    label: "Entrenador",
    email: "coach.demo@icesi.edu.co",
    password: "SportPass-Coach-2026!",
    icon: "⌁",
  },
  {
    role: "admin",
    label: "Administrador",
    email: "admin.demo@icesi.edu.co",
    password: "SportPass-Admin-2026!",
    icon: "✳",
  },
];
export const roleNames: Record<Role, string> = {
  athlete: "Deportista",
  coach: "Entrenador",
  admin: "Administrador",
};
export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export function dashboardPath(role: Role) {
  return role === "athlete"
    ? "/athlete"
    : role === "coach"
      ? "/coach"
      : "/admin";
}

export function getSession(): Session | null {
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as Session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

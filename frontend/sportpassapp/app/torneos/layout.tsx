import type { Metadata } from "next";

export const metadata: Metadata = { title: "Torneos · SportPass" };

// Solo lectura: cualquier usuario con sesión @icesi.edu.co, sin permisos de entrenador ni de administrador.
export default function TournamentsLayout({ children }: LayoutProps<"/torneos">) {
  return children;
}

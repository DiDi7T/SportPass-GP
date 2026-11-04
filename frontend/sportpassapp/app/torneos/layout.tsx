import type { Metadata } from "next";
import { SessionGate } from "../competencias/session";

export const metadata: Metadata = { title: "Torneos · SportPass" };

// Solo lectura: cualquier usuario con sesión @icesi.edu.co, sin permisos de entrenador ni de administrador.
export default function TournamentsLayout({ children }: LayoutProps<"/torneos">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <SessionGate permission={null}>{children}</SessionGate>
    </main>
  );
}

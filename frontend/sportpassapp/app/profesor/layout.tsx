import type { Metadata } from "next";

export const metadata: Metadata = { title: "Solicitudes · SportPass" };

export default function ProfessorLayout({ children }: LayoutProps<"/profesor">) {
  return children;
}

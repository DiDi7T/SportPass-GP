import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mis competencias · SportPass" };

// HU5: solo deportistas oficiales. El backend valida el rol y el 70% de asistencia.
export default function MyCompetitionsLayout({ children }: LayoutProps<"/mis-competencias">) {
  return children;
}

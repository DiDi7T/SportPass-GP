import type { Metadata } from "next";

export const metadata: Metadata = { title: "Asistencia · SportPass" };

// HU9: el entrenador registra la asistencia de su deporte. El backend valida que sea su deporte.
export default function AttendanceLayout({ children }: LayoutProps<"/asistencia">) {
  return children;
}

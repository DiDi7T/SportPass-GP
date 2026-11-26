import type { Metadata } from "next";

export const metadata: Metadata = { title: "Historial de solicitudes · SportPass" };
export const instant = false;

// HU14: solo deportistas oficiales. El backend valida el rol.
export default function RequestHistoryLayout({ children }: LayoutProps<"/historial-solicitudes">) {
  return children;
}

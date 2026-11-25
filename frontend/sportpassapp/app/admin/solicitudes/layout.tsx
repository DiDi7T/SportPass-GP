import type { Metadata } from "next";

export const metadata: Metadata = { title: "Historial de solicitudes · SportPass" };

export default function AdminRequestsLayout({ children }: LayoutProps<"/admin/solicitudes">) {
  return children;
}

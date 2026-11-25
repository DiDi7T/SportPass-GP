import type { Metadata } from "next";

export const metadata: Metadata = { title: "Solicitudes · SportPass" };

export default function CoachRequestsLayout({ children }: LayoutProps<"/coach/solicitudes">) {
  return children;
}

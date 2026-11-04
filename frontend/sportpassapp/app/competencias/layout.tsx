import type { Metadata } from "next";
import { SessionGate } from "./session";

export const metadata: Metadata = { title: "Competencias · SportPass" };

export default function CompetitionsLayout({ children }: LayoutProps<"/competencias">) {
  return <SessionGate>{children}</SessionGate>;
}

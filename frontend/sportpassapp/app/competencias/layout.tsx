import type { Metadata } from "next";
import { SessionGate } from "./session";

export const metadata: Metadata = { title: "Competencias · SportPass" };

export default function CompetitionsLayout({ children }: LayoutProps<"/competencias">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <SessionGate>{children}</SessionGate>
    </main>
  );
}

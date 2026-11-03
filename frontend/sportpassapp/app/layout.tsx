import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportPass | Universidad Icesi",
  description: "Conecta con el deporte y el bienestar universitario de Icesi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

import { Suspense } from "react";
import ConvocatoriaContent from "./convocatoria-content";

type PageProps = {
  params: Promise<{
    competitionId: string;
  }>;
};

export default function ConvocatoriaPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl p-6">
          <p className="text-gray-500">Cargando convocatoria...</p>
        </main>
      }
    >
      <ConvocatoriaContent params={params} />
    </Suspense>
  );
}
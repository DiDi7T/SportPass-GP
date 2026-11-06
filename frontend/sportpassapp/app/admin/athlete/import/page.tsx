"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import RoleNavbar from "@/components/role-navbar";
import { useRoleSession } from "@/lib/use-role-session";

import {
  importAthletes,
  type AthleteImportResult,
} from "@/lib/roster-import";

export default function ImportAthletesPage() {
  const { session, logout } = useRoleSession();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AthleteImportResult | null>(null);

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Cargando sesión...</span>
        </div>
      </main>
    );
  }

  if (!session.user.roles.includes("admin")) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
            🔒
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Acceso restringido
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            No tienes permisos de administrador para importar deportistas.
          </p>
          <Link
            href="/admin/management"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Volver a gestión
          </Link>
        </div>
      </main>
    );
  }

  function downloadTemplate() {
    const content = [
      "email,student_code,document_number",
      "estudiante1@icesi.edu.co,202612345,1107012345",
      "estudiante2@icesi.edu.co,202612346,1107012346",
    ].join("\n");

    const blob = new Blob(["\uFEFF" + content], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "plantilla_deportistas.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setResult(null);
    setFile(null);

    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("El archivo debe tener formato CSV.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("El archivo no puede superar los 5 MB.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handleImport() {
    if (!file || loading) return;

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await importAthletes(file);

      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible importar los deportistas.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="role-page admin-management-page min-h-screen bg-slate-50/50">
      <RoleNavbar
        role="admin"
        fullName={session.user.fullName}
        onLogout={logout}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Migas de pan */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/admin" className="transition hover:text-blue-700">
            Administración
          </Link>
          <span>/</span>
          <Link
            href="/admin/athlete"
            className="transition hover:text-blue-700"
          >
            Deportistas
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-800">
            Importar
          </span>
        </div>

        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Importar deportistas
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Registra varios deportistas a la vez cargando el listado general
            de la Universidad Icesi mediante un archivo CSV.
          </p>
        </div>

        {/* Instrucciones */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 sm:px-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
                01
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Prepara el archivo CSV
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Antes de importar, verifica que tu archivo tenga las
                  columnas requeridas y que la información esté completa.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:px-7">
            <div className="mb-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Columnas obligatorias
              </h3>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Columna</span>
                  <span>Descripción</span>
                </div>

                <div className="divide-y divide-slate-100 text-sm">
                  <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] items-center gap-3 px-4 py-3.5">
                    <code className="font-semibold text-blue-700">
                      email
                    </code>
                    <span className="text-slate-600">
                      Correo institucional del deportista.
                    </span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] items-center gap-3 px-4 py-3.5">
                    <code className="font-semibold text-blue-700">
                      student_code
                    </code>
                    <span className="text-slate-600">
                      Código estudiantil.
                    </span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] items-center gap-3 px-4 py-3.5">
                    <code className="font-semibold text-blue-700">
                      document_number
                    </code>
                    <span className="text-slate-600">
                      Número de documento de identidad.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg"></span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Ten en cuenta
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    El correo debe pertenecer a una cuenta institucional
                    previamente registrada en SportPass.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span>↓</span>
                Descargar plantilla
              </button>
            </div>
          </div>
        </section>

        {/* Selección del archivo */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 sm:px-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
                02
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Selecciona el archivo
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Carga el archivo CSV que contiene los deportistas que
                  deseas registrar en SportPass.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-5 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:opacity-60 sm:py-12"
            >
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700 transition group-hover:bg-blue-200">
                ↑
              </span>

              <span className="text-base font-bold text-slate-800">
                {file ? "Cambiar archivo" : "Selecciona tu archivo CSV"}
              </span>

              <span className="mt-2 text-sm text-slate-500">
                Haz clic aquí para buscar el archivo en tu dispositivo.
              </span>

              <span className="mt-4 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                CSV · Máximo 5 MB
              </span>
            </button>

            {file && (
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-700 shadow-sm">
                    CSV
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {(file.size / 1024).toFixed(2)} KB · Archivo seleccionado
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setError("");
                    setResult(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={loading}
                  className="self-start rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-red-600 disabled:opacity-50 sm:self-center"
                >
                  Quitar archivo
                </button>
              </div>
            )}

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <span className="font-bold text-red-600">!</span>
                <div>
                  <p className="font-semibold">No fue posible continuar</p>
                  <p className="mt-1 leading-5">{error}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Verifica que el archivo corresponda a la plantilla
                institucional antes de iniciar la importación.
              </p>

              <button
                type="button"
                onClick={handleImport}
                disabled={!file || loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Importando deportistas...
                  </>
                ) : (
                  <>
                    <span>↑</span>
                    Importar deportistas
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Resultado de importación */}
        {result && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5 sm:px-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl text-green-700">
                  ✓
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Resultado de la importación
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Resumen de los registros procesados.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ResultCard
                  label="Registros procesados"
                  value={result.totalRows}
                  description="Filas leídas del archivo"
                  variant="default"
                />
                <ResultCard
                  label="Importados correctamente"
                  value={result.imported}
                  description="Deportistas registrados"
                  variant="success"
                />
                <ResultCard
                  label="Registros fallidos"
                  value={result.failed}
                  description="No pudieron procesarse"
                  variant="error"
                />
              </div>

              {result.failed > 0 && (
                <div className="mt-8">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Registros con errores
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Revisa los siguientes motivos para corregir el archivo
                      y volver a importarlo.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-5 py-3.5">Fila</th>
                          <th className="px-5 py-3.5">Correo</th>
                          <th className="px-5 py-3.5">Motivo del error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.errors.map((item, index) => (
                          <tr
                            key={`${item.row}-${index}`}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4 font-mono text-xs text-slate-600">
                              {item.row}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {item.email || "Sin correo"}
                            </td>
                            <td className="whitespace-normal px-5 py-4 text-slate-600">
                              {item.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.failed === 0 && (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                  <span className="font-bold text-green-700">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Importación completada
                    </p>
                    <p className="mt-1 text-xs leading-5 text-green-700">
                      Todos los registros se procesaron correctamente.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                <Link
                  href="/admin/athlete"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                  Ver deportistas registrados
                </Link>
              </div>
            </div>
          </section>
        )}

        <div className="mt-8 text-center text-xs text-slate-400">
          Universidad Icesi · SportPass
        </div>
      </div>
    </main>
  );
}

function ResultCard({
  label,
  value,
  description,
  variant,
}: {
  label: string;
  value: number;
  description: string;
  variant: "default" | "success" | "error";
}) {
  const styles = {
    default: {
      value: "text-slate-900",
      icon: "bg-slate-100 text-slate-600",
      symbol: "#",
    },
    success: {
      value: "text-green-700",
      icon: "bg-green-50 text-green-700",
      symbol: "✓",
    },
    error: {
      value: "text-red-600",
      icon: "bg-red-50 text-red-600",
      symbol: "!",
    },
  };

  const style = styles[variant];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${style.icon}`}
        >
          {style.symbol}
        </span>
      </div>

      <p className={`mt-4 text-3xl font-extrabold tracking-tight ${style.value}`}>
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}
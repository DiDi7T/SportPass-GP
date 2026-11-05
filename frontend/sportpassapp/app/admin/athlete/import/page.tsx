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
  const [result, setResult] =
    useState<AthleteImportResult | null>(null);

  if (!session) {
    return (
      <main className="min-h-screen grid place-items-center bg-base-200">
        <p className="text-base-content/60">
          Cargando sesión...
        </p>
      </main>
    );
  }

  if (!session.user.roles.includes("admin")) {
    return (
      <main className="min-h-screen grid place-items-center bg-base-200 p-6">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body">
            <h1 className="card-title">
              Acceso restringido
            </h1>
            <p>
              No tienes permisos para importar deportistas.
            </p>
            <Link
              href="/admin/management"
              className="btn btn-primary"
            >
              Volver
            </Link>
          </div>
        </div>
      </main>
    );
  }

  function downloadTemplate() {
    const content = [
      "email,student_code,first_name,last_name",
      "estudiante1@icesi.edu.co,202612345,Carlos,Ramirez",
      "estudiante2@icesi.edu.co,202612346,Maria,Lopez",
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF" + content],
      { type: "text/csv;charset=utf-8;" },
    );

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
    <main className="role-page admin-management-page import-athletes-page">
      <RoleNavbar
        role="admin"
        fullName={session.user.fullName}
        onLogout={logout}
      />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin/athlete"
            className="link link-primary text-sm"
          >
            ← Volver a deportistas
          </Link>

          <h1 className="mt-4 text-3xl font-bold">
            Importar deportistas
          </h1>

          <p className="mt-2 text-base-content/60">
            Carga el listado general de deportistas de la
            universidad mediante un archivo CSV.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title">
                1. Prepara tu archivo
              </h2>

              <p className="text-sm text-base-content/70">
                El archivo debe contener las siguientes
                columnas obligatorias:
              </p>

              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Columna</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>email</td>
                      <td>Correo institucional</td>
                    </tr>
                    <tr>
                      <td>student_code</td>
                      <td>Código estudiantil</td>
                    </tr>
                    <tr>
                      <td>first_name</td>
                      <td>Nombres</td>
                    </tr>
                    <tr>
                      <td>last_name</td>
                      <td>Apellidos</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="alert alert-info mt-2">
                <span className="text-sm">
                  El correo debe pertenecer a una cuenta
                  institucional previamente registrada en
                  SportPass.
                </span>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-primary mt-3"
                onClick={downloadTemplate}
              >
                Descargar plantilla CSV
              </button>
            </div>
          </section>

          <section className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title">
                2. Selecciona el archivo
              </h2>

              <p className="text-sm text-base-content/70">
                Selecciona el CSV que contiene los
                deportistas que deseas registrar.
              </p>

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
  className="btn btn-outline btn-primary w-full mt-4"
  onClick={() => fileInputRef.current?.click()}
  disabled={loading}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
  Seleccionar archivo CSV
</button>

              {file && (
                <div className="rounded-lg bg-base-200 p-3 mt-3">
                  <p className="font-medium break-all">
                    {file.name}
                  </p>
                  <p className="text-xs text-base-content/60">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              <p className="text-xs text-base-content/60 mt-2">
                Formato permitido: CSV. Tamaño máximo: 5 MB.
              </p>

              <button
                type="button"
                className="btn btn-primary mt-4"
                onClick={handleImport}
                disabled={!file || loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Importando...
                  </>
                ) : (
                  "Importar deportistas"
                )}
              </button>

              {error && (
                <div className="alert alert-error mt-4">
                  <span>{error}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        {result && (
          <section className="card bg-base-100 shadow-sm mt-6">
            <div className="card-body">
              <h2 className="card-title">
                Resultado de la importación
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">
                    Registros
                  </div>
                  <div className="stat-value text-2xl">
                    {result.totalRows}
                  </div>
                </div>

                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">
                    Importados
                  </div>
                  <div className="stat-value text-2xl text-success">
                    {result.imported}
                  </div>
                </div>

                <div className="stat bg-base-200 rounded-lg col-span-2 md:col-span-1">
                  <div className="stat-title">
                    Fallidos
                  </div>
                  <div className="stat-value text-2xl text-error">
                    {result.failed}
                  </div>
                </div>
              </div>

              {result.failed > 0 && (
                <div className="mt-5">
                  <h3 className="font-semibold mb-3">
                    Registros que no pudieron importarse
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="table table-sm table-zebra">
                      <thead>
                        <tr>
                          <th>Fila</th>
                          <th>Correo</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.errors.map((item, index) => (
                          <tr key={`${item.row}-${index}`}>
                            <td>{item.row}</td>
                            <td>{item.email || "Sin correo"}</td>
                            <td className="whitespace-normal">
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
                <div className="alert alert-success mt-4">
                  Todos los registros se procesaron correctamente.
                </div>
              )}

              <div className="card-actions justify-end mt-4">
                <Link
                  href="/admin/management/athletes"
                  className="btn btn-primary"
                >
                  Ver deportistas
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </main>
  );
}
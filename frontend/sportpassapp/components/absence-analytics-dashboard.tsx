
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminAbsenceAnalytics,
  fetchCoachAbsenceAnalytics,
  type AbsenceAnalyticsFilters,
  type AbsenceAnalyticsResponse,
} from "@/lib/absence-analytics";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

type DashboardRole = "admin" | "coach";

type Props = {
  role: DashboardRole;
};

const INITIAL_FILTERS: AbsenceAnalyticsFilters = {
  from: "",
  to: "",
  groupBy: "week",
};

const numberFormat = new Intl.NumberFormat("es-CO");

function formatPeriod(period: string, groupBy: "week" | "month") {
  if (groupBy === "month") {
    const [year, month] = period.split("-").map(Number);

    return new Intl.DateTimeFormat("es-CO", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }

  const date = new Date(`${period}T00:00:00Z`);

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function SummaryCard({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: number;
  description: string;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      </div>

      <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
        {numberFormat.format(value)}
      </p>

      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </article>
  );
}

export default function AbsenceAnalyticsDashboard({ role }: Props) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [data, setData] = useState<AbsenceAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        role === "admin"
          ? await fetchAdminAbsenceAnalytics(filters)
          : await fetchCoachAbsenceAnalytics(filters);

      setData(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar las estadísticas.",
      );
    } finally {
      setLoading(false);
    }
  }, [role, filters]);

  // Carga automática cuando cambian las fechas o la agrupación.
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response =
          role === "admin"
            ? await fetchAdminAbsenceAnalytics(filters)
            : await fetchCoachAbsenceAnalytics(filters);

        if (active) {
          setData(response);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar las estadísticas.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [role, filters]);

  function updateFilter<K extends keyof AbsenceAnalyticsFilters>(
    key: K,
    value: AbsenceAnalyticsFilters[K],
  ) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Filtrar estadísticas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Selecciona un periodo para actualizar los indicadores.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Desde
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) =>
                updateFilter("from", event.target.value)
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Hasta
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) =>
                updateFilter("to", event.target.value)
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Agrupar evolución por
            <select
              value={filters.groupBy}
              onChange={(event) =>
                updateFilter(
                  "groupBy",
                  event.target.value as "week" | "month",
                )
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="week">Semanas</option>
              <option value="month">Meses</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </section>

      {/* Errores */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* Cargando */}
      {loading && !data ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Cargando estadísticas...
        </p>
      ) : data ? (
        <>
          {/* Tarjetas de resumen */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Resumen de solicitudes
              </h2>

              <p className="text-sm text-slate-500">
                Solicitudes recibidas según su fecha de creación.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total recibidas"
                value={data.summary.total}
                description="Incluye solicitudes canceladas"
                color="bg-blue-500"
              />

              <SummaryCard
                label="Aprobadas"
                value={data.summary.approved}
                description="Aprobadas por el entrenador"
                color="bg-emerald-500"
              />

              <SummaryCard
                label="Rechazadas"
                value={data.summary.rejected}
                description="Rechazadas por el entrenador"
                color="bg-red-500"
              />

              <SummaryCard
                label="Pendientes"
                value={data.summary.pending}
                description="Esperando respuesta"
                color="bg-amber-500"
              />
            </div>
          </section>

          {/* Gráficos */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de barras */}
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Aprobaciones por disciplina
                </h2>

                <p className="text-sm text-slate-500">
                  Cantidad de solicitudes aprobadas en cada deporte.
                </p>
              </div>

              {data.bySport.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No hay solicitudes aprobadas en este periodo.
                </p>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.bySport}
                      margin={{
                        top: 15,
                        right: 20,
                        left: 0,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="sport"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={65}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                      />

                      <Tooltip
                        formatter={(value) => [
                          Number(value),
                          "Solicitudes aprobadas",
                        ]}
                      />

                      <Bar
                        dataKey="total"
                        name="Solicitudes aprobadas"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={65}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            {/* Gráfico de líneas */}
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Evolución de solicitudes
                </h2>

                <p className="text-sm text-slate-500">
                  Solicitudes recibidas por{" "}
                  {data.groupBy === "week" ? "semana" : "mes"}.
                </p>
              </div>

              {data.timeline.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No hay solicitudes registradas en este periodo.
                </p>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.timeline.map((item) => ({
                        ...item,
                        label: formatPeriod(
                          item.period,
                          data.groupBy,
                        ),
                      }))}
                      margin={{
                        top: 15,
                        right: 20,
                        left: 0,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                      />

                      <Tooltip
                        formatter={(value) => [
                          Number(value),
                          "Solicitudes recibidas",
                        ]}
                      />

                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Solicitudes recibidas"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        dot={{
                          r: 5,
                          fill: "#4f46e5",
                        }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}

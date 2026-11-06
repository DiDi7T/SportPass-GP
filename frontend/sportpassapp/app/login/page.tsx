"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiUrl,
  dashboardPath,
  ERROR_MESSAGE,
  getSession,
  profiles,
  SESSION_KEY,
  Session,
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session?.user.roles[0])
      router.replace(dashboardPath(session.user.roles[0]));
  }, [router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith("@icesi.edu.co")) {
      setError(ERROR_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = Array.isArray(body?.message)
          ? body.message.join(" ")
          : typeof body?.message === "string"
            ? body.message
            : ERROR_MESSAGE;
        throw new Error(message);
      }
      const result = (await response.json()) as Session;
      if (!result.user?.roles?.length || !result.accessToken)
        throw new Error("invalid_response");
      localStorage.setItem(SESSION_KEY, JSON.stringify(result));
      router.replace(dashboardPath(result.user.roles[0]));
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <span className="login-orbit login-orbit-one" aria-hidden="true">
        <img src="/images/icesi-balon-de-basket.svg" alt="" />
      </span>
      <span className="login-orbit login-orbit-two" aria-hidden="true">
        <img src="/images/icesi-balon-de-basket.svg" alt="" />
      </span>
      <span className="login-orbit login-orbit-three" aria-hidden="true">
        <img src="/images/icesi-balon-de-basket.svg" alt="" />
      </span>
      <div className="login-card">
        <section className="login-visual">
          <img className="login-photo" src="/images/canchaT.jpg" alt="" />
          <Link className="login-logo" href="/">
            <img src="/images/ICESI_logo.svg" alt="Universidad Icesi" />
          </Link>
          <div className="login-visual-copy">
            <p>DEPORTE · COMUNIDAD · BIENESTAR</p>
            <h1>
              Activa tu
              <br />
              bienestar.
            </h1>
            <span>Tu espacio deportivo en el campus Icesi.</span>
          </div>
          <span className="login-photo-caption">
            UNIVERSIDAD ICESI · CALI, COLOMBIA
          </span>
        </section>
        <section className="login-main">
          <Link className="mobile-login-logo" href="/">
            <img src="/images/ICESI_logo.svg" alt="Universidad Icesi" />
          </Link>
          <div className="login-panel">
            <Link className="back-link" href="/">
              ← Volver al inicio
            </Link>
            <div className="login-heading">
              <p className="eyebrow">SPORTPASS · UNIVERSIDAD ICESI</p>
              <h2>Inicia sesión</h2>
              <p>Ingresa con tu cuenta institucional para continuar.</p>
            </div>
            <div className="demo-profiles">
              <label className="field-label" htmlFor="profile-role">
                PERFIL DE PRUEBA
              </label>
              <select
                id="profile-role"
                className="profile-select"
                value={profiles.find((profile) => profile.email === email)?.role ?? ""}
                onChange={(event) => {
                  const profile = profiles.find(
                    (option) => option.role === event.target.value,
                  );
                  if (profile) {
                    setEmail(profile.email);
                    setPassword(profile.password);
                    setError("");
                  }
                }}
              >
                <option value="">Selecciona un perfil…</option>
                {profiles.map((profile) => (
                  <option key={profile.role} value={profile.role}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-divider">
              <span>o ingresa tus datos</span>
            </div>
            <form onSubmit={login} className="login-form">
              <label className="field-label" htmlFor="email">
                CORREO INSTITUCIONAL
              </label>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nombre@icesi.edu.co"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <label className="field-label password-label" htmlFor="password">
                CONTRASEÑA
              </label>
              <div className="input-wrap">
                <span className="input-icon">⌑</span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary-button submit-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Validando…" : "Iniciar sesión"}
                <span>↗</span>
              </button>
            </form>
            <p className="secure-note">
              Acceso exclusivo para cuentas @icesi.edu.co
            </p>
          </div>
        </section>
      </div>
      <footer className="login-footer">SportPass · Universidad Icesi</footer>
    </main>
  );
}

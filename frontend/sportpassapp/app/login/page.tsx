"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      if (!response.ok) throw new Error("login_failed");
      const result = (await response.json()) as Session;
      if (!result.user?.roles?.length || !result.accessToken)
        throw new Error("invalid_response");
      localStorage.setItem(SESSION_KEY, JSON.stringify(result));
      router.replace(dashboardPath(result.user.roles[0]));
    } catch {
      setError(ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <a className="login-logo" href="/">
          <img src="/images/ICESI_logo.svg" alt="Universidad Icesi" />
        </a>
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
        <a className="mobile-login-logo" href="/">
          <img src="/images/ICESI_logo.svg" alt="Universidad Icesi" />
        </a>
        <div className="login-panel">
          <a className="back-link" href="/">
            ← Volver al inicio
          </a>
          <div className="login-heading">
            <p className="eyebrow">SPORTPASS · UNIVERSIDAD ICESI</p>
            <h2>Inicia sesión</h2>
            <p>Ingresa con tu cuenta institucional para continuar.</p>
          </div>
          <div className="demo-profiles">
            <p className="field-label">PERFILES DE PRUEBA</p>
            <div className="profile-list">
              {profiles.map((profile) => (
                <button
                  type="button"
                  className={`profile-option ${email === profile.email ? "selected" : ""}`}
                  key={profile.role}
                  onClick={() => {
                    setEmail(profile.email);
                    setPassword(profile.password);
                    setError("");
                  }}
                >
                  <span className="profile-icon">{profile.icon}</span>
                  <span>{profile.label}</span>
                  <span className="profile-arrow">↗</span>
                </button>
              ))}
            </div>
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
        <footer className="login-footer">SportPass · Universidad Icesi</footer>
      </section>
    </main>
  );
}

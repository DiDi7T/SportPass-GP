import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-page">
      <header className="topbar">
        <a className="brand" href="/">
          <img src="/images/ICESI_logo.svg" alt="Universidad Icesi" />
        </a>
        <nav className="landing-nav">
          <a href="#bienestar">SportPass</a>
          <Link className="header-login" href="/login">
            Iniciar sesión <span>↗</span>
          </Link>
        </nav>
      </header>
      <section className="landing-hero" id="bienestar">
        <div
          className="landing-photo"
          role="img"
          aria-label="Escenario deportivo en el campus Icesi"
        />
        <div className="landing-shade" />
        <div className="landing-copy">
          <p className="eyebrow">DEPORTE · COMUNIDAD · BIENESTAR</p>
          <h1>SportPass</h1>
          <p>
            El campus se mueve contigo. Encuentra tu espacio, activa tu
            bienestar y comparte lo que te apasiona.
          </p>
          <Link className="primary-button" href="/login">
            Explorar SportPass <span>↗</span>
          </Link>
        </div>
        <span className="hero-caption">
          DEPORTE Y BIENESTAR · UNIVERSIDAD ICESI
        </span>
      </section>
      <section className="landing-links">
        <a href="#bienestar">
          <span className="link-symbol">◎</span>
          <span>
            <strong>Encuentra tu actividad</strong>
            <small>Explora el deporte en el campus</small>
          </span>
          <b>↗</b>
        </a>
        <a href="#bienestar">
          <span className="link-symbol">⌁</span>
          <span>
            <strong>Conecta y participa</strong>
            <small>Comparte con la comunidad Icesi</small>
          </span>
          <b>↗</b>
        </a>
        <a href="#bienestar">
          <span className="link-symbol">◷</span>
          <span>
            <strong>Vive el campus</strong>
            <small>Tu bienestar, a tu ritmo</small>
          </span>
          <b>↗</b>
        </a>
      </section>
      <footer className="site-footer">
        <span>SportPass · Universidad Icesi</span>
        <span>Bienestar que se mueve contigo</span>
      </footer>
    </main>
  );
}

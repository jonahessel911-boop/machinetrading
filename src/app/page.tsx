import Link from "next/link";
import { SoldSlider } from "@/components/SoldSlider";

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-clean.png"
              alt="heftruckverkocht.nl"
              className="logo-img"
            />
          </Link>
          <nav className="nav">
            <a href="#hoe-werkt-het">Hoe het werkt</a>
            <a href="#waarom">Waarom wij</a>
            <Link href="/form">Meld aan</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-layout">
            <div className="hero-stage">
              <div className="hero-orange">
                <div className="hero-copy">
                  <h1>
                    Je heftruck in 24 uur verkocht door een betrouwbare koper
                    met een goed bod
                  </h1>
                  <p>
                    Wij onderhandelen met heftruckbedrijven in heel Nederland
                    om de beste prijs voor jouw machine te krijgen — zonder dat
                    jij er werk aan hebt.
                  </p>
                  <div className="hero-form-row">
                    <Link href="/form" className="btn-black">
                      Meld mijn heftruck gratis aan →
                    </Link>
                  </div>
                </div>
              </div>
              <div className="hero-bars" aria-hidden="true">
                <span />
                <span />
              </div>
              <div className="hero-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero-heftruck.png"
                  alt="Oranje Toyota heftruck"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="proof">
          <div className="container proof-intro">
            <h2>
              97% van onze verkopers kiest voor heftruckverkocht vanwege de
              persoonlijke begeleiding tijdens de verkoop
            </h2>
            <p>
              Wil je jouw heftruck makkelijk kwijt zonder eindeloos gedoe? Wij
              koppelen je aan een betrouwbare koper, onderhandelen namens jou
              en zorgen dat alles netjes wordt afgehandeld.
            </p>
          </div>
          <SoldSlider />
        </section>

        <section className="section" id="hoe-werkt-het">
          <div className="container center">
            <h2>Hoe werkt het?</h2>
            <p className="section-sub">
              Wij maken je heftruck verkopen simpel. Zo werkt het.
            </p>
            <div className="steps">
              <article className="step">
                <div className="step-visual step-a">
                  <span className="step-badge">1</span>
                </div>
                <h3>Bepaal de waarde</h3>
                <p>
                  Gebruik onze gratis tool en geef info over je heftruck. Je zit
                  nergens aan vast.
                </p>
              </article>
              <article className="step">
                <div className="step-visual step-b">
                  <span className="step-badge">2</span>
                </div>
                <h3>Krijg de beste deal</h3>
                <p>
                  Na je aanmelding gaan wij direct op zoek naar een betrouwbare
                  koper in ons netwerk.
                </p>
              </article>
              <article className="step">
                <div className="step-visual step-c">
                  <span className="step-badge">3</span>
                </div>
                <h3>Ontvang je geld</h3>
                <p>
                  Ga je akkoord? Dan zorgen wij voor de afhandeling. Snel,
                  duidelijk en vrijblijvend.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="compare-wrap">
          <div className="container">
            <h2 className="center compare-title">
              heftruckverkocht is het platform waarmee jij zonder moeite een
              eerlijke prijs voor je heftruck krijgt.
            </h2>
            <div className="compare">
              <article className="compare-card">
                <h3>Dealer</h3>
                <p className="price muted-price">€7.000</p>
                <ul>
                  <li className="bad">Minder geld voor je machine</li>
                  <li className="bad">Specifieke voorwaarden</li>
                  <li className="bad">Minder inruilwaarde</li>
                </ul>
                <div className="compare-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/sold/linde-h.png" alt="" />
                </div>
              </article>
              <article className="compare-card featured">
                <h3>heftruckverkocht</h3>
                <div className="stars" aria-hidden="true">
                  ★★★★★
                </div>
                <ul>
                  <li className="good">Wij onderhandelen voor jou</li>
                  <li className="good">Direct geld op je rekening</li>
                  <li className="good">Snel en gemakkelijk</li>
                </ul>
                <div className="compare-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/hero-heftruck.png" alt="" />
                </div>
              </article>
              <article className="compare-card">
                <h3>Zelf online verkopen</h3>
                <p className="price muted-price">€8.500</p>
                <ul>
                  <li className="bad">Vreemden aan de deur</li>
                  <li className="bad">Meer concurrentie</li>
                  <li className="bad">Geen zekerheid</li>
                </ul>
                <div className="compare-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/sold/manitou-mh25.png" alt="" />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section why" id="waarom">
          <div className="container why-grid">
            <div>
              <h2>Waarom heftruckverkocht?</h2>
              <p className="section-sub left">
                Bij ons verkoop je je heftruck zonder gedoe, gezeur of risico.
                Wij regelen het contact met betrouwbare dealers — jij hoeft
                alleen maar ja te zeggen.
              </p>
              <div className="why-list">
                <article>
                  <span className="why-icon why-icon-clock" aria-hidden="true" />
                  <div>
                    <h3>Verkoop binnen 24 uur</h3>
                    <p>
                      We brengen jouw machine snel onder de aandacht van
                      serieuze heftruckbedrijven.
                    </p>
                  </div>
                </article>
                <article>
                  <span className="why-icon why-icon-deal" aria-hidden="true" />
                  <div>
                    <h3>Eerlijke biedingen</h3>
                    <p>
                      Geen lage opkoopprijzen. Wij onderhandelen voor jou binnen
                      ons dealernetwerk.
                    </p>
                  </div>
                </article>
                <article>
                  <span className="why-icon why-icon-check" aria-hidden="true" />
                  <div>
                    <h3>Jij bepaalt. Altijd vrijblijvend.</h3>
                    <p>
                      Tevreden met het bod? Dan regelen wij de rest. Zo niet:
                      geen probleem.
                    </p>
                  </div>
                </article>
              </div>
            </div>
            <div className="why-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-heftruck.png"
                alt="Heftruck klaar voor verkoop"
              />
            </div>
          </div>
        </section>

        <section className="cta-band">
          <div className="container cta-inner">
            <h2>Meld je heftruck vandaag nog aan</h2>
            <p>Je zit nergens aan vast. Gewoon duidelijk en snel geregeld.</p>
            <div className="hero-form-row" style={{ justifyContent: "center" }}>
              <Link href="/form" className="btn-black">
                Meld mijn heftruck gratis aan →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h4>HEFTRUCKVERKOCHT</h4>
            <a href="#waarom">Over ons</a>
            <a href="#hoe-werkt-het">Hoe het werkt</a>
            <Link href="/form">Aanmelden</Link>
          </div>
          <div>
            <h4>Hulp nodig?</h4>
            <Link href="/form">FAQ</Link>
            <Link href="/form">Algemene voorwaarden</Link>
            <Link href="/form">Privacyverklaring</Link>
          </div>
          <div>
            <h4>Volg ons</h4>
            <a href="https://facebook.com" target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

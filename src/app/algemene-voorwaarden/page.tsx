import type { Metadata } from "next";
import Link from "next/link";
import { getCompanyInfo } from "@/lib/company";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden | heftruckverkocht.nl",
  description:
    "Algemene voorwaarden voor verkoopbemiddeling van heftrucks en producten via heftruckverkocht.nl.",
};

export default function AlgemeneVoorwaardenPage() {
  const company = getCompanyInfo();

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
            <Link href="/">Home</Link>
            <Link href="/form/1">Meld aan</Link>
          </nav>
        </div>
      </header>

      <main className="legal-page">
        <div className="container legal-inner">
          <p className="legal-eyebrow">Versie HV-2026-01</p>
          <h1>Algemene Voorwaarden heftruckverkocht.nl</h1>
          <p className="legal-intro">
            Deze Algemene Voorwaarden zijn van toepassing op alle
            verkoopbemiddelingsdiensten van heftruckverkocht.nl voor heftrucks
            en overige producten via het heftruckverkocht-platform, en zijn
            raadpleegbaar via onze website en opvraagbaar via{" "}
            <a href={`mailto:${company.email}`}>{company.email}</a>.
          </p>

          <section>
            <h2>Artikel 1. Toepasselijkheid</h2>
            <p>
              <strong>1.1</strong> Deze algemene voorwaarden zijn van toepassing
              op iedere afspraak (zowel mondeling als schriftelijk gemaakt),
              aanbieding, bod, offerte of overeenkomst betrekking hebbende op
              de verkoopbemiddeling door heftruckverkocht.nl, tenzij
              uitdrukkelijk schriftelijk anders is overeengekomen.
            </p>
            <p>
              <strong>1.2</strong> Door gebruik te maken van
              heftruckverkocht.nl verkoopbemiddeling verklaart verkoper akkoord
              te gaan met deze algemene voorwaarden. Afwijken van deze
              voorwaarden kan enkel als dit uitdrukkelijk en schriftelijk is
              overeengekomen.
            </p>
          </section>

          <section>
            <h2>Artikel 2. Definities</h2>
            <p>
              <strong>2.1</strong> heftruckverkocht.nl: de bemiddelaar die een
              potentiële koper en verkoper van een heftruck of ander product
              bij elkaar brengt en een voor alle partijen aanvaardbaar Bod
              tracht te bemiddelen via het heftruckverkocht-platform.
            </p>
            <p>
              <strong>2.2</strong> Verkoper: iedere persoon die via bemiddeling
              van heftruckverkocht.nl een heftruck of ander product wenst te
              verkopen aan een koper en bij aanmelding bij heftruckverkocht.nl
              akkoord heeft gegeven op de toepasselijkheid van deze algemene
              voorwaarden.
            </p>
            <p>
              <strong>2.3</strong> Koper: ieder (heftruck)bedrijf of andere
              professionele afnemer dat potentieel interesse heeft in de door
              Verkoper aangeboden heftruck of ander product en een Bod aan
              heftruckverkocht.nl heeft uitgebracht waarvoor deze heeft
              aangegeven het product van Verkoper te willen gaan kopen.
            </p>
            <p>
              <strong>2.4</strong> Het Bod: het bedrag (eventueel aangevuld met
              randvoorwaardelijke zaken als het halen of brengen van het
              product) dat heftruckverkocht.nl met Koper heeft afgestemd en dat
              door heftruckverkocht.nl aan Verkoper wordt gecommuniceerd ter
              acceptatie. De aan het Bod gestelde voorwaarden zijn beschreven
              in artikel 3.
            </p>
            <p>
              <strong>2.5</strong> De Verkoopbemiddeling: de dienst van
              heftruckverkocht.nl, waarbij als eindresultaat geldt dat een
              Verkoper en een potentiële Koper aan elkaar worden gekoppeld op
              basis van een door beide partijen geaccepteerd Bod. Voor de
              Verkoopbemiddeling van heftruckverkocht.nl krijgt Verkoper géén
              kosten doorbelast.
            </p>
            <p>
              <strong>2.6</strong> De Verkoop: het moment dat koper en verkoper
              de eigendom van de heftruck of het product aan elkaar overdragen
              en beide partijen daarbij aan hun wederzijdse verplichtingen
              hebben voldaan. Verkoop vindt rechtstreeks plaats tussen Verkoper
              en Koper zoals nader uitgewerkt in artikel 4.
            </p>
            <p>
              <strong>2.7</strong> Product: de door Verkoper via het
              heftruckverkocht-platform aangeboden heftruck of ander goed
              waarvoor bemiddeling wordt gevraagd.
            </p>
          </section>

          <section>
            <h2>Artikel 3. Het Bod</h2>
            <p>
              <strong>3.1</strong> Als Verkoper het Bod accepteert en de
              acceptatie aan heftruckverkocht.nl heeft gecommuniceerd, is
              aanvaarding van het Bod bindend voor Verkoper. Acceptatie van het
              Bod kan zowel schriftelijk (zoals via mail of app) als mondeling
              plaatsvinden. Een bindend akkoord kan in het bijzonder{" "}
              <strong>telefonisch</strong> tot stand komen wanneer Verkoper
              tijdens een telefoongesprek met heftruckverkocht.nl het Bod
              accepteert.
            </p>
            <p>
              <strong>3.2</strong> Telefonische gesprekken tussen
              heftruckverkocht.nl en Verkoper (en waar relevant Koper) kunnen
              worden opgenomen. Het doel van deze opname is het vastleggen van
              het akkoord op het Bod en overige afspraken, zodat de verkoop via
              het heftruckverkocht-platform kan worden gerealiseerd. Door
              deelname aan het gesprek stemt Verkoper in met deze opname.
              Opnamen worden zorgvuldig bewaard en uitsluitend gebruikt voor
              dit doel, voor zover wettelijk toegestaan.
            </p>
            <p>
              <strong>3.3</strong> Door acceptatie van het Bod, machtigt
              Verkoper heftruckverkocht.nl om de contactgegevens van koper en
              verkoper (zoals naam, telefoonnummer, emailadres) over en weer
              aan elkaar ter beschikking te stellen.
            </p>
            <p>
              <strong>3.4</strong> Zodra Verkoper en Koper na een door beide
              geaccepteerd Bod door heftruckverkocht.nl met elkaar in contact
              zijn gebracht, eindigt de dienst Verkoopbemiddeling van
              heftruckverkocht.nl.
            </p>
            <p>
              <strong>3.5</strong> Verkoper verplicht zich binnen uiterlijk 2
              werkdagen (tenzij anders afgesproken bij het Bod) contact op te
              nemen met de Koper om de verkoop conform het Bod (en de daarbij
              gemaakte afspraken) in gang te zetten. Indien Verkoper na
              meerdere pogingen hiertoe géén contact kan krijgen met Koper of
              merkt dat Koper zich niet aan de afspraken houdt, dient Verkoper
              direct contact op te nemen met heftruckverkocht.nl.
            </p>
            <p>
              <strong>3.6</strong> heftruckverkocht.nl zal zich inspannen om bij
              potentiële Kopers een Bod te bemiddelen dat voor Verkoper
              acceptabel is. heftruckverkocht.nl is daarbij afhankelijk van
              toezeggingen die door potentiële Kopers (zijnde
              heftruckbedrijven of andere professionele afnemers) worden gedaan.
              Hoewel heftruckverkocht.nl door Kopers gedane biedingen zo goed
              mogelijk vastlegt, kan het voorkomen dat een potentiële Koper een
              eerder gedaan Bod weer intrekt. In dat geval komt het Bod te
              vervallen en is heftruckverkocht.nl aan Verkoper nimmer een
              (schade)vergoeding verschuldigd.
            </p>
            <p>
              <strong>3.7</strong> Indien Verkoper na een geaccepteerd bod toch
              besluit hiervan af te willen zien, is deze aan
              heftruckverkocht.nl een annuleringsvergoeding verschuldigd van 5%
              van het afgesproken verkoopbedrag (het Bod) met een minimum van €
              300,-.
            </p>
          </section>

          <section>
            <h2>Artikel 4. De Verkoop</h2>
            <p>
              <strong>4.1</strong> Verkoper verkoopt de heftruck of het product
              rechtstreeks aan koper, gelijk koper deze rechtstreeks koopt van
              verkoper. Een eventuele Verkoopovereenkomst wordt gesloten tussen
              Koper en Verkoper als partijen. heftruckverkocht.nl is inzake de
              Verkoop geen partij.
            </p>
            <p>
              <strong>4.2</strong> Het door Koper gedane Bod is gebaseerd op de
              door Verkoper opgegeven productomschrijving, informatie en
              aangeleverde foto&apos;s. Onjuiste of ontbrekende informatie
              zoals onvermelde schade, gebreken, storingen, kenmerken,
              urenstand of kilometerstand, kan leiden tot intrekking van het Bod
              zonder dat Koper of heftruckverkocht.nl aan Verkoper enige
              schadevergoeding is verschuldigd.
            </p>
            <p>
              <strong>4.3</strong> Indien de Verkoop van de heftruck of het
              product om wat voor reden dan ook tussen verkoper en koper niet
              of niet conform afspraken tot stand komt, is heftruckverkocht.nl
              hier nimmer aansprakelijk voor en is zij aan verkoper geen
              (schade)vergoeding, in welke vorm dan ook, verschuldigd.
            </p>
            <p>
              <strong>4.4</strong> Indien de verkoop niet doorgaat en dit
              toerekenbaar is aan Verkoper is deze de bij artikel 3.7
              beschreven annuleringskosten aan heftruckverkocht.nl verschuldigd.
              Onder verwijtbaar vallen in ieder geval onderstaande situaties:
            </p>
            <ul>
              <li>
                Verkoper heeft reëel verwijtbaar onjuiste of ontbrekende
                informatie verstrekt waardoor Koper conform artikel 4.2 het Bod
                heeft ingetrokken;
              </li>
              <li>
                Verkoper heeft geen of niet tijdig contact opgenomen met de
                Koper of zich niet gehouden aan de afspraken die bij het Bod
                zijn gecommuniceerd of die later in het proces tussen Verkoper
                en Koper zijn gemaakt;
              </li>
              <li>
                Verkoper alsnog afziet van Verkoop van de heftruck of het
                product, of niet bevoegd was deze te verkopen.
              </li>
            </ul>
            <p>
              <strong>4.5</strong> Indien de verkoop vanuit de zijde van
              Verkoper niet doorgaat en Verkoper overmacht kan aantonen, is
              deze géén annuleringskosten aan heftruckverkocht.nl verschuldigd.
              Onder overmacht valt diefstal of een nieuwe schadegebeurtenis met
              de heftruck of het product.
            </p>
          </section>

          <section>
            <h2>Artikel 5. Geschillen</h2>
            <p>
              Geschillen worden voorgelegd aan de bevoegde rechter volgens de
              wet, tenzij de wet dwingend anders bepaalt. Op de diensten van
              heftruckverkocht.nl is Nederlands recht van toepassing.
            </p>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h4>HEFTRUCKVERKOCHT</h4>
            <Link href="/">Home</Link>
            <Link href="/form/1">Aanmelden</Link>
          </div>
          <div>
            <h4>Hulp nodig?</h4>
            <Link href="/algemene-voorwaarden">Algemene voorwaarden</Link>
            <a href={`mailto:${company.email}`}>{company.email}</a>
          </div>
          <div>
            <h4>Contact</h4>
            <a href={`mailto:${company.email}`}>Mail ons</a>
            <a href={`tel:${company.phone.replace(/\s/g, "")}`}>
              {company.phone}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

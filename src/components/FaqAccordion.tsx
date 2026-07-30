"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Is het echt 100% gratis voor mij als verkoper?",
    a: "Ja, als verkoper van de heftruck betaal je niks. Wij zorgen voor de beste deal in ons nationale netwerk van betrouwbare handelaren.",
  },
  {
    q: "Hoe snel krijg ik een bod?",
    a: "In de meeste gevallen binnen 24 uur. Zodra je heftruck is aangemeld, zoeken we in ons netwerk van 150+ heftruckbedrijven naar serieuze kopers en komen we bij je terug met een concreet bod.",
  },
  {
    q: "Zit ik ergens aan vast als ik me aanmeld?",
    a: "Nee. Aanmelden is vrijblijvend. Pas als je een bod telefonisch of schriftelijk accepteert, ga je een verplichting aan. Bevalt het bod niet? Dan zeg je gewoon nee — zonder kosten of gedoe.",
  },
  {
    q: "Welke heftrucks en producten kan ik aanmelden?",
    a: "Alle gangbare merken en types: diesel, LPG, elektrisch, reachtrucks, stapelaars en meer. Ook als je het exacte model niet weet, kun je gewoon starten — wij helpen de rest uitzoeken.",
  },
  {
    q: "Moet ik zelf onderhandelen met dealers?",
    a: "Nee. Wij onderhandelen namens jou binnen ons netwerk. Jij krijgt een duidelijk bod voorgelegd. Accepteer je het, dan brengen we jou en de koper met elkaar in contact voor de afronding.",
  },
  {
    q: "Wanneer en hoe krijg ik mijn geld?",
    a: "De koper komt de heftruck op locatie ophalen en betaalt direct bij overdracht. Er wordt op dat moment niet meer onderhandeld — het afgesproken bod staat vast.",
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="faq-list">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className={`faq-item${isOpen ? " is-open" : ""}`}
          >
            <button
              type="button"
              className="faq-trigger"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              id={`faq-btn-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{item.q}</span>
              <span className="faq-icon" aria-hidden="true" />
            </button>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-btn-${i}`}
              className="faq-panel"
              hidden={!isOpen}
            >
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

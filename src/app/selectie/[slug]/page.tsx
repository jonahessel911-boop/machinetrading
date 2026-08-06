import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoGallery } from "@/components/marketplace/PhotoGallery";
import { SelectionBidForm } from "@/components/SelectionBidForm";
import { SelectionViewTracker } from "@/components/SelectionViewTracker";
import { getCompanyInfo } from "@/lib/company";
import { crmGetLead } from "@/lib/crm";
import { getDealerSession } from "@/lib/dealer-auth";
import { crmGetSelectionBySlug } from "@/lib/selections";
import { vehicleLabel } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function SelectiePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const selection = await crmGetSelectionBySlug(slug);
  if (!selection) notFound();

  const leads = [];
  for (const id of selection.leadIds) {
    const lead = await crmGetLead(id);
    if (lead) leads.push(lead);
  }

  const company = getCompanyInfo();
  const telHref = company.phone.replace(/\s/g, "");
  const dealer = await getDealerSession();

  return (
    <div className="share-page">
      <SelectionViewTracker slug={selection.slug} />
      <header className="share-header">
        <div className="share-header-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-clean.png"
            alt="heftruckverkocht.nl"
            className="share-logo"
          />
          <div className="share-header-actions">
            <a href={`tel:${telHref}`} className="share-header-link">
              {company.phone}
            </a>
            <a
              href={`mailto:${company.email}?subject=${encodeURIComponent(`Interesse in selectie: ${selection.naam}`)}`}
              className="share-header-cta"
            >
              Mail ons
            </a>
          </div>
        </div>
      </header>

      <main className="share-main">
        <div className="share-hero">
          <p className="share-eyebrow">Heftruck selectie speciaal voor u</p>
          <h1 className="share-title">{selection.naam}</h1>
          <p className="share-meta">
            {leads.length}{" "}
            {leads.length === 1 ? "heftruck" : "heftrucks"} · plaats direct een
            bod per machine
          </p>
        </div>

        <div className="share-list">
          {leads.map((lead, index) => {
            const title = vehicleLabel(lead.merk, lead.model);
            const photos = lead.photos ?? [];
            return (
              <article key={lead.id} className="share-card">
                <div className="share-card-head">
                  <span className="share-card-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="share-card-title">{title}</h2>
                    {lead.woonplaats ? (
                      <p className="share-card-loc">{lead.woonplaats}</p>
                    ) : null}
                  </div>
                </div>

                {lead.omschrijving ? (
                  <p className="share-omschrijving">{lead.omschrijving}</p>
                ) : null}

                {photos.length > 0 ? (
                  <PhotoGallery
                    photos={photos}
                    gridClassName="share-photo-grid"
                    thumbClassName="share-photo-thumb"
                  />
                ) : (
                  <p className="share-empty">Nog geen foto&apos;s.</p>
                )}

                <SelectionBidForm
                  slug={slug}
                  leadId={lead.id}
                  machineLabel={title}
                  dealerPrefill={
                    dealer
                      ? {
                          naam: dealer.naam,
                          email: dealer.email,
                          telefoon: dealer.telefoon,
                          bedrijf: dealer.bedrijf,
                        }
                      : null
                  }
                />
              </article>
            );
          })}
        </div>

        {leads.length === 0 ? (
          <p className="share-empty">Geen heftrucks in deze selectie.</p>
        ) : null}

        <aside className="share-cta-box">
          <h2>Vragen over deze selectie?</h2>
          <p>
            Bel of mail ons — we helpen je graag verder met prijs en
            beschikbaarheid.
          </p>
          <div className="share-cta-actions">
            <a
              className="share-cta-primary"
              href={`mailto:${company.email}?subject=${encodeURIComponent(`Interesse in selectie: ${selection.naam}`)}`}
            >
              Mail {company.email}
            </a>
            <a className="share-cta-secondary" href={`tel:${telHref}`}>
              Bel {company.phone}
            </a>
          </div>
        </aside>

        <p className="share-footer">
          <Link href="/">heftruckverkocht.nl</Link>
          {" · "}
          Computerweg 7, 3542DP Utrecht
        </p>
      </main>
    </div>
  );
}

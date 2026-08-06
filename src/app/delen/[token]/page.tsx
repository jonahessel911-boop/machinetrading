import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoGallery } from "@/components/marketplace/PhotoGallery";
import { getCompanyInfo } from "@/lib/company";
import { crmGetLead } from "@/lib/crm";
import { verifyLeadShareToken } from "@/lib/lead-share";
import { vehicleLabel } from "@/lib/status";

export default async function DelenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);
  const payload = await verifyLeadShareToken(token);
  if (!payload) notFound();

  const lead = await crmGetLead(payload.leadId);
  if (!lead) notFound();

  const company = getCompanyInfo();
  const title = vehicleLabel(lead.merk, lead.model);
  const photos = lead.photos ?? [];
  const telHref = company.phone.replace(/\s/g, "");

  return (
    <div className="share-page">
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
              href={`mailto:${company.email}?subject=${encodeURIComponent(`Interesse in ${title}`)}`}
              className="share-header-cta"
            >
              Mail ons
            </a>
          </div>
        </div>
      </header>

      <main className="share-main">
        <div className="share-hero">
          <p className="share-eyebrow">Privé aanbod</p>
          <h1 className="share-title">{title}</h1>
          {lead.woonplaats ? (
            <p className="share-meta">Locatie: {lead.woonplaats}</p>
          ) : (
            <p className="share-meta">Via heftruckverkocht.nl</p>
          )}
        </div>

        <article className="share-card">
          {lead.omschrijving ? (
            <section className="share-section" style={{ marginTop: 0 }}>
              <h2>Omschrijving</h2>
              <p className="share-omschrijving">{lead.omschrijving}</p>
            </section>
          ) : null}

          <section className="share-section" style={{ marginBottom: 0 }}>
            <h2>Foto&apos;s {photos.length ? `(${photos.length})` : ""}</h2>
            {photos.length > 0 ? (
              <PhotoGallery
                photos={photos}
                gridClassName="share-photo-grid"
                thumbClassName="share-photo-thumb"
              />
            ) : (
              <p className="share-empty">Nog geen foto&apos;s beschikbaar.</p>
            )}
          </section>
        </article>

        <aside className="share-cta-box">
          <h2>Interesse?</h2>
          <p>Neem contact op — we helpen je graag verder.</p>
          <div className="share-cta-actions">
            <a
              className="share-cta-primary"
              href={`mailto:${company.email}?subject=${encodeURIComponent(`Interesse in ${title}`)}`}
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

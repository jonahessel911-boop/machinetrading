/** Kleine thumbnail van de eerste lead-foto (lijstweergave). */
export function LeadPhotoThumb({
  photos,
}: {
  photos?: { url: string }[] | null;
}) {
  const count = photos?.length ?? 0;
  const first = photos?.find((p) => p.url)?.url;

  if (!first) {
    return <span className="crm-muted">{count}</span>;
  }

  return (
    <span className="crm-lead-photo-thumb-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={first}
        alt=""
        className="crm-lead-photo-thumb"
        loading="lazy"
      />
      {count > 1 ? (
        <span className="crm-lead-photo-count">+{count - 1}</span>
      ) : null}
    </span>
  );
}

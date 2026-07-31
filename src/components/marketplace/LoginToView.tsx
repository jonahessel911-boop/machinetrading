import Link from "next/link";

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * Blur + "Login om te bekijken" overlay voor gasten.
 */
export function LoginToView({
  href = "/dealer/login",
  label = "Login om te bekijken",
  className = "",
  children,
  compact = false,
  /** Gebruik span i.p.v. Link (voorkomt geneste <a> in cards) */
  inert = false,
}: {
  href?: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
  compact?: boolean;
  inert?: boolean;
}) {
  const ctaClass = "mp-gated-cta";
  const cta = inert ? (
    <span className={ctaClass}>
      <LockIcon />
      <span>{label}</span>
    </span>
  ) : (
    <Link href={href} className={ctaClass}>
      <LockIcon />
      <span>{label}</span>
    </Link>
  );

  return (
    <div className={`mp-gated${compact ? " mp-gated--compact" : ""} ${className}`.trim()}>
      <div className="mp-gated-blur" aria-hidden>
        {children}
      </div>
      {cta}
    </div>
  );
}

export function LoginToBidCard({
  nextPath,
  isLive,
}: {
  nextPath: string;
  isLive: boolean;
}) {
  const loginHref = `/dealer/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="crm-card mp-login-bid-card">
      <div className="crm-card-head">
        {isLive ? "Inloggen om te bieden" : "Veiling gesloten"}
      </div>
      <div className="crm-card-body">
        {isLive ? (
          <>
            <p className="crm-muted" style={{ marginBottom: "1rem" }}>
              Log in of maak een dealer-account aan om alle details te zien en
              een bod te plaatsen.
            </p>
            <div className="crm-actions">
              <Link href={loginHref} className="crm-btn crm-btn-primary">
                <LockIcon /> Login om te bieden
              </Link>
            </div>
          </>
        ) : (
          <p className="crm-muted">
            Deze veiling is niet meer actief.
          </p>
        )}
      </div>
    </div>
  );
}

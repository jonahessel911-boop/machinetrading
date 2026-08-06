"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LeadPhotoThumb } from "@/components/admin/LeadPhotoThumb";
import { SelectionShareModal } from "@/components/admin/SelectionShareModal";
import {
  SELECTABLE_LEAD_STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import type { Lead } from "@/lib/mappers";
import {
  formatDateTime,
  formatEuro,
  labelForStatus,
  leadStatusBadgeClass,
} from "@/lib/status";

export function LeadsTableClient({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const selectedIds = useMemo(() => [...selected], [selected]);

  function statusOf(lead: Lead) {
    return statuses[lead.id] ?? lead.status;
  }

  async function updateStatus(lead: Lead, next: string) {
    if (!next || next === statusOf(lead) || savingId) return;
    const prev = statusOf(lead);
    setStatuses((s) => ({ ...s, [lead.id]: next }));
    setSavingId(lead.id);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Status wijzigen mislukt");
      setToast(
        `Status ${lead.naam}: ${STATUS_LABELS[next] ?? next}`,
      );
      router.refresh();
    } catch (err) {
      setStatuses((s) => ({ ...s, [lead.id]: prev }));
      setToast(err instanceof Error ? err.message : "Status wijzigen mislukt");
    } finally {
      setSavingId(null);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setShareOpen(false);
  }

  return (
    <>
      <div className="crm-actions" style={{ marginBottom: "0.85rem" }}>
        {!selectMode ? (
          <button
            type="button"
            className="crm-btn crm-btn-primary"
            onClick={() => {
              setSelectMode(true);
              setToast("");
            }}
          >
            Selecteer heftrucks
          </button>
        ) : (
          <>
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={selected.size === 0}
              onClick={() => setShareOpen(true)}
            >
              Verstuur naar handelaar ({selected.size})
            </button>
            <button type="button" className="crm-btn" onClick={exitSelectMode}>
              Annuleren
            </button>
            <span className="crm-muted">
              {selected.size} geselecteerd · klik op een rij om te (de)selecteren
            </span>
          </>
        )}
      </div>

      {toast ? (
        <p
          className={
            toast.toLowerCase().includes("mislukt") ||
            toast.toLowerCase().includes("fout") ||
            toast.toLowerCase().includes("migratie") ||
            toast.toLowerCase().includes("niet toegestaan") ||
            toast.toLowerCase().includes("ongeldig")
              ? "crm-toast crm-toast-error"
              : "crm-muted"
          }
          style={{ marginBottom: "0.75rem" }}
        >
          {toast}
        </p>
      ) : null}

      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              {selectMode ? (
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={
                      leads.length > 0 && selected.size === leads.length
                    }
                    onChange={toggleAll}
                    aria-label="Alles selecteren"
                  />
                </th>
              ) : null}
              <th>Lead</th>
              <th>Machine</th>
              <th>Timing</th>
              <th>Status</th>
              <th>Hoogste bod</th>
              <th>Foto&apos;s</th>
              <th>Koper</th>
              <th>Aangemeld</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const isOn = selected.has(lead.id);
              const status = statusOf(lead);
              return (
                <tr
                  key={lead.id}
                  className={
                    selectMode
                      ? `crm-select-row${isOn ? " is-selected" : ""}`
                      : "crm-click-row"
                  }
                  tabIndex={0}
                  role={selectMode ? "checkbox" : "link"}
                  aria-checked={selectMode ? isOn : undefined}
                  onClick={() => {
                    if (selectMode) toggle(lead.id);
                    else router.push(`/admin/leads/${lead.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (selectMode) toggle(lead.id);
                      else router.push(`/admin/leads/${lead.id}`);
                    }
                  }}
                >
                  {selectMode ? (
                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(lead.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => toggle(lead.id)}
                        aria-label={`Selecteer ${lead.naam}`}
                      />
                    </td>
                  ) : null}
                  <td>
                    <strong>{lead.naam}</strong>
                    <div className="crm-muted">{lead.telefoon}</div>
                    <div className="crm-muted">{lead.email}</div>
                  </td>
                  <td>
                    {lead.merk} {lead.model}
                  </td>
                  <td>
                    {lead.timing}
                    {lead.richtprijs != null ? (
                      <div className="crm-muted">
                        Richtprijs {formatEuro(lead.richtprijs)}
                      </div>
                    ) : null}
                  </td>
                  <td
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <select
                      className={`crm-select crm-status-select ${leadStatusBadgeClass(status)}`}
                      value={status}
                      disabled={savingId === lead.id}
                      aria-label={`Status ${lead.naam}`}
                      onChange={(e) => {
                        void updateStatus(lead, e.target.value);
                      }}
                    >
                      {!SELECTABLE_LEAD_STATUSES.includes(
                        status as (typeof SELECTABLE_LEAD_STATUSES)[number],
                      ) ? (
                        <option value={status}>
                          {labelForStatus(status, lead.contactAttempts)} (oud)
                        </option>
                      ) : null}
                      {SELECTABLE_LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {lead.highestBid != null ? (
                      <div className="crm-highest-bid">
                        <strong>{formatEuro(lead.highestBid)}</strong>
                        {lead.highestBidBidder ? (
                          <div className="crm-muted">{lead.highestBidBidder}</div>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <LeadPhotoThumb photos={lead.photos} />
                  </td>
                  <td>{lead.buyer?.bedrijf ?? "—"}</td>
                  <td>{formatDateTime(lead.createdAt)}</td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={selectMode ? 9 : 8}>Geen leads gevonden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SelectionShareModal
        leadIds={selectedIds}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onDone={(message) => {
          setToast(message);
          exitSelectMode();
        }}
      />
    </>
  );
}

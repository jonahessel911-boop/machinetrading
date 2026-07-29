"use client";

import { useMemo, useState } from "react";

export type FinanceValues = {
  inkoopprijs: number | null;
  marge: number | null;
  nettoInkoopprijs: number | null;
};

type Mode = "marge" | "netto";

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function initialMode(marge: number | null | undefined, netto: number | null | undefined): Mode {
  if ((marge == null || Number.isNaN(marge)) && netto != null) return "netto";
  return "marge";
}

export function useFinanceCalc(initial: {
  inkoopprijs?: number | null;
  marge?: number | null;
  nettoInkoopprijs?: number | null;
}) {
  const [bruto, setBruto] = useState(initial.inkoopprijs?.toString() ?? "");
  const [marge, setMarge] = useState(initial.marge?.toString() ?? "");
  const [netto, setNetto] = useState(
    initial.nettoInkoopprijs?.toString() ?? "",
  );
  const [mode, setMode] = useState<Mode>(() =>
    initialMode(initial.marge, initial.nettoInkoopprijs),
  );

  const brutoNum = parseNum(bruto);
  const margeNum = parseNum(marge);
  const nettoNum = parseNum(netto);

  const displayMarge = useMemo(() => {
    if (mode === "netto") {
      if (brutoNum == null || nettoNum == null) return "";
      return String(nettoNum - brutoNum);
    }
    return marge;
  }, [mode, brutoNum, nettoNum, marge]);

  const displayNetto = useMemo(() => {
    if (mode === "marge") {
      if (brutoNum == null || margeNum == null) return "";
      return String(brutoNum + margeNum);
    }
    return netto;
  }, [mode, brutoNum, margeNum, netto]);

  function onBrutoChange(v: string) {
    setBruto(v);
  }

  function onMargeChange(v: string) {
    setMode("marge");
    setMarge(v);
  }

  function onNettoChange(v: string) {
    setMode("netto");
    setNetto(v);
  }

  /** Switch driver by focusing the currently calculated field */
  function unlockMarge() {
    if (mode === "marge") return;
    const computed =
      brutoNum != null && nettoNum != null ? String(nettoNum - brutoNum) : "";
    setMarge(computed);
    setMode("marge");
  }

  function unlockNetto() {
    if (mode === "netto") return;
    const computed =
      brutoNum != null && margeNum != null ? String(brutoNum + margeNum) : "";
    setNetto(computed);
    setMode("netto");
  }

  function syncFromLead(data: {
    inkoopprijs?: number | null;
    marge?: number | null;
    nettoInkoopprijs?: number | null;
  }) {
    setBruto(data.inkoopprijs?.toString() ?? "");
    setMarge(data.marge?.toString() ?? "");
    setNetto(data.nettoInkoopprijs?.toString() ?? "");
    setMode(initialMode(data.marge, data.nettoInkoopprijs));
  }

  function valuesForSave(): FinanceValues {
    const b = brutoNum;
    if (mode === "marge") {
      const m = margeNum;
      return {
        inkoopprijs: b,
        marge: m,
        nettoInkoopprijs: b != null && m != null ? b + m : null,
      };
    }
    const n = nettoNum;
    return {
      inkoopprijs: b,
      marge: b != null && n != null ? n - b : null,
      nettoInkoopprijs: n,
    };
  }

  return {
    bruto,
    mode,
    displayMarge,
    displayNetto,
    margeDisabled: mode === "netto",
    nettoDisabled: mode === "marge",
    onBrutoChange,
    onMargeChange,
    onNettoChange,
    unlockMarge,
    unlockNetto,
    syncFromLead,
    valuesForSave,
  };
}

export function FinanceCalcFields({
  finance,
}: {
  finance: ReturnType<typeof useFinanceCalc>;
}) {
  return (
    <div className="crm-form">
      <label>
        Bruto inkoopprijs (€) — bedrag voor de klant (in contract)
        <input
          className="crm-input"
          type="number"
          value={finance.bruto}
          onChange={(e) => finance.onBrutoChange(e.target.value)}
        />
      </label>
      <label>
        Marge (€) — intern
        <input
          className={`crm-input${finance.margeDisabled ? " crm-input-calc" : ""}`}
          type="number"
          value={finance.displayMarge}
          readOnly={finance.margeDisabled}
          onChange={(e) => finance.onMargeChange(e.target.value)}
          onFocus={() => finance.unlockMarge()}
          onClick={() => finance.unlockMarge()}
        />
      </label>
      <label>
        Netto inkoopprijs (€) — intern
        <input
          className={`crm-input${finance.nettoDisabled ? " crm-input-calc" : ""}`}
          type="number"
          value={finance.displayNetto}
          readOnly={finance.nettoDisabled}
          onChange={(e) => finance.onNettoChange(e.target.value)}
          onFocus={() => finance.unlockNetto()}
          onClick={() => finance.unlockNetto()}
        />
      </label>
    </div>
  );
}

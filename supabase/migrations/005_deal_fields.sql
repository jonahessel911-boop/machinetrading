-- Deal / contract velden op leads
alter table public.leads
  add column if not exists verkoopprijs double precision,
  add column if not exists deal_datum date,
  add column if not exists netto_inkoopprijs double precision;

comment on column public.leads.inkoopprijs is 'Bruto inkoopprijs = bedrag dat de klant ontvangt (enige prijs in contract)';
comment on column public.leads.marge is 'Bemiddelingsmarge';
comment on column public.leads.netto_inkoopprijs is 'Netto = bruto + marge (prijs richting dealer)';
comment on column public.leads.verkoopprijs is 'Optionele markt-/verkoopprijs indicatie';
comment on column public.leads.deal_datum is 'Datum van de deal/overeenkomst';

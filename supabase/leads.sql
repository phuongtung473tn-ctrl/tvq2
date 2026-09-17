create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  phone text,
  email text,
  city text,
  major text,
  ai_score int,
  ai_rank text,
  risk_level text,
  risk_reasons text[],
  recommended_action text,
  behavior_summary text,
  sale_advice text,
  device_tech_info text,
  traffic_ads_source text,
  network_provider text,
  network_label text,
  current_session int,
  visits_today int,
  visits_month int,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  ttclid text,
  gclid text,
  raw_query text,
  referrer text,
  attribution_model text,
  attribution_detected_by text,
  utm_params jsonb,
  variant text,
  landing_url text,
  device_manufacturer text,
  device_family text,
  device_model text,
  operating_system text,
  browser text,
  visitor_behavior_payload jsonb
);

alter table public.leads enable row level security;
drop policy if exists "leads can be created by public form" on public.leads;
create policy "leads can be created by public form"
  on public.leads for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins can read leads" on public.leads;
create policy "admins can read leads"
  on public.leads for select
  to authenticated
  using (true);

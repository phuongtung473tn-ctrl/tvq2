create table if not exists public.visitor_sessions (
	id text primary key,
	visitor_id text not null,
	visited_day date not null,
	visited_month text not null,
	source text,
	medium text,
	campaign text,
	content text,
	device_model text,
	device_kind text,
	os text,
	browser text,
	created_at timestamptz not null default now()
);

alter table public.visitor_sessions enable row level security;
drop policy if exists "visitor sessions can be created by public form" on public.visitor_sessions;
create policy "visitor sessions can be created by public form"
	on public.visitor_sessions for insert
	to anon, authenticated
	with check (length(visitor_id) between 1 and 128 and length(id) between 1 and 128);
drop policy if exists "visitor sessions can be counted by public form" on public.visitor_sessions;
create policy "visitor sessions can be counted by public form"
	on public.visitor_sessions for select
	to authenticated;

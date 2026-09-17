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
grant insert on public.visitor_sessions to anon, authenticated;
grant select on public.visitor_sessions to authenticated;
drop policy if exists "visitor sessions can be created by public form" on public.visitor_sessions;
create policy "visitor sessions can be created by public form"
	on public.visitor_sessions for insert
	to anon, authenticated
	with check (length(visitor_id) between 1 and 128 and length(id) between 1 and 128);
drop policy if exists "visitor sessions can be counted by public form" on public.visitor_sessions;
create policy "visitor sessions can be counted by public form"
	on public.visitor_sessions for select
	to authenticated;

create or replace function public.record_visitor_session(
	p_id text,
	p_visitor_id text,
	p_source text default null,
	p_medium text default null,
	p_campaign text default null,
	p_content text default null,
	p_device_model text default null,
	p_device_kind text default null,
	p_os text default null,
	p_browser text default null
)
returns table(today_count bigint, month_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
	if length(p_id) not between 1 and 128 or length(p_visitor_id) not between 1 and 128 then
		raise exception 'invalid visitor session';
	end if;

	insert into public.visitor_sessions (
		id, visitor_id, visited_day, visited_month, source, medium, campaign,
		content, device_model, device_kind, os, browser
	)
	values (
		p_id, p_visitor_id, current_date, to_char(current_date, 'YYYY-MM'),
		nullif(left(p_source, 100), ''), nullif(left(p_medium, 100), ''),
		nullif(left(p_campaign, 100), ''), nullif(left(p_content, 100), ''),
		nullif(left(p_device_model, 150), ''), nullif(left(p_device_kind, 30), ''),
		nullif(left(p_os, 100), ''), nullif(left(p_browser, 100), '')
	)
	on conflict (id) do nothing;

	return query
	select
		(select count(*) from public.visitor_sessions where visited_day = current_date),
		(select count(*) from public.visitor_sessions where visited_month = to_char(current_date, 'YYYY-MM'));
end;
$$;

revoke all on function public.record_visitor_session(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.record_visitor_session(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

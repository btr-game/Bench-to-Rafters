-- Bench to Rafters: the maker reads the website's feedback in the dev deck's inbox.
-- Owner: "the send feedback option isnt really runnin". The notes arrived (0001's send_feedback),
-- but only the Supabase dashboard could show them. Now the deck's inbox asks for an inbox key once
-- per device and reads them through read_feedback below.
--
-- The key is a long random string given to the owner; only its SHA-256 is kept here (owner_keys),
-- added by hand and never in this repository. The table has no policies, so nobody reads it.

create table public.owner_keys (
  hash text primary key,
  at timestamptz not null default now()
);
alter table public.owner_keys enable row level security;

-- the newest notes first, for the holder of an inbox key; nothing for anyone else
create or replace function public.read_feedback(p_key text, p_limit integer default 300)
returns table (id bigint, at timestamptz, text text, contact text, player text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_key is null or char_length(p_key) < 24 or not exists (
    select 1 from public.owner_keys k where k.hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
  ) then
    raise exception 'denied' using errcode = '42501';
  end if;
  return query
    select f.id, f.at, f.text, f.contact, f.player
    from public.feedback f
    order by f.at desc
    limit least(greatest(coalesce(p_limit, 300), 1), 1000);
end
$$;

revoke execute on function public.read_feedback(text, integer) from public;
grant execute on function public.read_feedback(text, integer) to anon, authenticated;

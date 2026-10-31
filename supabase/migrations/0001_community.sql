-- Bench to Rafters: the online community for copies of the game outside claude.ai (itch.io).
-- Owner: "let's go with [itch.io]. i do want to get community features activated tho."
--
-- What is kept: the leaderboards (each player's best career per difficulty, all time and today),
-- the Reality 99 hall, the statue plaza with its respects, the live feed and feedback to the maker.
-- Everyone may read what a career card shows. Nobody writes to a table directly: every write is
-- one of the functions at the foot of this file, which checks it and limits how often it comes.
-- Players are anonymous: each copy of the game keeps a random secret, and only its SHA-256 (who)
-- is stored, so a row's owner cannot be impersonated from what the boards show.
-- Feedback can be read only by the project's owner (the Supabase dashboard).

create extension if not exists pgcrypto with schema extensions;

-- ---------- the tables ----------

create table public.best_all (
  mode text not null check (mode in ('standard', 'reality', 'stars')),
  who text not null,
  score double precision not null,
  rec jsonb not null,
  at timestamptz not null default now(),
  primary key (mode, who)
);
create index best_all_rank on public.best_all (mode, score desc);

create table public.best_day (
  mode text not null check (mode in ('standard', 'reality', 'stars')),
  day date not null,
  who text not null,
  score double precision not null,
  rec jsonb not null,
  at timestamptz not null default now(),
  primary key (mode, day, who)
);
create index best_day_rank on public.best_day (mode, day, score desc);

create table public.hall (
  rec_id text primary key,
  who text not null,
  score double precision not null,
  rec jsonb not null,
  at timestamptz not null default now()
);

create table public.statues (
  id uuid primary key default gen_random_uuid(),
  rec_id text not null unique,
  who text not null,
  metal text not null check (metal in ('bronze', 'gold')),
  rec jsonb not null,
  at timestamptz not null default now()
);

create table public.respects (
  statue_id uuid not null references public.statues (id) on delete cascade,
  who text not null,
  at timestamptz not null default now(),
  primary key (statue_id, who)
);

create table public.feed (
  id bigint generated always as identity primary key,
  t text not null check (char_length(t) <= 200),
  at timestamptz not null default now()
);
create index feed_at on public.feed (at desc);

create table public.feedback (
  id bigint generated always as identity primary key,
  who text not null,
  text text not null check (char_length(text) between 1 and 2000),
  contact text not null default '' check (char_length(contact) <= 200),
  player text not null default '' check (char_length(player) <= 80),
  at timestamptz not null default now()
);

-- how often each player has written lately (the functions' rate limits)
create table public.limits (
  who text not null,
  what text not null,
  last timestamptz not null,
  n integer not null default 0,
  primary key (who, what)
);

-- ---------- who may read ----------

alter table public.best_all enable row level security;
alter table public.best_day enable row level security;
alter table public.hall enable row level security;
alter table public.statues enable row level security;
alter table public.respects enable row level security;
alter table public.feed enable row level security;
alter table public.feedback enable row level security;
alter table public.limits enable row level security;

create policy "anyone reads the boards" on public.best_all for select to anon, authenticated using (true);
create policy "anyone reads today's boards" on public.best_day for select to anon, authenticated using (true);
create policy "anyone reads the hall" on public.hall for select to anon, authenticated using (true);
create policy "anyone reads the plaza" on public.statues for select to anon, authenticated using (true);
create policy "anyone reads the respects" on public.respects for select to anon, authenticated using (true);
create policy "anyone reads the feed" on public.feed for select to anon, authenticated using (true);
-- feedback and limits: no policies, so only the owner (dashboard, service role) reads them

-- ---------- the writes ----------

create or replace function public.who_of(p_secret uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(p_secret::text, 'sha256'), 'hex')
$$;

-- one write of a kind per gap, and at most so many a day
create or replace function public.take_turn(p_who text, p_what text, p_gap interval, p_daily integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.limits%rowtype;
begin
  select * into r from public.limits where who = p_who and what = p_what for update;
  if not found then
    insert into public.limits (who, what, last, n) values (p_who, p_what, now(), 1);
    return true;
  end if;
  if now() - r.last < p_gap then
    return false;
  end if;
  if r.last::date = now()::date then
    if r.n >= p_daily then
      return false;
    end if;
    update public.limits set last = now(), n = r.n + 1 where who = p_who and what = p_what;
  else
    update public.limits set last = now(), n = 1 where who = p_who and what = p_what;
  end if;
  return true;
end
$$;

-- a finished career: the player's best on the all-time and today's board, the hall at 99, a feed line
create or replace function public.post_career(p_secret uuid, p_mode text, p_day date, p_score double precision, p_rec jsonb, p_line text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
begin
  if p_mode is null or p_mode not in ('standard', 'reality', 'stars') then
    return 'denied';
  end if;
  if p_score is null or p_score < 0 or p_score > 2000 then
    return 'denied';
  end if;
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or pg_column_size(p_rec) > 20000 or p_rec ->> 'mode' is distinct from p_mode then
    return 'denied';
  end if;
  if p_day is null or abs(p_day - (now() at time zone 'utc')::date) > 1 then
    return 'denied';
  end if;
  if char_length(coalesce(p_line, '')) > 200 then
    return 'denied';
  end if;
  if not public.take_turn(w, 'career', interval '15 seconds', 80) then
    return 'busy';
  end if;
  insert into public.best_all as b (mode, who, score, rec) values (p_mode, w, p_score, p_rec)
    on conflict (mode, who) do update set score = excluded.score, rec = excluded.rec, at = now() where excluded.score > b.score;
  insert into public.best_day as b (mode, day, who, score, rec) values (p_mode, p_day, w, p_score, p_rec)
    on conflict (mode, day, who) do update set score = excluded.score, rec = excluded.rec, at = now() where excluded.score > b.score;
  if p_mode = 'reality' and jsonb_typeof(p_rec -> 'peak') = 'number' and round((p_rec ->> 'peak')::numeric) >= 99 and p_rec ->> 'id' is not null then
    insert into public.hall (rec_id, who, score, rec) values (p_rec ->> 'id', w, p_score, p_rec) on conflict do nothing;
  end if;
  if char_length(coalesce(p_line, '')) > 0 then
    insert into public.feed (t) values (p_line);
  end if;
  return 'ok';
end
$$;

-- a statue in the plaza: a Regular guy career with 150+ legacy, gold from 220 or a first-ballot Hall of Famer
create or replace function public.build_statue(p_secret uuid, p_rec jsonb, p_line text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  legacy numeric;
begin
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or pg_column_size(p_rec) > 20000 or p_rec ->> 'id' is null then
    return 'denied';
  end if;
  if jsonb_typeof(p_rec -> 'legacy') <> 'number' then
    return 'denied';
  end if;
  legacy := (p_rec ->> 'legacy')::numeric;
  if p_rec ->> 'mode' is distinct from 'standard' or legacy < 150 then
    return 'denied';
  end if;
  if exists (select 1 from public.statues where rec_id = p_rec ->> 'id') then
    return 'ok';
  end if;
  if (select count(*) from public.statues) >= 100 then
    return 'full';
  end if;
  if not public.take_turn(w, 'statue', interval '15 seconds', 10) then
    return 'busy';
  end if;
  insert into public.statues (rec_id, who, metal, rec)
    values (p_rec ->> 'id', w, case when legacy >= 220 or p_rec ->> 'hof' = 'first' then 'gold' else 'bronze' end, p_rec);
  if char_length(coalesce(p_line, '')) between 1 and 200 then
    insert into public.feed (t) values (p_line);
  end if;
  return 'ok';
end
$$;

-- one respect per player per statue
create or replace function public.pay_respect(p_secret uuid, p_statue uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.respects (statue_id, who) values (p_statue, public.who_of(p_secret)) on conflict do nothing;
  return 'ok';
exception
  when foreign_key_violation then
    return 'denied';
end
$$;

-- a note to the maker
create or replace function public.send_feedback(p_secret uuid, p_text text, p_contact text, p_player text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
begin
  if char_length(coalesce(p_text, '')) not between 1 and 2000 then
    return 'denied';
  end if;
  if not public.take_turn(w, 'feedback', interval '10 seconds', 20) then
    return 'busy';
  end if;
  insert into public.feedback (who, text, contact, player)
    values (w, p_text, left(coalesce(p_contact, ''), 200), left(coalesce(p_player, ''), 80));
  return 'ok';
end
$$;

-- only the four writes are open to players
revoke execute on function public.who_of(uuid) from public, anon, authenticated;
revoke execute on function public.take_turn(text, text, interval, integer) from public, anon, authenticated;
revoke execute on function public.post_career(uuid, text, date, double precision, jsonb, text) from public;
revoke execute on function public.build_statue(uuid, jsonb, text) from public;
revoke execute on function public.pay_respect(uuid, uuid) from public;
revoke execute on function public.send_feedback(uuid, text, text, text) from public;
grant execute on function public.post_career(uuid, text, date, double precision, jsonb, text) to anon, authenticated;
grant execute on function public.build_statue(uuid, jsonb, text) to anon, authenticated;
grant execute on function public.pay_respect(uuid, uuid) to anon, authenticated;
grant execute on function public.send_feedback(uuid, text, text, text) to anon, authenticated;

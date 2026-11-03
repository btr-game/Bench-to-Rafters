-- Multiplayer (round 35, owner: "the theme here is multiplayer"; the owner's picks: draft class with
-- friends and challenge a friend, an invite code or link and quick match; "i want the multiplayer
-- under regular guy"). Both are asynchronous: nobody has to be online together.
--
-- A challenge: a player posts the start of a finished Regular guy career (the seed and what he
-- picked on the start page) with its career card; a friend plays the same prospect their own way
-- and posts their card back. A draft class: up to eight players start Regular guy careers on one
-- seed; each finished season posts a short line to the class, and each finished career its card.
--
-- As in 0001_community.sql: players are anonymous (each copy of the game keeps a random secret; the
-- database keeps only its SHA-256, public.who_of), every write goes through a function here that
-- checks it and limits how often it comes (public.take_turn), and the tables themselves take no
-- reads or writes from players: these functions are the only way in, and they never hand out
-- another player's hash (a member's id is a short slice of it, enough to tell members apart).
--
-- To undo: drop the twelve functions below and the four tables (drop table public.mp_members,
-- public.mp_classes, public.mp_answers, public.mp_challenges).

create table public.mp_challenges (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  who text not null,
  name text not null check (char_length(name) between 1 and 40),
  prospect jsonb not null,
  rec jsonb not null,
  at timestamptz not null default now()
);
create index mp_challenges_at on public.mp_challenges (at desc);

create table public.mp_answers (
  code text not null references public.mp_challenges (code) on delete cascade,
  who text not null,
  name text not null check (char_length(name) between 1 and 40),
  rec jsonb not null,
  at timestamptz not null default now(),
  primary key (code, who)
);

create table public.mp_classes (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  name text not null check (char_length(name) between 1 and 40),
  seed integer not null,
  who text not null,
  at timestamptz not null default now()
);
create index mp_classes_at on public.mp_classes (at desc);

create table public.mp_members (
  code text not null references public.mp_classes (code) on delete cascade,
  who text not null,
  name text not null check (char_length(name) between 1 and 40),
  seasons jsonb not null default '[]'::jsonb,
  rec jsonb,
  at timestamptz not null default now(),
  primary key (code, who)
);
create index mp_members_who on public.mp_members (who);

alter table public.mp_challenges enable row level security;
alter table public.mp_answers enable row level security;
alter table public.mp_classes enable row level security;
alter table public.mp_members enable row level security;

-- a fresh six-letter code (no I, O, 0 or 1, so it reads aloud cleanly)
create or replace function public.mp_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := extensions.gen_random_bytes(6);
  s text := '';
begin
  for i in 0..5 loop
    s := s || substr(abc, 1 + (get_byte(b, i) % 32), 1);
  end loop;
  return s;
end
$$;

-- a short public id for a player in one class or challenge: never the whole hash
create or replace function public.mp_id(p_who text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(p_who, 10)
$$;

-- a career card a multiplayer write accepts: a Regular guy career, not too big
create or replace function public.mp_card_ok(p_rec jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_rec is not null and jsonb_typeof(p_rec) = 'object' and pg_column_size(p_rec) <= 20000 and p_rec ->> 'mode' = 'standard'
$$;

-- ---------- challenges ----------

create or replace function public.mp_challenge_create(p_secret uuid, p_name text, p_prospect jsonb, p_rec jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  c text;
begin
  if char_length(coalesce(p_name, '')) not between 1 and 40 then
    return 'denied';
  end if;
  if p_prospect is null or jsonb_typeof(p_prospect) <> 'object' or pg_column_size(p_prospect) > 4000 or coalesce(jsonb_typeof(p_prospect -> 'seed'), '') <> 'number' or coalesce(jsonb_typeof(p_prospect -> 'input'), '') <> 'object' then
    return 'denied';
  end if;
  if not public.mp_card_ok(p_rec) then
    return 'denied';
  end if;
  if not public.take_turn(w, 'challenge', interval '20 seconds', 30) then
    return 'busy';
  end if;
  loop
    c := public.mp_code();
    exit when not exists (select 1 from public.mp_challenges where code = c);
  end loop;
  insert into public.mp_challenges (code, who, name, prospect, rec) values (c, w, p_name, p_prospect, p_rec);
  return c;
end
$$;

-- one challenge, with every answer so far
create or replace function public.mp_challenge_get(p_secret uuid, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', c.code, 'name', c.name, 'prospect', c.prospect, 'rec', c.rec, 'at', c.at,
    'mine', c.who = public.who_of(p_secret),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object('id', public.mp_id(a.who), 'name', a.name, 'rec', a.rec, 'at', a.at, 'mine', a.who = public.who_of(p_secret)) order by a.at)
      from public.mp_answers a where a.code = c.code), '[]'::jsonb))
  from public.mp_challenges c
  where c.code = upper(trim(p_code))
$$;

-- quick match: the latest challenges from other players (the last 30 days), fewest answers first
create or replace function public.mp_challenges_open(p_secret uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.j order by x.n, x.at desc), '[]'::jsonb) from (
    select jsonb_build_object('code', c.code, 'name', c.name, 'rec', c.rec, 'at', c.at, 'answers', count(a.who)) as j, count(a.who) as n, c.at
    from public.mp_challenges c left join public.mp_answers a on a.code = c.code
    where c.who <> public.who_of(p_secret) and c.at > now() - interval '30 days'
      and not exists (select 1 from public.mp_answers m where m.code = c.code and m.who = public.who_of(p_secret))
    group by c.code
    order by count(a.who), c.at desc
    limit least(greatest(coalesce(p_limit, 12), 1), 30)
  ) x
$$;

-- the challenges this player made or answered, newest first
create or replace function public.mp_challenges_mine(p_secret uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.mp_challenge_get(p_secret, c.code) order by c.at desc), '[]'::jsonb)
  from public.mp_challenges c
  where c.who = public.who_of(p_secret)
     or exists (select 1 from public.mp_answers a where a.code = c.code and a.who = public.who_of(p_secret))
$$;

-- a finished career that took the challenge: one card per player and challenge (a better one replaces it)
create or replace function public.mp_challenge_answer(p_secret uuid, p_code text, p_name text, p_rec jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  c public.mp_challenges%rowtype;
begin
  select * into c from public.mp_challenges where code = upper(trim(p_code));
  if not found then
    return 'missing';
  end if;
  if c.who = w or char_length(coalesce(p_name, '')) not between 1 and 40 or not public.mp_card_ok(p_rec) then
    return 'denied';
  end if;
  if not public.take_turn(w, 'answer', interval '10 seconds', 60) then
    return 'busy';
  end if;
  insert into public.mp_answers (code, who, name, rec) values (c.code, w, p_name, p_rec)
    on conflict (code, who) do update set name = excluded.name, rec = excluded.rec, at = now();
  return 'ok';
end
$$;

-- ---------- draft classes ----------

-- a new class, its maker its first member; returns the code and the seed, or a refusal
create or replace function public.mp_class_create(p_secret uuid, p_name text, p_player text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  c text;
  s integer := floor(random() * 2000000000)::integer + 1;
begin
  if char_length(coalesce(p_name, '')) not between 1 and 40 or char_length(coalesce(p_player, '')) not between 1 and 40 then
    return jsonb_build_object('error', 'denied');
  end if;
  if not public.take_turn(w, 'class', interval '20 seconds', 12) then
    return jsonb_build_object('error', 'busy');
  end if;
  loop
    c := public.mp_code();
    exit when not exists (select 1 from public.mp_classes where code = c);
  end loop;
  insert into public.mp_classes (code, name, seed, who) values (c, p_name, s, w);
  insert into public.mp_members (code, who, name) values (c, w, p_player);
  return jsonb_build_object('code', c, 'seed', s);
end
$$;

-- join a class (eight at most); a player already in it just gets the seed back
create or replace function public.mp_class_join(p_secret uuid, p_code text, p_player text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  k public.mp_classes%rowtype;
begin
  select * into k from public.mp_classes where code = upper(trim(p_code)) for update;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  if exists (select 1 from public.mp_members where code = k.code and who = w) then
    return jsonb_build_object('code', k.code, 'seed', k.seed);
  end if;
  if char_length(coalesce(p_player, '')) not between 1 and 40 then
    return jsonb_build_object('error', 'denied');
  end if;
  if (select count(*) from public.mp_members where code = k.code) >= 8 then
    return jsonb_build_object('error', 'full');
  end if;
  if not public.take_turn(w, 'join', interval '5 seconds', 40) then
    return jsonb_build_object('error', 'busy');
  end if;
  insert into public.mp_members (code, who, name) values (k.code, w, p_player);
  return jsonb_build_object('code', k.code, 'seed', k.seed);
end
$$;

-- one class: its members, their seasons and their cards
create or replace function public.mp_class_get(p_secret uuid, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', k.code, 'name', k.name, 'seed', k.seed, 'at', k.at, 'mine', k.who = public.who_of(p_secret),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', public.mp_id(m.who), 'name', m.name, 'seasons', m.seasons, 'rec', m.rec, 'at', m.at, 'mine', m.who = public.who_of(p_secret)) order by m.at)
      from public.mp_members m where m.code = k.code), '[]'::jsonb))
  from public.mp_classes k
  where k.code = upper(trim(p_code))
$$;

-- quick match: classes with room, made in the last 14 days, that this player is not in
create or replace function public.mp_classes_open(p_secret uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) from (
    select jsonb_build_object('code', k.code, 'name', k.name, 'at', k.at, 'n', count(m.who)) as j, k.at
    from public.mp_classes k join public.mp_members m on m.code = k.code
    where k.at > now() - interval '14 days'
      and not exists (select 1 from public.mp_members me where me.code = k.code and me.who = public.who_of(p_secret))
    group by k.code
    having count(m.who) < 8
    order by k.at desc
    limit least(greatest(coalesce(p_limit, 12), 1), 30)
  ) x
$$;

-- the classes this player is in, newest first
create or replace function public.mp_classes_mine(p_secret uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', k.code, 'name', k.name, 'seed', k.seed, 'at', k.at, 'n', (select count(*) from public.mp_members x where x.code = k.code)) order by k.at desc), '[]'::jsonb)
  from public.mp_classes k
  where exists (select 1 from public.mp_members m where m.code = k.code and m.who = public.who_of(p_secret))
$$;

-- a member's finished season (one short line a year; the same year again replaces it)
create or replace function public.mp_class_season(p_secret uuid, p_code text, p_season jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  m public.mp_members%rowtype;
  y integer;
begin
  select * into m from public.mp_members where code = upper(trim(p_code)) and who = w for update;
  if not found then
    return 'missing';
  end if;
  if p_season is null or jsonb_typeof(p_season) <> 'object' or pg_column_size(p_season) > 1500 or coalesce(jsonb_typeof(p_season -> 'year'), '') <> 'number' then
    return 'denied';
  end if;
  y := (p_season ->> 'year')::integer;
  if jsonb_array_length(m.seasons) >= 45 and not exists (select 1 from jsonb_array_elements(m.seasons) e where (e ->> 'year')::integer = y) then
    return 'full';
  end if;
  if not public.take_turn(w, 'season', interval '2 seconds', 600) then
    return 'busy';
  end if;
  update public.mp_members set seasons = (
    select coalesce(jsonb_agg(e order by (e ->> 'year')::integer), '[]'::jsonb)
    from (select e from jsonb_array_elements(m.seasons) e where (e ->> 'year')::integer <> y union all select p_season) s(e)
  ), at = now()
  where code = m.code and who = w;
  return 'ok';
end
$$;

-- a member's finished career: its card
create or replace function public.mp_class_career(p_secret uuid, p_code text, p_rec jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
begin
  if not exists (select 1 from public.mp_members where code = upper(trim(p_code)) and who = w) then
    return 'missing';
  end if;
  if not public.mp_card_ok(p_rec) then
    return 'denied';
  end if;
  if not public.take_turn(w, 'classcard', interval '10 seconds', 60) then
    return 'busy';
  end if;
  update public.mp_members set rec = p_rec, at = now() where code = upper(trim(p_code)) and who = w;
  return 'ok';
end
$$;

-- only the functions players call are open to them
revoke execute on function public.mp_code() from public, anon, authenticated;
revoke execute on function public.mp_id(text) from public, anon, authenticated;
revoke execute on function public.mp_card_ok(jsonb) from public, anon, authenticated;
revoke execute on function public.mp_challenge_create(uuid, text, jsonb, jsonb) from public;
revoke execute on function public.mp_challenge_get(uuid, text) from public;
revoke execute on function public.mp_challenges_open(uuid, integer) from public;
revoke execute on function public.mp_challenges_mine(uuid) from public;
revoke execute on function public.mp_challenge_answer(uuid, text, text, jsonb) from public;
revoke execute on function public.mp_class_create(uuid, text, text) from public;
revoke execute on function public.mp_class_join(uuid, text, text) from public;
revoke execute on function public.mp_class_get(uuid, text) from public;
revoke execute on function public.mp_classes_open(uuid, integer) from public;
revoke execute on function public.mp_classes_mine(uuid) from public;
revoke execute on function public.mp_class_season(uuid, text, jsonb) from public;
revoke execute on function public.mp_class_career(uuid, text, jsonb) from public;
grant execute on function public.mp_challenge_create(uuid, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.mp_challenge_get(uuid, text) to anon, authenticated;
grant execute on function public.mp_challenges_open(uuid, integer) to anon, authenticated;
grant execute on function public.mp_challenges_mine(uuid) to anon, authenticated;
grant execute on function public.mp_challenge_answer(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.mp_class_create(uuid, text, text) to anon, authenticated;
grant execute on function public.mp_class_join(uuid, text, text) to anon, authenticated;
grant execute on function public.mp_class_get(uuid, text) to anon, authenticated;
grant execute on function public.mp_classes_open(uuid, integer) to anon, authenticated;
grant execute on function public.mp_classes_mine(uuid) to anon, authenticated;
grant execute on function public.mp_class_season(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.mp_class_career(uuid, text, jsonb) to anon, authenticated;

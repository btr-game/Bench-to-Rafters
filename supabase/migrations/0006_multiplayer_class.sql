-- The draft class, round 35's next batch (owner: "the 12 of you (max) were the first options of
-- your colleges"; "for equality purposes ... think of other ways to balance"; and, from the ideas
-- the owner kept: class news in the chat with reactions on a friend's season, and a friends-only
-- board for the daily challenge). On top of 0004_multiplayer.sql and 0005_multiplayer_friends.sql:
-- - a class seats 12;
-- - fair play: a season line, once posted, stands (a career played again from an older save, or a
--   second career on the same seat, cannot replace it), and a seat holds one career: the first
--   season line names its run, and a line or card from another run is refused;
-- - class news: when a member posts a season that changes something (his NBA team, a first
--   All-Star, an MVP, a title, Rookie of the Year) or his card, a line goes into the class chat;
-- - reactions: one of four on a classmate's season, one a person a season;
-- - the daily challenge: each player's best run of a day, read only by the players he shares a
--   class or a challenge with.
-- As before, the tables take no reads or writes from players; these functions are the only way in.
--
-- To undo: drop the four new functions (mp_react, mp_daily_post, mp_daily_friends,
-- mp_class_news) and the two tables (drop table public.mp_reacts, public.mp_daily), alter table
-- public.mp_members drop column run, and put back 0004's mp_class_join, mp_classes_open,
-- mp_class_season, mp_class_career and 0005's mp_class_get and mp_chat_get.

alter table public.mp_members add column if not exists run text;

create table if not exists public.mp_reacts (
  code text not null,
  member text not null,
  year integer not null,
  who text not null,
  emote text not null check (emote in ('fire', 'crown', 'heart', 'snow')),
  at timestamptz not null default now(),
  primary key (code, member, year, who),
  foreign key (code, member) references public.mp_members (code, who) on delete cascade
);

create table if not exists public.mp_daily (
  day date not null,
  who text not null,
  name text not null check (char_length(name) between 1 and 40),
  points integer not null check (points between 0 and 1000000),
  legacy integer not null check (legacy between 0 and 100000),
  peak integer not null check (peak between 0 and 99),
  at timestamptz not null default now(),
  primary key (day, who)
);

alter table public.mp_reacts enable row level security;
alter table public.mp_daily enable row level security;

-- join a class: 12 seats now
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
  if (select count(*) from public.mp_members where code = k.code) >= 12 then
    return jsonb_build_object('error', 'full');
  end if;
  if not public.take_turn(w, 'join', interval '5 seconds', 40) then
    return jsonb_build_object('error', 'busy');
  end if;
  insert into public.mp_members (code, who, name) values (k.code, w, p_player);
  return jsonb_build_object('code', k.code, 'seed', k.seed);
end
$$;

-- quick match: classes with a seat left (of 12)
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
    having count(m.who) < 12
    order by k.at desc
    limit least(greatest(coalesce(p_limit, 12), 1), 30)
  ) x
$$;

-- a news line in a class's chat, in the game's voice (only these functions write one)
create or replace function public.mp_class_news(p_code text, p_body text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.mp_chat (kind, code, who, name, body) values ('class', p_code, 'news', 'Class news', left(p_body, 200));
  delete from public.mp_chat where kind = 'class' and code = p_code and id not in (select id from public.mp_chat where kind = 'class' and code = p_code order by at desc, id desc limit 200);
$$;

-- a member's finished season: the first line for a year stands, from the seat's one career, and
-- what changed with it goes to the class news
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
  v_run text;
  line jsonb;
  pr jsonb;
  bits text[] := '{}';
  team text;
begin
  select * into m from public.mp_members where code = upper(trim(p_code)) and who = w for update;
  if not found then
    return 'missing';
  end if;
  if p_season is null or jsonb_typeof(p_season) <> 'object' or pg_column_size(p_season) > 1500 or coalesce(jsonb_typeof(p_season -> 'year'), '') <> 'number' then
    return 'denied';
  end if;
  y := (p_season ->> 'year')::integer;
  v_run := left(p_season ->> 'run', 40);
  -- a seat holds one career: the run its first line named
  if m.run is not null and v_run is distinct from m.run then
    return 'taken';
  end if;
  -- a season once posted stands (the same line sent again is fine)
  if exists (select 1 from jsonb_array_elements(m.seasons) e where (e ->> 'year')::integer = y) then
    return 'ok';
  end if;
  if jsonb_array_length(m.seasons) >= 45 then
    return 'full';
  end if;
  if not public.take_turn(w, 'season', interval '2 seconds', 600) then
    return 'busy';
  end if;
  line := p_season - 'run';
  select e into pr from jsonb_array_elements(m.seasons) e where (e ->> 'year')::integer = y - 1;
  update public.mp_members set seasons = (
    select coalesce(jsonb_agg(e order by (e ->> 'year')::integer), '[]'::jsonb)
    from (select e from jsonb_array_elements(m.seasons) e union all select line) s(e)
  ), run = coalesce(m.run, v_run), at = now()
  where code = m.code and who = w;
  -- the news: his NBA team, then the honours that matter
  team := left(coalesce(line ->> 'team', ''), 40);
  if line ->> 'lv' = 'NBA' and (pr is null or pr ->> 'lv' <> 'NBA') then
    bits := bits || (case when exists (select 1 from jsonb_array_elements(m.seasons) e where e ->> 'lv' = 'NBA') then 'back in the NBA with the ' else 'starts his NBA career with the ' end || team);
  elsif line ->> 'lv' = 'NBA' and pr ->> 'lv' = 'NBA' and pr ->> 'team' <> line ->> 'team' then
    bits := bits || ('moves to the ' || team);
  elsif line ->> 'lv' <> 'NBA' and pr ->> 'lv' = 'NBA' then
    bits := bits || ('leaves the NBA for ' || team);
  end if;
  if coalesce(line -> 'aw', '[]'::jsonb) ? 'Rookie of the Year' then
    bits := bits || 'Rookie of the Year'::text;
  end if;
  if coalesce(line -> 'aw', '[]'::jsonb) ? 'All-Star' and not exists (select 1 from jsonb_array_elements(m.seasons) e where coalesce(e -> 'aw', '[]'::jsonb) ? 'All-Star') then
    bits := bits || 'an All-Star for the first time'::text;
  end if;
  if coalesce(line -> 'aw', '[]'::jsonb) ? 'MVP' then
    bits := bits || 'the league MVP'::text;
  end if;
  if line ->> 'lv' = 'NBA' and exists (select 1 from jsonb_array_elements_text(coalesce(line -> 'aw', '[]'::jsonb)) a where a like '%Champion') then
    bits := bits || ('NBA champion with the ' || team);
  end if;
  if array_length(bits, 1) > 0 then
    perform public.mp_class_news(m.code, format('%s (%s), %s: %s.', left(coalesce(line ->> 'pn', m.name), 40), m.name, y, array_to_string(bits, ' · ')));
  end if;
  return 'ok';
end
$$;

-- a member's finished career: the first card stands, from the seat's one career, with a line in
-- the news
create or replace function public.mp_class_career(p_secret uuid, p_code text, p_rec jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  m public.mp_members%rowtype;
  card jsonb;
begin
  select * into m from public.mp_members where code = upper(trim(p_code)) and who = w for update;
  if not found then
    return 'missing';
  end if;
  if m.run is not null and left(p_rec ->> 'run', 40) is distinct from m.run then
    return 'taken';
  end if;
  card := p_rec - 'run';
  if not public.mp_card_ok(card) then
    return 'denied';
  end if;
  if m.rec is not null then
    return 'ok';
  end if;
  if not public.take_turn(w, 'classcard', interval '10 seconds', 60) then
    return 'busy';
  end if;
  update public.mp_members set rec = card, at = now() where code = m.code and who = w;
  perform public.mp_class_news(m.code, format('%s (%s) retires: %s, peak %s.', left(coalesce(card ->> 'name', m.name), 40), m.name, left(coalesce(card ->> 'tier', 'a career'), 40), round(coalesce((card ->> 'peak')::numeric, 0))));
  return 'ok';
end
$$;

-- one class, as before, with each member's reactions (by season and kind: how many, and whether
-- one of them is this player's)
create or replace function public.mp_class_get(p_secret uuid, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.who_of(p_secret) as w)
  select jsonb_build_object(
    'code', k.code, 'name', k.name, 'seed', k.seed, 'at', k.at, 'mine', k.who = (select w from me),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', public.mp_id(m.who), 'name', m.name, 'seasons', m.seasons, 'rec', m.rec, 'at', m.at, 'mine', m.who = (select w from me), 'rival', m.rival_to,
        'reacts', coalesce((
          select jsonb_agg(jsonb_build_object('y', r.year, 'e', r.emote, 'n', r.n, 'mine', r.mine) order by r.year, r.emote)
          from (select x.year, x.emote, count(*) as n, bool_or(x.who = (select w from me)) as mine from public.mp_reacts x where x.code = m.code and x.member = m.who group by x.year, x.emote) r), '[]'::jsonb)
      ) order by m.at)
      from public.mp_members m where m.code = k.code), '[]'::jsonb))
  from public.mp_classes k
  where k.code = upper(trim(p_code))
$$;

-- a reaction on a classmate's season (null takes it back): members only, never on his own
create or replace function public.mp_react(p_secret uuid, p_code text, p_to text, p_year integer, p_emote text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  c text := upper(trim(p_code));
  t public.mp_members%rowtype;
begin
  if not exists (select 1 from public.mp_members where code = c and who = w) then
    return 'missing';
  end if;
  select * into t from public.mp_members where code = c and public.mp_id(who) = p_to;
  if not found or t.who = w or (p_emote is not null and p_emote not in ('fire', 'crown', 'heart', 'snow'))
    or not exists (select 1 from jsonb_array_elements(t.seasons) e where (e ->> 'year')::integer = p_year) then
    return 'denied';
  end if;
  if not public.take_turn(w, 'react', interval '1 second', 400) then
    return 'busy';
  end if;
  if p_emote is null then
    delete from public.mp_reacts where code = c and member = t.who and year = p_year and who = w;
  else
    insert into public.mp_reacts (code, member, year, who, emote) values (c, t.who, p_year, w, p_emote)
    on conflict (code, member, year, who) do update set emote = excluded.emote, at = now();
  end if;
  return 'ok';
end
$$;

-- a room's latest 50 lines, as before, with the class news marked
create or replace function public.mp_chat_get(p_secret uuid, p_kind text, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.mp_in_room(public.who_of(p_secret), p_kind, upper(trim(p_code))) then coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'body', x.body, 'at', x.at, 'mine', x.who = public.who_of(p_secret), 'news', x.who = 'news') order by x.at, x.id)
    from (select * from public.mp_chat where kind = p_kind and code = upper(trim(p_code)) order by at desc, id desc limit 50) x), '[]'::jsonb)
  else null end
$$;

-- a player's best daily challenge run of a day (yesterday, today or tomorrow, for time zones)
create or replace function public.mp_daily_post(p_secret uuid, p_day date, p_name text, p_points integer, p_legacy integer, p_peak integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
begin
  if p_day is null or p_day not between current_date - 1 and current_date + 1 or char_length(coalesce(p_name, '')) not between 1 and 40
    or p_points not between 0 and 1000000 or p_legacy not between 0 and 100000 or p_peak not between 0 and 99 then
    return 'denied';
  end if;
  if not public.take_turn(w, 'daily', interval '5 seconds', 100) then
    return 'busy';
  end if;
  insert into public.mp_daily (day, who, name, points, legacy, peak) values (p_day, w, p_name, p_points, p_legacy, p_peak)
  on conflict (day, who) do update set name = excluded.name,
    points = greatest(public.mp_daily.points, excluded.points),
    legacy = case when excluded.points > public.mp_daily.points then excluded.legacy else public.mp_daily.legacy end,
    peak = case when excluded.points > public.mp_daily.points then excluded.peak else public.mp_daily.peak end,
    at = now();
  return 'ok';
end
$$;

-- a day's daily challenge board of this player's friends: everyone he shares a class with, the
-- makers of challenges he took or answered, and those who took or answered his; him too
create or replace function public.mp_daily_friends(p_secret uuid, p_day date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.who_of(p_secret) as w),
  pals as (
    select (select w from me) as who
    union select m2.who from public.mp_members m1 join public.mp_members m2 on m2.code = m1.code where m1.who = (select w from me)
    union select c.who from public.mp_challenges c where exists (select 1 from public.mp_answers a where a.code = c.code and a.who = (select w from me))
      or exists (select 1 from public.mp_takers t where t.code = c.code and t.who = (select w from me))
    union select a.who from public.mp_answers a join public.mp_challenges c on c.code = a.code where c.who = (select w from me)
    union select t.who from public.mp_takers t join public.mp_challenges c on c.code = t.code where c.who = (select w from me)
  )
  select coalesce(jsonb_agg(jsonb_build_object('name', d.name, 'points', d.points, 'legacy', d.legacy, 'peak', d.peak, 'mine', d.who = (select w from me)) order by d.points desc, d.peak desc, d.at), '[]'::jsonb)
  from (select * from public.mp_daily where day = p_day and who in (select who from pals) order by points desc, peak desc, at limit 50) d
$$;

revoke execute on function public.mp_class_news(text, text) from public, anon, authenticated;
revoke execute on function public.mp_react(uuid, text, text, integer, text) from public;
revoke execute on function public.mp_daily_post(uuid, date, text, integer, integer, integer) from public;
revoke execute on function public.mp_daily_friends(uuid, date) from public;
grant execute on function public.mp_react(uuid, text, text, integer, text) to anon, authenticated;
grant execute on function public.mp_daily_post(uuid, date, text, integer, integer, integer) to anon, authenticated;
grant execute on function public.mp_daily_friends(uuid, date) to anon, authenticated;

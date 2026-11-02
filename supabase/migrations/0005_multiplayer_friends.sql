-- Friends in each other's careers (round 35, owner: "add multiplayer specific features ... each
-- user can send a rivalry to one other, and if they accept, they become draft rivals ... try to make
-- a chat below the leaderboard so that the users can communicate"). On top of 0004_multiplayer.sql:
-- - a draft class member's rival pick (another member of the class; two who pick each other are
--   rivals; a pick waiting for its answer is a request);
-- - who has taken a friend's challenge, so a player can talk in its chat before he has finished;
-- - a chat for each challenge and each class, open only to its people (a class's members; a
--   challenge's maker, takers and answerers), 200 characters a line, a line every 3 seconds.
-- As before, the tables take no reads or writes from players; these functions are the only way in.
--
-- To undo: drop the five functions below and the two tables (drop table public.mp_chat,
-- public.mp_takers), alter table public.mp_members drop column rival_to, and put 0004's
-- mp_class_get back.

alter table public.mp_members add column if not exists rival_to text;

create table if not exists public.mp_takers (
  code text not null references public.mp_challenges (code) on delete cascade,
  who text not null,
  name text not null check (char_length(name) between 1 and 40),
  at timestamptz not null default now(),
  primary key (code, who)
);

create table if not exists public.mp_chat (
  id bigserial primary key,
  kind text not null check (kind in ('challenge', 'class')),
  code text not null,
  who text not null,
  name text not null check (char_length(name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 200),
  at timestamptz not null default now()
);
create index if not exists mp_chat_room on public.mp_chat (kind, code, at desc);

alter table public.mp_takers enable row level security;
alter table public.mp_chat enable row level security;

-- one class, as before, with each member's rival pick (another member's short id)
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
      select jsonb_agg(jsonb_build_object('id', public.mp_id(m.who), 'name', m.name, 'seasons', m.seasons, 'rec', m.rec, 'at', m.at, 'mine', m.who = public.who_of(p_secret), 'rival', m.rival_to) order by m.at)
      from public.mp_members m where m.code = k.code), '[]'::jsonb))
  from public.mp_classes k
  where k.code = upper(trim(p_code))
$$;

-- a member's rival pick: another member of the same class (by short id), or null to take it back
create or replace function public.mp_class_rival(p_secret uuid, p_code text, p_to text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  c text := upper(trim(p_code));
begin
  if not exists (select 1 from public.mp_members where code = c and who = w) then
    return 'missing';
  end if;
  if p_to is not null and (p_to = public.mp_id(w) or not exists (select 1 from public.mp_members where code = c and public.mp_id(who) = p_to)) then
    return 'denied';
  end if;
  if not public.take_turn(w, 'rival', interval '5 seconds', 50) then
    return 'busy';
  end if;
  update public.mp_members set rival_to = p_to where code = c and who = w;
  return 'ok';
end
$$;

-- a player starts a friend's challenge: he may talk in its chat from now on
create or replace function public.mp_challenge_take(p_secret uuid, p_code text, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  ch public.mp_challenges%rowtype;
begin
  select * into ch from public.mp_challenges where code = upper(trim(p_code));
  if not found then
    return 'missing';
  end if;
  if ch.who = w or char_length(coalesce(p_name, '')) not between 1 and 40 then
    return 'denied';
  end if;
  if not public.take_turn(w, 'take', interval '5 seconds', 100) then
    return 'busy';
  end if;
  insert into public.mp_takers (code, who, name) values (ch.code, w, p_name) on conflict (code, who) do update set name = excluded.name;
  return 'ok';
end
$$;

-- whether this player belongs to a room: a class's member; a challenge's maker, taker or answerer
create or replace function public.mp_in_room(p_who text, p_kind text, p_code text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_kind
    when 'class' then exists (select 1 from public.mp_members where code = p_code and who = p_who)
    when 'challenge' then exists (select 1 from public.mp_challenges where code = p_code and who = p_who)
      or exists (select 1 from public.mp_takers where code = p_code and who = p_who)
      or exists (select 1 from public.mp_answers where code = p_code and who = p_who)
    else false
  end
$$;

-- a line in a room's chat: its people only, 200 characters, no control characters, a line every
-- 3 seconds and 300 a day; a room keeps its latest 200 lines
create or replace function public.mp_chat_post(p_secret uuid, p_kind text, p_code text, p_name text, p_body text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  c text := upper(trim(p_code));
  b text := btrim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]+', ' ', 'g'));
begin
  if not public.mp_in_room(w, p_kind, c) then
    return 'missing';
  end if;
  if char_length(b) not between 1 and 200 or char_length(coalesce(p_name, '')) not between 1 and 40 then
    return 'denied';
  end if;
  if not public.take_turn(w, 'chat', interval '3 seconds', 300) then
    return 'busy';
  end if;
  insert into public.mp_chat (kind, code, who, name, body) values (p_kind, c, w, p_name, b);
  delete from public.mp_chat where kind = p_kind and code = c and id not in (select id from public.mp_chat where kind = p_kind and code = c order by at desc, id desc limit 200);
  return 'ok';
end
$$;

-- a room's latest 50 lines, oldest first, for its people only
create or replace function public.mp_chat_get(p_secret uuid, p_kind text, p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.mp_in_room(public.who_of(p_secret), p_kind, upper(trim(p_code))) then coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'body', x.body, 'at', x.at, 'mine', x.who = public.who_of(p_secret)) order by x.at, x.id)
    from (select * from public.mp_chat where kind = p_kind and code = upper(trim(p_code)) order by at desc, id desc limit 50) x), '[]'::jsonb)
  else null end
$$;

revoke execute on function public.mp_in_room(text, text, text) from public, anon, authenticated;
revoke execute on function public.mp_class_rival(uuid, text, text) from public;
revoke execute on function public.mp_challenge_take(uuid, text, text) from public;
revoke execute on function public.mp_chat_post(uuid, text, text, text, text) from public;
revoke execute on function public.mp_chat_get(uuid, text, text) from public;
grant execute on function public.mp_class_rival(uuid, text, text) to anon, authenticated;
grant execute on function public.mp_challenge_take(uuid, text, text) to anon, authenticated;
grant execute on function public.mp_chat_post(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.mp_chat_get(uuid, text, text) to anon, authenticated;

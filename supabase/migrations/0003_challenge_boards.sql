-- Two more boards (round 31, owner: "in community, add some more tabs for the comet and [rough]
-- road"). A Rough Road career (rec.oath) ranks on the Reality board and on a board of its own; a
-- Comet career (rec.comet: Shoot for the stars with fast break and sim locked on) ranks only on
-- its own board, off the Stars board, so careers played by hand compete with each other. Each
-- board still keeps each player's best career, all time and for the day. The posting function
-- keeps its signature, so its grants and the clients that call it stay as they were.
--
-- To undo: put the two checks back to the three difficulties (after deleting the 'rough' and
-- 'comet' rows) and the function back to its body in 0001_community.sql.

alter table public.best_all drop constraint best_all_mode_check;
alter table public.best_all add constraint best_all_mode_check check (mode in ('standard', 'reality', 'stars', 'rough', 'comet'));
alter table public.best_day drop constraint best_day_mode_check;
alter table public.best_day add constraint best_day_mode_check check (mode in ('standard', 'reality', 'stars', 'rough', 'comet'));

create or replace function public.post_career(p_secret uuid, p_mode text, p_day date, p_score double precision, p_rec jsonb, p_line text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w text := public.who_of(p_secret);
  boards text[];
  bd text;
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
  -- the boards this career ranks on: a Comet is Stars only, the Rough Road is Reality only
  if p_rec -> 'comet' = 'true'::jsonb then
    if p_mode <> 'stars' then
      return 'denied';
    end if;
    boards := array['comet'];
  elsif p_rec -> 'oath' = 'true'::jsonb then
    if p_mode <> 'reality' then
      return 'denied';
    end if;
    boards := array['reality', 'rough'];
  else
    boards := array[p_mode];
  end if;
  if not public.take_turn(w, 'career', interval '15 seconds', 80) then
    return 'busy';
  end if;
  foreach bd in array boards loop
    insert into public.best_all as b (mode, who, score, rec) values (bd, w, p_score, p_rec)
      on conflict (mode, who) do update set score = excluded.score, rec = excluded.rec, at = now() where excluded.score > b.score;
    insert into public.best_day as b (mode, day, who, score, rec) values (bd, p_day, w, p_score, p_rec)
      on conflict (mode, day, who) do update set score = excluded.score, rec = excluded.rec, at = now() where excluded.score > b.score;
  end loop;
  if p_mode = 'reality' and jsonb_typeof(p_rec -> 'peak') = 'number' and round((p_rec ->> 'peak')::numeric) >= 99 and p_rec ->> 'id' is not null then
    insert into public.hall (rec_id, who, score, rec) values (p_rec ->> 'id', w, p_score, p_rec) on conflict do nothing;
  end if;
  if char_length(coalesce(p_line, '')) > 0 then
    insert into public.feed (t) values (p_line);
  end if;
  return 'ok';
end
$$;

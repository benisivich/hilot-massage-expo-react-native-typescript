alter table customers add column if not exists push_token text not null default '';
alter table therapists add column if not exists push_token text not null default '';

create or replace function public.other_push_token(target_booking uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case
      when b.customer_id = (select auth.uid()) then nullif(t.push_token, '')
      when b.therapist_id = (select auth.uid()) then nullif(c.push_token, '')
      else null
    end,
    ''
  )
  from bookings b
  join customers c on c.id = b.customer_id
  join therapists t on t.id = b.therapist_id
  where b.id = target_booking;
$$;

revoke all on function public.other_push_token(uuid) from public, anon;
grant execute on function public.other_push_token(uuid) to authenticated;

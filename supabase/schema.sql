drop table if exists bookings cascade;
drop table if exists therapists cascade;
drop table if exists customers cascade;

create table customers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  mobile text not null,
  email text not null,
  photo_path text not null default '',
  push_token text not null default '',
  city text not null default 'Iligan City',
  barangay text not null default '',
  address text not null default ''
);

create table therapists (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  photo_path text not null default '',
  push_token text not null default '',
  title text not null default '',
  bio text not null default '',
  years int not null default 0,
  treatment_ids text[] not null default '{}',
  offers_home boolean not null default true,
  offers_clinic boolean not null default true,
  travel_zones text[] not null default '{}',
  weekly_slots jsonb not null default '{}'::jsonb
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id),
  therapist_id uuid not null references therapists (id),
  treatment_id text not null,
  mode text not null check (mode in ('home', 'clinic')),
  city text not null default 'Iligan City',
  barangay text not null default '',
  address text not null,
  date date not null,
  time text not null,
  duration int not null,
  service_total numeric not null,
  reservation_fee numeric not null,
  amount_paid numeric not null,
  payment_status text not null,
  pay_method text not null,
  payment_ref text not null,
  customer_name text not null default '',
  balance_method text,
  pay_last4 text not null default '',
  assigned_by text not null default 'auto',
  status text not null,
  check_in_code text not null,
  check_in_attempts int not null default 0,
  check_in_locked boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancel_note text
);

create unique index one_open_slot
  on bookings (therapist_id, date, time)
  where status <> 'cancelled';

alter table customers enable row level security;
alter table therapists enable row level security;
alter table bookings enable row level security;

grant select, insert, update, delete on customers to authenticated;
grant select, insert, update, delete on therapists to authenticated;
grant select, insert, update, delete on bookings to authenticated;

create policy "own customer row" on customers
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "directory is visible" on therapists
  for select to authenticated using (true);

create policy "own therapist row" on therapists
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "see own bookings" on bookings
  for select to authenticated
  using (customer_id = auth.uid() or therapist_id = auth.uid());

create policy "customer creates booking" on bookings
  for insert to authenticated
  with check (customer_id = auth.uid());

create policy "people on the visit can update it" on bookings
  for update to authenticated
  using (customer_id = auth.uid() or therapist_id = auth.uid());

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

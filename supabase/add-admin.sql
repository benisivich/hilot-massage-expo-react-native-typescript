create table if not exists admins (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table customers add column if not exists suspended boolean not null default false;

alter table therapists add column if not exists verification_status text not null default 'verified';
alter table therapists alter column verification_status set default 'pending';
alter table therapists add column if not exists verification_note text not null default '';
alter table therapists add column if not exists reviewed_at timestamptz;
alter table therapists add column if not exists valid_id_path text not null default '';
alter table therapists add column if not exists certificate_path text not null default '';
alter table therapists add column if not exists suspended boolean not null default false;

create table if not exists treatments (
  id text primary key,
  name text not null,
  category text not null default 'massage',
  summary text not null default '',
  description text not null default '',
  duration_options int[] not null default '{60}',
  hourly_rate numeric not null default 0,
  package_prices jsonb not null default '{}',
  offers_home boolean not null default true,
  offers_clinic boolean not null default true,
  active boolean not null default true
);

create table if not exists service_areas (
  name text primary key,
  active boolean not null default true
);

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  author_role text not null check (author_role in ('customer', 'therapist')),
  author_name text not null,
  against_id uuid,
  body text not null,
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now()
);

insert into treatments (id, name, category, summary, description, duration_options, hourly_rate, package_prices)
values
  ('tr_hilot', 'Traditional Hilot', 'hilot', 'Banana-leaf hilot for muscle fatigue and tight areas.', 'A traditional hilot session starts with a hand assessment, then oil and banana leaf work.', '{60}', 580, '{"60":580}'),
  ('tr_ventosa', 'Ventosa Hilot', 'hilot', 'Hilot assessment followed by warm cupping.', 'Warm cups follow a hilot assessment, usually along the back and shoulders.', '{60}', 500, '{"60":500}'),
  ('tr_swedish', 'Swedish Relaxation', 'massage', 'Long, even strokes for a quieter full-body massage.', 'Swedish massage uses gliding strokes and light kneading.', '{60}', 400, '{"60":400}'),
  ('tr_deep', 'Deep Tissue', 'massage', 'Slower pressure for chronic tight spots.', 'Deep tissue stays longer on knots in the neck, back, and legs.', '{30,45}', 460, '{"30":230,"45":420}'),
  ('tr_prenatal', 'Prenatal Comfort', 'massage', 'Side-lying massage after the first trimester.', 'A side-lying massage for pregnancy after the first trimester.', '{60}', 500, '{"60":500}'),
  ('tr_combo', 'Hilot and Massage', 'combo', 'Hilot assessment first, then massage where you need it.', 'The therapist begins with hilot, then spends the rest of the time on massage.', '{80}', 540, '{"80":720}'),
  ('tr_foot', 'Foot Hilot', 'hilot', 'A shorter hilot for the feet and lower legs.', 'Foot hilot stays below the knees.', '{30}', 500, '{"30":250}'),
  ('tr_sports', 'Sports Recovery', 'massage', 'Massage aimed at legs, hips, and shoulders after training.', 'Sports recovery focuses on the muscles you train.', '{45,60}', 500, '{"45":420,"60":500}')
on conflict (id) do nothing;

insert into service_areas (name)
select name from (values
  ('Abuno'), ('Acmac (Mariano Badelles Sr.)'), ('Bagong Silang'), ('Bonbonon'), ('Bunawan'), ('Buru-un'),
  ('Dalipuga'), ('Del Carmen'), ('Digkilaan'), ('Ditucalan'), ('Dulag'), ('Hinaplanon'), ('Hindang'),
  ('Kabacsanan'), ('Kalilangan'), ('Kiwalan'), ('Lanipao'), ('Luinab'), ('Mahayahay'), ('Mainit'),
  ('Mandulog'), ('Maria Cristina'), ('Pala-o'), ('Panoroganan'), ('Poblacion'), ('Puga-an'), ('Rogongon'),
  ('San Miguel'), ('San Roque'), ('Santa Elena (Tominobo Ilaya)'), ('Santa Filomena'), ('Santiago'),
  ('Santo Rosario'), ('Saray-Tibanga (Saray)'), ('Suarez'), ('Tambacan'), ('Tibanga (Canaway)'), ('Tipanoy'),
  ('Tomas Cabili (Tominobo Proper)'), ('Tubod'), ('Ubaldo Laya'), ('Upper Hinaplanon'), ('Upper Tominobo'), ('Villa Verde')
) as areas(name)
on conflict (name) do nothing;

alter table admins enable row level security;
alter table treatments enable row level security;
alter table service_areas enable row level security;
alter table complaints enable row level security;

grant select, insert, update, delete on admins to authenticated;
grant select, insert, update, delete on treatments to authenticated;
grant select, insert, update, delete on service_areas to authenticated;
grant select, insert, update, delete on complaints to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "own admin row" on admins;
create policy "own admin row" on admins
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "create own admin" on admins;
create policy "create own admin" on admins
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and coalesce((select auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin'
  );

drop policy if exists "admin sees customers" on customers;
create policy "admin sees customers" on customers
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin updates customers" on customers;
create policy "admin updates customers" on customers
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin updates therapists" on therapists;
create policy "admin updates therapists" on therapists
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin sees bookings" on bookings;
create policy "admin sees bookings" on bookings
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin updates bookings" on bookings;
create policy "admin updates bookings" on bookings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "services are visible" on treatments;
create policy "services are visible" on treatments
  for select to authenticated
  using (true);

drop policy if exists "admin edits services" on treatments;
create policy "admin edits services" on treatments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "areas are visible" on service_areas;
create policy "areas are visible" on service_areas
  for select to authenticated
  using (true);

drop policy if exists "admin edits areas" on service_areas;
create policy "admin edits areas" on service_areas
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "file a complaint" on complaints;
create policy "file a complaint" on complaints
  for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "see complaints" on complaints;
create policy "see complaints" on complaints
  for select to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "admin reviews complaints" on complaints;
create policy "admin reviews complaints" on complaints
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.protect_therapist_review()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.valid_id_path is distinct from old.valid_id_path
     or new.certificate_path is distinct from old.certificate_path then
    new.verification_status := 'pending';
    new.verification_note := '';
  else
    new.verification_status := old.verification_status;
    new.verification_note := old.verification_note;
  end if;
  new.reviewed_at := old.reviewed_at;
  new.suspended := old.suspended;
  return new;
end;
$$;

drop trigger if exists protect_therapist_review on therapists;
create trigger protect_therapist_review
  before update on therapists
  for each row execute function public.protect_therapist_review();

create or replace function public.protect_customer_suspend()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  new.suspended := old.suspended;
  return new;
end;
$$;

drop trigger if exists protect_customer_suspend on customers;
create trigger protect_customer_suspend
  before update on customers
  for each row execute function public.protect_customer_suspend();

notify pgrst, 'reload schema';

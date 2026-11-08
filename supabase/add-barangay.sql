alter table customers add column if not exists barangay text not null default '';
update customers
set barangay = city
where barangay = '' and city <> '' and city <> 'Iligan City';
update customers set city = 'Iligan City';

alter table bookings add column if not exists barangay text not null default '';
update bookings
set barangay = city
where barangay = '' and city <> '' and city <> 'Iligan City';
update bookings set city = 'Iligan City';

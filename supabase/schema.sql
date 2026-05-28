-- =============================================
-- Kasubay UA-TLMC Hotel — Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- ROOMS
-- =============================================
create table if not exists rooms (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  tag         text,                         -- 'single' | 'double' | 'triple' | 'event'
  description text,
  price       numeric(10,2) not null,
  capacity    int not null default 1,       -- bed capacity
  max_guests  int not null default 2,
  quantity    int not null default 1,       -- how many units of this room type
  amenities   text[] default '{}',
  images      text[] default '{}',
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- =============================================
-- GUESTS
-- =============================================
create table if not exists guests (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  email      text,
  phone      text,
  address    text,
  created_at timestamptz default now()
);

-- =============================================
-- BOOKINGS
-- =============================================
create table if not exists bookings (
  id               uuid primary key default uuid_generate_v4(),
  transaction_code text unique not null,
  guest_id         uuid references guests(id) on delete set null,
  guest_name       text not null,
  guest_email      text,
  guest_phone      text,
  room_id          uuid references rooms(id) on delete set null,
  room_name        text not null,
  check_in         date not null,
  check_out        date not null,
  adults           int default 1,
  children         int default 0,
  total_guests     int default 1,
  promo_code       text,
  discount         numeric(10,2) default 0,
  base_amount      numeric(10,2) not null,
  extra_guest_fee  numeric(10,2) default 0,
  total_amount     numeric(10,2) not null,
  payment_method   text default 'Cash',     -- 'Cash' | 'GCash'
  special_requests text,
  status           text default 'Pending',  -- 'Pending' | 'Confirmed' | 'Cancelled' | 'Checked In' | 'Checked Out'
  booking_type     text default 'online',   -- 'online' | 'walk_in'
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();

-- =============================================
-- WALK-IN BOOKINGS (extends bookings, just a flag)
-- Walk-in bookings use booking_type = 'walk_in' in bookings table.
-- This table holds extra walk-in specific info.
-- =============================================
create table if not exists walk_ins (
  id         uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) on delete cascade,
  received_by text,
  id_type     text,
  id_number   text,
  notes       text,
  created_at  timestamptz default now()
);

-- =============================================
-- ROOM REVIEWS
-- =============================================
create table if not exists room_reviews (
  id         uuid primary key default uuid_generate_v4(),
  room_id    uuid references rooms(id) on delete cascade,
  author     text not null,
  rating     int check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- =============================================
-- FEEDBACKS (general hotel feedback)
-- =============================================
create table if not exists feedbacks (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  email      text,
  message    text not null,
  rating     int check (rating between 1 and 5),
  created_at timestamptz default now()
);

-- =============================================
-- SETTINGS (single-row config table)
-- =============================================
create table if not exists settings (
  id              int primary key default 1 check (id = 1),  -- enforce single row
  hotel_name      text default 'Kasubay UA-TLMC Hotel',
  hotel_phone     text default '',
  hotel_email     text default '',
  hotel_address   text default '',
  facebook_url    text default '',
  messenger_url   text default '',
  logo_url        text default '',
  promo_codes     jsonb default '[]',   -- [{code, discount_pct, active}]
  updated_at      timestamptz default now()
);

-- seed default settings row
insert into settings (id) values (1) on conflict do nothing;

-- =============================================
-- PROMO CODES (standalone for flexibility)
-- =============================================
create table if not exists promo_codes (
  id           uuid primary key default uuid_generate_v4(),
  code         text unique not null,
  discount_pct numeric(5,2) not null,  -- e.g. 10 = 10%
  is_active    boolean default true,
  created_at   timestamptz default now()
);

insert into promo_codes (code, discount_pct) values ('KASUBAY10', 10) on conflict do nothing;

-- =============================================
-- SEED DEFAULT ROOMS
-- =============================================
insert into rooms (name, tag, price, capacity, max_guests, quantity, amenities, description) values
  ('Single Bed Room',  'single', 1299, 1, 2,   5, array['WiFi','Air Conditioning','TV','Hot Shower'],       'Cozy single room perfect for solo travelers.'),
  ('Double Bed Room',  'double', 1799, 2, 4,   4, array['WiFi','Air Conditioning','TV','Hot Shower','Ref'], 'Spacious double room ideal for couples.'),
  ('Triple Bed Room',  'triple', 2499, 3, 5,   3, array['WiFi','Air Conditioning','TV','Hot Shower','Ref'], 'Triple room great for small families or groups.'),
  ('Event Hall',       'event',  15000,50,100, 1, array['Sound System','Projector','Air Conditioning','WiFi','Stage'], 'Full-featured event hall for parties and gatherings.')
on conflict do nothing;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table rooms         enable row level security;
alter table guests        enable row level security;
alter table bookings      enable row level security;
alter table walk_ins      enable row level security;
alter table room_reviews  enable row level security;
alter table feedbacks     enable row level security;
alter table settings      enable row level security;
alter table promo_codes   enable row level security;

-- Public read for rooms, reviews, settings
create policy "rooms_public_read"        on rooms        for select using (true);
create policy "room_reviews_public_read" on room_reviews for select using (true);
create policy "settings_public_read"     on settings     for select using (true);
create policy "promo_codes_public_read"  on promo_codes  for select using (is_active = true);

-- Anyone can create a booking (guest booking flow)
create policy "bookings_insert_public"   on bookings     for insert with check (true);
create policy "guests_insert_public"     on guests       for insert with check (true);
create policy "feedbacks_insert_public"  on feedbacks    for insert with check (true);
create policy "reviews_insert_public"    on room_reviews for insert with check (true);

-- Authenticated (admin) users can do everything
create policy "rooms_admin_all"       on rooms       for all using (auth.role() = 'authenticated');
create policy "guests_admin_all"      on guests      for all using (auth.role() = 'authenticated');
create policy "bookings_admin_all"    on bookings    for all using (auth.role() = 'authenticated');
create policy "walk_ins_admin_all"    on walk_ins    for all using (auth.role() = 'authenticated');
create policy "feedbacks_admin_all"   on feedbacks   for all using (auth.role() = 'authenticated');
create policy "settings_admin_all"    on settings    for all using (auth.role() = 'authenticated');
create policy "promo_codes_admin_all" on promo_codes for all using (auth.role() = 'authenticated');

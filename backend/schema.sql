-- KARNAK ONLINE BACKEND — Supabase/PostgreSQL
create extension if not exists pgcrypto;

create table if not exists public.cars (
 id text primary key, brand text not null, name text not null, year text, price text,
 type text, engine text, power text, gear text, desc text,
 tags jsonb not null default '[]'::jsonb, "order" integer not null default 1,
 status text not null default 'active' check(status in ('active','hidden')),
 img text, frames jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.analytics (
 id uuid primary key default gen_random_uuid(), type text not null, "carId" text,
 "visitorId" text, "sessionId" text, created timestamptz not null default now(),
 meta_json jsonb not null default '{}'::jsonb
);
create table if not exists public.leads (
 id uuid primary key default gen_random_uuid(), "carId" text, name text, phone text, notes text,
 created timestamptz not null default now()
);
create table if not exists public.audit (
 id uuid primary key default gen_random_uuid(), action text not null, details text,
 created timestamptz not null default now()
);
create index if not exists analytics_car_idx on public.analytics("carId");
create index if not exists analytics_type_idx on public.analytics(type);
create index if not exists analytics_created_idx on public.analytics(created);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists cars_updated_at on public.cars;
create trigger cars_updated_at before update on public.cars
for each row execute function public.set_updated_at();

alter table public.cars enable row level security;
alter table public.analytics enable row level security;
alter table public.leads enable row level security;
alter table public.audit enable row level security;

drop policy if exists "public read active cars" on public.cars;
create policy "public read active cars" on public.cars for select to anon, authenticated using(status='active');
drop policy if exists "admins manage cars" on public.cars;
create policy "admins manage cars" on public.cars for all to authenticated using(true) with check(true);

drop policy if exists "public insert analytics" on public.analytics;
create policy "public insert analytics" on public.analytics for insert to anon, authenticated with check(true);
drop policy if exists "admins read analytics" on public.analytics;
create policy "admins read analytics" on public.analytics for select to authenticated using(true);

drop policy if exists "public insert leads" on public.leads;
create policy "public insert leads" on public.leads for insert to anon, authenticated with check(true);
drop policy if exists "admins manage leads" on public.leads;
create policy "admins manage leads" on public.leads for all to authenticated using(true) with check(true);

drop policy if exists "admins audit" on public.audit;
create policy "admins audit" on public.audit for all to authenticated using(true) with check(true);

insert into storage.buckets(id,name,public) values('car-media','car-media',true)
on conflict(id) do update set public=true;
drop policy if exists "public read car media" on storage.objects;
create policy "public read car media" on storage.objects for select to anon,authenticated using(bucket_id='car-media');
drop policy if exists "authenticated upload car media" on storage.objects;
create policy "authenticated upload car media" on storage.objects for insert to authenticated with check(bucket_id='car-media');
drop policy if exists "authenticated update car media" on storage.objects;
create policy "authenticated update car media" on storage.objects for update to authenticated using(bucket_id='car-media') with check(bucket_id='car-media');
drop policy if exists "authenticated delete car media" on storage.objects;
create policy "authenticated delete car media" on storage.objects for delete to authenticated using(bucket_id='car-media');

-- Initial showroom data. Verify official prices/specs before commercial launch.
insert into public.cars(id,brand,name,year,price,type,engine,power,gear,desc,tags,"order",status,img,frames) values
('seed-xtrail','Nissan','X-Trail e-POWER','2026','1,999,990 جنيه','SUV عائلية','e-POWER','213 حصان','e-4ORCE / حسب الفئة','SUV عائلية تجمع بين الراحة والمساحة وتجربة قيادة كهربائية مدعومة بمحرك بنزين لتوليد الطاقة.','["عائلية","مغامرة","Premium"]',1,'active','assets/xtrail_white.jpg','[]'),
('seed-sunny','Nissan','Sunny','2024','765,000 جنيه','Sedan','1.5L','108 حصان','CVT / حسب الفئة','سيدان عملية للاستخدام اليومي داخل المدينة مع مساحة مناسبة وتجهيزات أساسية.','["مدينة","اقتصادية"]',2,'active','assets/nissan-sunny.jpg','[]'),
('seed-sentra','Nissan','Sentra','2026','1,050,000 جنيه','Sedan','1.6L','118 حصان','CVT','سيدان مريحة للاستخدام اليومي والسفر.','["مدينة","راحة"]',3,'active','assets/nissan-sentra.jpg','[]'),
('seed-juke','Nissan','Juke','2026','1,159,999 جنيه','Crossover','1.0L Turbo','115 حصان','DCT / حسب الفئة','كروس أوفر مدمجة بتصميم جريء وحجم مناسب للمدينة.','["مدينة","Premium"]',4,'active','assets/nissan-juke.jpg','[]'),
('seed-x70','Jetour','X70 FL','2026','يُحدد لدى الوكيل','SUV 7 مقاعد','1.5L Turbo','156 حصان','DCT / حسب الفئة','SUV عائلية بسبعة مقاعد ومساحة مناسبة للاستخدام العائلي.','["عائلية","راحة"]',1,'active','assets/jetour-x70.jpg','[]'),
('seed-t2','Jetour','T2','2026','يُحدد لدى الوكيل','SUV Adventure','2.0L Turbo','254 حصان','7DCT','SUV بطابع مغامر وتجهيزات قوية.','["مغامرة","Premium"]',2,'active','assets/jetour-t2.png','[]'),
('seed-eclipse','Mitsubishi','Eclipse Cross','2026','1,400,000 جنيه','SUV','1.5L Turbo','150 حصان','CVT','SUV متوازنة بين الاستخدام اليومي والتجهيزات والراحة.','["مدينة","Premium"]',1,'active','assets/mitsubishi-eclipse-cross.jpg','[]'),
('seed-outlander','Mitsubishi','Outlander Sport','2026','1,375,000 جنيه','SUV','2.0L','150 حصان','CVT','SUV عملية مع مساحة جيدة ووضعية قيادة مرتفعة.','["عائلية","مدينة"]',2,'active','assets/mitsubishi-outlander.jpg','[]')
on conflict(id) do nothing;

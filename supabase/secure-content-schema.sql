create table if not exists public.course_content (
  course_slug text primary key,
  version text not null,
  title text not null,
  payload jsonb not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.course_content enable row level security;
-- Sin políticas públicas: solo Edge Functions con service role.

create table if not exists public.evidence_library (
  item_id text primary key,
  course_slug text not null,
  title text not null,
  source_type text not null,
  module text,
  tier text,
  lot integer,
  summary text,
  clinical_use text,
  caution text,
  tags jsonb not null default '[]'::jsonb,
  original_relation text,
  sort_order integer not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.evidence_library enable row level security;
create index if not exists evidence_library_course_idx on public.evidence_library(course_slug, sort_order);

alter table public.course_access add column if not exists purchase_date timestamptz;
alter table public.course_access add column if not exists warranty_date timestamptz;
alter table public.course_access add column if not exists product_ucode text;
alter table public.course_access add column if not exists access_source text not null default 'manual';
alter table public.course_access add column if not exists last_event_at timestamptz;
create index if not exists course_access_event_order_idx on public.course_access(course_slug, lower(email), last_event_at desc);

create table if not exists public.hotmart_events (
  event_id text primary key,
  event_type text not null,
  product_ucode text,
  buyer_email text,
  transaction_id text,
  event_date timestamptz,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);
alter table public.hotmart_events enable row level security;
create index if not exists hotmart_events_email_idx on public.hotmart_events(lower(buyer_email));

comment on table public.course_content is 'Contenido privado del curso. No exponer por REST público.';
comment on table public.evidence_library is 'Catálogo privado de los contenidos de evidencia.';
comment on table public.hotmart_events is 'Auditoría y deduplicación de webhooks Hotmart.';
comment on column public.course_access.last_event_at is 'Fecha informada por Hotmart para evitar que eventos antiguos sobrescriban estados más recientes.';
comment on column public.hotmart_events.event_date is 'Fecha del evento informada por Hotmart.';

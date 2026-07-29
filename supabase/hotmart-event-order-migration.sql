-- Ejecutar una sola vez en Supabase SQL Editor antes de desplegar el webhook actualizado.

alter table public.course_access
  add column if not exists last_event_at timestamptz;

alter table public.hotmart_events
  add column if not exists event_date timestamptz;

create index if not exists course_access_event_order_idx
  on public.course_access (course_slug, lower(email), last_event_at desc);

comment on column public.course_access.last_event_at is
  'Fecha informada por Hotmart para evitar que eventos antiguos sobrescriban estados más recientes.';

comment on column public.hotmart_events.event_date is
  'Fecha del evento informada por Hotmart, separada de la fecha en que Supabase lo procesó.';

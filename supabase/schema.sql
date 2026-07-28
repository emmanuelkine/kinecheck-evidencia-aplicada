create table if not exists public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  profile text not null default 'student' check (profile in ('student','professional')),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_slug)
);
alter table public.learning_progress enable row level security;
create policy "read own progress" on public.learning_progress for select using (auth.uid() = user_id);
create policy "insert own progress" on public.learning_progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.learning_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.course_access (
  email text not null,
  course_slug text not null,
  active boolean not null default false,
  hotmart_product_id text,
  transaction_id text,
  last_event text,
  updated_at timestamptz not null default now(),
  primary key (email, course_slug)
);
alter table public.course_access enable row level security;
-- Sin políticas públicas: course-key y hotmart-webhook usan service role.
create index if not exists course_access_email_idx on public.course_access(lower(email));
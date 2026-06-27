-- Run this once in Supabase: SQL Editor > New query.
-- Each policy limits a learner to their own records.

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_index integer not null default 0 check (current_index >= 0),
  correct_count integer not null default 0 check (correct_count >= 0)
);

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  question_id text not null,
  grammar text not null,
  selected_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create table if not exists public.mistake_notebook (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  grammar text not null,
  sentence text not null,
  selected_answer text not null,
  correct_answer text not null,
  note text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.generated_vocab_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  reading text not null,
  meaning text not null,
  example text not null,
  category text not null default 'AI生成',
  created_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.mistake_notebook enable row level security;
alter table public.generated_vocab_entries enable row level security;

create policy "Learners manage their own sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Learners manage their own attempts" on public.practice_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Learners manage their own notebook" on public.mistake_notebook
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Learners manage their own generated vocab" on public.generated_vocab_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

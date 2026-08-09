alter table public.manuscripts
  add column if not exists editor_content text,
  add column if not exists writing_profile jsonb not null default '{}'::jsonb;

comment on column public.manuscripts.editor_content is
  'Rich-text HTML used by the manuscript writing studio. Plain text remains in Storage for downstream publishing jobs.';

comment on column public.manuscripts.writing_profile is
  'Author-controlled voice, tone, audience, point of view, story bible, and AI collaboration preferences.';

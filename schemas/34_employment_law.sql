-- Enable the pgvector extension
create extension if not exists vector;

-- Create the table
create table employment_law (
  id uuid primary key,
  country text not null,
  sr_number text,
  title text,
  content text,
  url text,
  language text,
  source_format text,
  chunk_index int,
  embedding_openai_3_large vector(3072),
  embedding_jina_v3 vector(1024),
  created_at timestamptz default now()
);

-- Enable RLS
alter table employment_law enable row level security;

-- Policies
create policy "Public read access" on employment_law for select using (true);
create policy "Service role full access" on employment_law for all to service_role using (true) with check (true);

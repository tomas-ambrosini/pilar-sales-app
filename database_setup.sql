CREATE TABLE proposals (
  id text primary key,
  customer text,
  date text,
  amount numeric,
  status text,
  created_at timestamp with time zone default now()
);

-- Turn on Public Access so we can read/write without a Login screen yet (for prototyping)
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON proposals FOR ALL USING (true);

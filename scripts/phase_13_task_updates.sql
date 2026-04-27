-- Create task_updates table
CREATE TABLE IF NOT EXISTS task_updates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    attachment_url text,
    attachment_name text,
    attachment_type text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for task_updates
ALTER TABLE task_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to task_updates" 
ON task_updates FOR ALL TO authenticated USING (true);

-- Storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
CREATE POLICY "Public Access task-attachments" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'task-attachments' );

CREATE POLICY "Auth Upload task-attachments" 
ON storage.objects FOR INSERT 
TO authenticated WITH CHECK ( bucket_id = 'task-attachments' );

CREATE POLICY "Auth Update task-attachments" 
ON storage.objects FOR UPDATE 
TO authenticated USING ( bucket_id = 'task-attachments' );

CREATE POLICY "Auth Delete task-attachments" 
ON storage.objects FOR DELETE 
TO authenticated USING ( bucket_id = 'task-attachments' );

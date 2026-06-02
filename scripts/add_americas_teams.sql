-- Supabase SQL Migration to add the new Americas teams

INSERT INTO public.camp_teams (name, color_hex, points) VALUES
('Mexico', '#90EE90', 0),
('Canada', '#800000', 0),
('Panama', '#FF6666', 0),
('Uruguay', '#000522', 0);

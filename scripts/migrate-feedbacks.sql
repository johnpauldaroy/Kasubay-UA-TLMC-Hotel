-- Run this in Supabase SQL Editor
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS transaction_code text;

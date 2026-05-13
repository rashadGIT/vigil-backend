-- Add new enum values only — must be committed before they can be used in data migrations
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'funeral_director';

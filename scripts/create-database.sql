
-- Create extension for UUID if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_settings table
CREATE TABLE "app_settings" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "max_users" INTEGER NOT NULL DEFAULT 50,
  "registration_open" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE "user_profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  "search_count" INTEGER NOT NULL DEFAULT 0,
  "is_admin" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create artist_recommendations_cache table
CREATE TABLE "artist_recommendations_cache" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "artist_name" TEXT NOT NULL,
  "artist_spotify_id" TEXT NOT NULL,
  "artist_data" JSONB NOT NULL,
  "recommendations" JSONB NOT NULL,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "created_by" UUID REFERENCES auth.users ON DELETE SET NULL
);

-- Add unique constraint on artist_name (case insensitive)
CREATE UNIQUE INDEX artist_name_unique_idx ON "artist_recommendations_cache" (LOWER(artist_name));

-- Add indexes for better performance
CREATE INDEX artist_recommendations_cache_is_featured_idx ON "artist_recommendations_cache" (is_featured);
CREATE INDEX artist_spotify_id_idx ON "artist_recommendations_cache" (artist_spotify_id);
CREATE INDEX user_profiles_is_admin_idx ON "user_profiles" (is_admin);

-- Insert default app settings
INSERT INTO "app_settings" (max_users, registration_open)
VALUES (50, true);

-- Enable RLS (Row Level Security) for all tables
ALTER TABLE "artist_recommendations_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for artist_recommendations_cache
-- Everyone can read
CREATE POLICY "Anyone can view artist recommendations" 
  ON "artist_recommendations_cache" FOR SELECT USING (true);

-- Only authenticated users can insert (fixed syntax)
CREATE POLICY "Authenticated users can create artist recommendations" 
  ON "artist_recommendations_cache" FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Only admins or the creator can update
CREATE POLICY "Admins and creators can update artist recommendations" 
  ON "artist_recommendations_cache" FOR UPDATE 
  USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Create RLS policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
  ON "user_profiles" FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
  ON "user_profiles" FOR SELECT 
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON "user_profiles" FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for app_settings
-- Everyone can read settings
CREATE POLICY "Anyone can view app settings" 
  ON "app_settings" FOR SELECT USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update app settings" 
  ON "app_settings" FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  COUNT(*) AS total_users,
  SUM(search_count) AS total_searches,
  COUNT(*) FILTER (WHERE is_admin = true) AS admin_count,
  COUNT(*) FILTER (WHERE search_count >= 3) AS users_at_limit
FROM user_profiles;

-- Create a view for featured artists statistics
CREATE OR REPLACE VIEW featured_artists_statistics AS
SELECT 
  COUNT(*) AS total_cached_artists,
  COUNT(*) FILTER (WHERE is_featured = true) AS featured_count,
  AVG(JSONB_ARRAY_LENGTH(recommendations)) AS avg_recommendations_per_artist
FROM artist_recommendations_cache;

-- Create a function to increment user search count
CREATE OR REPLACE FUNCTION increment_search_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET search_count = search_count + 1
  WHERE id = NEW.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to increment user search count on cache insert
CREATE TRIGGER increment_search_count_trigger
AFTER INSERT ON artist_recommendations_cache
FOR EACH ROW
WHEN (NEW.created_by IS NOT NULL)
EXECUTE FUNCTION increment_search_count();

-- Create a function to check if user can search
CREATE OR REPLACE FUNCTION can_user_search(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  search_count INTEGER;
BEGIN
  SELECT up.search_count INTO search_count
  FROM user_profiles up
  WHERE up.id = user_id;
  
  RETURN search_count < 3;
END;
$$ LANGUAGE plpgsql;
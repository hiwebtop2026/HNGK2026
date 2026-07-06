CREATE TABLE IF NOT EXISTS auth_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_email ON auth_otps(email);

ALTER TABLE auth_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous to insert OTP" ON auth_otps;
CREATE POLICY "Allow anonymous to insert OTP" ON auth_otps
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous to select OTP" ON auth_otps;
CREATE POLICY "Allow anonymous to select OTP" ON auth_otps
  FOR SELECT TO anon USING (email IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated to manage OTP" ON auth_otps;
CREATE POLICY "Allow authenticated to manage OTP" ON auth_otps
  FOR ALL TO authenticated USING (true);

CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth_otps WHERE expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_expired_otps ON auth_otps;
CREATE TRIGGER trigger_cleanup_expired_otps
AFTER INSERT ON auth_otps
EXECUTE FUNCTION cleanup_expired_otps();
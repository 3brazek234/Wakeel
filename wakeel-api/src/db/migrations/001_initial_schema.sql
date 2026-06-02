-- 001_initial_schema.sql
-- Wakeel — Lawyer Marketplace for Egypt

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  bar_id        VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'suspended')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- COURTS
-- ═══════════════════════════════════════
CREATE TABLE courts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  governorate   VARCHAR(100) NOT NULL,
  city          VARCHAR(100) NOT NULL
);

-- ═══════════════════════════════════════
-- LAWYER ↔ COURT junction
-- ═══════════════════════════════════════
CREATE TABLE lawyer_courts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  court_id      UUID REFERENCES courts(id) ON DELETE CASCADE,
  verified_at   TIMESTAMPTZ,
  UNIQUE(user_id, court_id)
);

-- ═══════════════════════════════════════
-- JOBS
-- ═══════════════════════════════════════
CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  court_id      UUID REFERENCES courts(id),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  task_type     VARCHAR(100),
  fee           NUMERIC(10,2) NOT NULL,
  deadline      DATE NOT NULL,
  status        VARCHAR(20) DEFAULT 'open'
                CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- APPLICATIONS
-- ═══════════════════════════════════════
CREATE TABLE applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  cover_note    TEXT,
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

-- ═══════════════════════════════════════
-- MESSAGES (chat)
-- ═══════════════════════════════════════
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- REVIEWS
-- ═══════════════════════════════════════
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE,
  reviewer_id   UUID REFERENCES users(id),
  reviewee_id   UUID REFERENCES users(id),
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, reviewer_id)
);

-- ═══════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════
CREATE INDEX idx_jobs_poster      ON jobs(poster_id);
CREATE INDEX idx_jobs_court       ON jobs(court_id);
CREATE INDEX idx_jobs_status      ON jobs(status);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_messages_job     ON messages(job_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);

-- ═══════════════════════════════════════
-- SEED: 10 real Egyptian courts
-- ═══════════════════════════════════════
INSERT INTO courts (name, governorate, city) VALUES
  ('محكمة القاهرة الابتدائية',   'القاهرة',      'القاهرة'),
  ('محكمة الجيزة الابتدائية',    'الجيزة',       'الجيزة'),
  ('محكمة الإسكندرية الابتدائية','الإسكندرية',   'الإسكندرية'),
  ('محكمة أسوان الابتدائية',     'أسوان',        'أسوان'),
  ('محكمة الأقصر الابتدائية',    'الأقصر',       'الأقصر'),
  ('محكمة المنصورة الابتدائية',  'الدقهلية',     'المنصورة'),
  ('محكمة طنطا الابتدائية',      'الغربية',      'طنطا'),
  ('محكمة الإسماعيلية الابتدائية','الإسماعيلية', 'الإسماعيلية'),
  ('محكمة بورسعيد الابتدائية',   'بورسعيد',      'بورسعيد'),
  ('محكمة أسيوط الابتدائية',     'أسيوط',        'أسيوط');

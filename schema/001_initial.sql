-- 红色文化传播网 · Cloudflare D1 初始 schema（2026-09-02 全迁 · 方案4：昵称+Turnstile，无密码）
-- 应用：CF Pages Functions 通过 binding.DB 访问
-- 时间字段统一存 Unix epoch ms (INTEGER)
-- ID 统一 nanoid(12)

-- ============================================================
-- 用户表（零 PII：无密码、无邮箱、无手机号）
-- nickname UNIQUE 但大小写不敏感：lower_nickname 作唯一键
-- 首占者拥有昵称，后续重名直接拒绝（防冒名）
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  nickname        TEXT NOT NULL,            -- 显示用，原始大小写
  lower_nickname  TEXT NOT NULL UNIQUE,    -- 唯一键，lower(nickname)
  created_at      INTEGER NOT NULL,
  last_login_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

-- ============================================================
-- 成绩表
-- nickname 冗余存：用户改昵称后历史成绩仍显示原昵称
-- book 标识：""=首页知识考核；"红星照耀中国"/"红岩" 等
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_scores (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  nickname        TEXT NOT NULL DEFAULT '',
  score           INTEGER NOT NULL,
  total           INTEGER NOT NULL,
  duration_sec    INTEGER NOT NULL DEFAULT 0,
  book            TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_scores_user ON quiz_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_score ON quiz_scores(score DESC, duration_sec ASC);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_book ON quiz_scores(book, score DESC);

-- ============================================================
-- AI 问答审计日志（best-effort 写，失败不影响主流程）
-- status: ok/sensitive_in/sensitive_out/grounding/no_context/invalid/error/refusal
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_logs (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,
  question        TEXT NOT NULL,
  contexts_json   TEXT,
  answer          TEXT,
  status          TEXT NOT NULL,
  sensitive       INTEGER NOT NULL DEFAULT 0,
  grounded        INTEGER NOT NULL DEFAULT 1,
  code            TEXT,
  created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON ai_logs(status, created_at DESC);

-- ============================================================
-- 敏感词库（运营管理）
-- status: pending(待审)/active(生效)/rejected(驳回)
-- ============================================================
CREATE TABLE IF NOT EXISTS sensitive_words (
  id              TEXT PRIMARY KEY,
  word            TEXT NOT NULL UNIQUE,
  category        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      INTEGER NOT NULL,
  approved_at     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sensitive_words_status ON sensitive_words(status);

-- ============================================================
-- 用户纠错提交（无需登录）
-- status: pending/resolved/rejected
-- ============================================================
CREATE TABLE IF NOT EXISTS corrections (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,
  content_type    TEXT NOT NULL DEFAULT '通用',
  quote           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL,
  contact         TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending',
  handle_note     TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_corrections_status ON corrections(status, created_at DESC);

-- ============================================================
-- 初始化运营敏感词（与 CloudBase 时期 BASE 词表一致，active 立即生效）
-- ============================================================
INSERT OR IGNORE INTO sensitive_words (id, word, category, status, created_at, approved_at)
VALUES
  ('sw_init_001', '反动', '政治', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_002', '颠覆国家', '政治', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_003', '分裂国家', '政治', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_004', '煽动分裂', '政治', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_005', '台独', '政治', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_006', '港独', '政治', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_007', '藏独', '政治', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_008', '疆独', '政治', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_009', '法轮', '邪教', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_010', '邪教', '邪教', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_011', '历史虚无主义', '历史', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_012', '抹黑党史', '历史', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_013', '歪曲历史', '历史', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_014', '诋毁英雄', '历史', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_015', '污蔑烈士', '历史', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_016', '色情', '低俗', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_017', '裸聊', '低俗', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_018', '卖淫', '低俗', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_019', '淫秽', '低俗', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_020', '赌博', '违法', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_021', '毒品', '违法', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_022', '冰毒', '违法', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_023', '摇头丸', '违法', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_024', '大麻', '违法', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_025', '代办文凭', '广告', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_026', '代开发票', '广告', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_027', '招嫖', '违法', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_028', '办证', '广告', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_029', '出售个人信息', '违法', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_030', '代考', '违法', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_031', '去死', '极端', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_032', '自杀', '极端', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_033', '自残', '极端', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_034', '杀人', '极端', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000),
  ('sw_init_035', '报复社会', '极端', 'active', strftime('%s','now')*1000, strftime('%s','now')*1000);

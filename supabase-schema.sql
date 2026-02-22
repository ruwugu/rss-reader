-- AI RSS Reader 数据库 schema (更新版)
-- 支持系统预设订阅源和用户自定义展示

-- 1. 修改 feeds 表 (订阅源) - 使用 TEXT 类型的 ID
DROP TABLE IF EXISTS public.articles;
DROP TABLE IF EXISTS public.feeds;

CREATE TABLE IF NOT EXISTS public.feeds (
  id TEXT PRIMARY KEY,  -- 使用字符串 ID，如 "twitter-karpathy"
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  twitter_handle TEXT NOT NULL,
  rss_url TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,  -- 标记是否为系统预设
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 articles 表 (文章/推文) - user_id 允许为 NULL（系统抓取的公共文章）
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id TEXT REFERENCES public.feeds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- 允许 NULL 表示公共文章
  title TEXT NOT NULL,
  content_raw TEXT,
  content_zh TEXT,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_articles_feed_published ON public.articles(feed_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_user_published ON public.articles(user_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_user_read ON public.articles(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_feeds_user ON public.feeds(user_id);

-- 4. 启用 RLS (Row Level Security)
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略: feeds
-- 用户可以查看自己的订阅和系统预设订阅
CREATE POLICY "用户可以查看自己的订阅" ON public.feeds
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- 用户只能管理自己的订阅（不能修改系统预设）
CREATE POLICY "用户只能管理自己的订阅" ON public.feeds
  FOR ALL USING (user_id = auth.uid());

-- 6. RLS 策略: articles
-- 用户可以查看自己的文章和公共文章
CREATE POLICY "用户可以查看自己的文章" ON public.articles
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- 用户只能管理自己的文章记录
CREATE POLICY "用户只能管理自己的文章" ON public.articles
  FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

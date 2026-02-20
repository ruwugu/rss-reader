-- AI RSS Reader 数据库 schema
-- 在 Supabase 的 SQL Editor 中运行此脚本

-- 1. 创建 feeds 表 (订阅源)
CREATE TABLE IF NOT EXISTS public.feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  twitter_handle TEXT NOT NULL,
  rss_url TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 articles 表 (文章/推文)
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_articles_user_published ON public.articles(user_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_user_read ON public.articles(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_feeds_user ON public.feeds(user_id);

-- 4. 启用 RLS (Row Level Security)
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略: feeds
CREATE POLICY "用户只能看自己的订阅" ON public.feeds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能添加自己的订阅" ON public.feeds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的订阅" ON public.feeds
  FOR DELETE USING (auth.uid() = user_id);

-- 6. RLS 策略: articles
CREATE POLICY "用户只能看自己的文章" ON public.articles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能添加自己的文章" ON public.articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的文章" ON public.articles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的文章" ON public.articles
  FOR DELETE USING (auth.uid() = user_id);

-- 7. 创建默认订阅数据函数
CREATE OR REPLACE FUNCTION create_default_feeds()
RETURNS TRIGGER AS $$
BEGIN
  -- 为新用户添加默认订阅
  INSERT INTO public.feeds (user_id, name, twitter_handle, rss_url, avatar_url)
  VALUES 
    (NEW.id, 'Andrej Karpathy', 'karpathy', 'https://rsshub.app/twitter/user/karpathy', 'https://pbs.twimg.com/profile_images/1594489848945246208/-KlJjV35_400x400.jpg'),
    (NEW.id, 'Ilya Sutskever', 'ilyasut', 'https://rsshub.app/twitter/user/ilyasut', 'https://pbs.twimg.com/profile_images/1581408296096934912/yCi4S4Ci_400x400.jpg');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 创建触发器: 新用户注册时添加默认订阅
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_feeds();

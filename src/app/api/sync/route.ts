import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Parser from 'rss-parser'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RSS 源配置
  const RSS_SOURCES = [
    {
      name: 'Hacker News Best',
      url: 'https://hnrss.org/best',
      avatar: 'https://news.ycombinator.com/y18.svg'
    },
    {
      name: 'Hacker News New',
      url: 'https://hnrss.org/newest',
      avatar: 'https://news.ycombinator.com/y18.svg'
    },
    {
      name: 'TechCrunch',
      url: 'https://techcrunch.com/feed/',
      avatar: 'https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png'
    },
    {
      name: 'MIT Tech Review',
      url: 'https://www.technologyreview.com/feed/',
      avatar: 'https://www.technologyreview.com/favicon.ico'
    }
  ]

  const parser = new Parser()
  let newArticlesCount = 0

  for (const source of RSS_SOURCES) {
    try {
      // 检查订阅源是否已存在
      let { data: feed } = await supabase
        .from('feeds')
        .select('*')
        .eq('user_id', user.id)
        .eq('rss_url', source.url)
        .single()

      // 如果不存在，创建订阅源
      if (!feed) {
        const { data: newFeed } = await supabase
          .from('feeds')
          .insert({
            user_id: user.id,
            name: source.name,
            twitter_handle: source.name.toLowerCase().replace(/\s+/g, '_'),
            rss_url: source.url,
            avatar_url: source.avatar,
            is_active: true
          })
          .select()
          .single()
        feed = newFeed
      }

      if (!feed) continue

      // 拉取 RSS
      const rss = await parser.parseURL(source.url)
      
      for (const item of rss.items || []) {
        const url = item.link || `hn-${item.guid || Math.random()}`
        
        // 检查是否已存在
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('user_id', user.id)
          .eq('url', url)
          .single()

        if (!existing) {
          const content = item.content || item.contentSnippet || item.summary || ''
          const title = item.title || '无标题'
          const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()

          await supabase.from('articles').insert({
            feed_id: feed.id,
            user_id: user.id,
            title,
            content_raw: content,
            url,
            published_at: publishedAt,
          })
          newArticlesCount++
        }
      }
    } catch (error) {
      console.error(`Error fetching ${source.name}:`, error)
    }
  }

  return Response.json({ success: true, newArticlesCount })
}

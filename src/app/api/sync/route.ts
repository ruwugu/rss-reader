import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Parser from 'rss-parser'

export const dynamic = 'force-dynamic'
export const fetchCache = 'no-store'

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

  // 只获取用户已开启的订阅源进行同步
  const { data: activeFeeds } = await supabase
    .from('feeds')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (!activeFeeds || activeFeeds.length === 0) {
    return Response.json({ success: true, newArticlesCount: 0, message: '没有开启的订阅源' })
  }

  const parser = new Parser({ timeout: 5000 })
  let newArticlesCount = 0

  try {
    for (const feed of activeFeeds) {
      try {
        // 拉取 RSS，设置超时
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        
        const rss = await parser.parseURL(feed.rss_url)
        clearTimeout(timeout)
        
        if (!rss.items) continue
        
        for (const item of rss.items) {
          const url = item.link || `feed-${item.guid || Math.random()}`
          
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
      } catch (feedError) {
        console.error(`Error fetching ${feed.name}:`, feedError)
        // 继续处理下一个 feed
      }
    }
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }

  return Response.json({ success: true, newArticlesCount })
}

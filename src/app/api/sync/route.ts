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

  // 获取用户的所有 feeds
  const { data: feeds } = await supabase
    .from('feeds')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const parser = new Parser()
  let newArticlesCount = 0

  for (const feed of feeds || []) {
    try {
      // 从 RSSHub 获取 RSS
      const rss = await parser.parseURL(feed.rss_url)
      
      for (const item of rss.items || []) {
        // 检查是否已存在
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('user_id', user.id)
          .eq('url', item.link || '')
          .single()

        if (!existing) {
          // 提取内容
          const content = item.content || item.contentSnippet || item.summary || ''
          const title = item.title || '无标题'
          const url = item.link || ''
          const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()

          // 插入文章
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
      console.error(`Error fetching ${feed.name}:`, error)
    }
  }

  return Response.json({ success: true, newArticlesCount })
}

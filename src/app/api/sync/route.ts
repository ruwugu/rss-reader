import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Parser from 'rss-parser'

export const dynamic = 'force-dynamic'

// 使用客户端代理来获取 RSS（绕过 Vercel 服务器无法访问外部服务的问题）
async function fetchRSSWithProxy(url: string): Promise<string> {
  // 尝试多个 CORS 代理
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ]
  
  const parser = new Parser({ timeout: 15000 })
  
  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        }
      })
      
      clearTimeout(timeout)
      
      if (response.ok) {
        const text = await response.text()
        // 验证返回的是有效的 XML
        if (text.includes('<rss') || text.includes('<feed')) {
          return text
        }
      }
    } catch (e) {
      console.log(`Proxy ${proxyUrl} failed:`, e)
      continue
    }
  }
  
  // 如果代理都失败，尝试直接获取
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (response.ok) {
      return await response.text()
    }
  } catch (e) {
    console.log(`Direct fetch failed:`, e)
  }
  
  throw new Error('All fetch methods failed')
}

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
  let feedsProcessed = 0
  const errors: string[] = []

  try {
    for (const feed of activeFeeds) {
      try {
        const { data: latestArticle } = await supabase
          .from('articles')
          .select('published_at')
          .eq('feed_id', feed.id)
          .eq('user_id', user.id)
          .order('published_at', { ascending: false })
          .limit(1)
          .single()
        
        const lastSyncTime = latestArticle?.published_at ? new Date(latestArticle.published_at).getTime() : 0
        
        // 使用代理获取 RSS
        let rssText: string
        try {
          rssText = await fetchRSSWithProxy(feed.rss_url)
        } catch (e) {
          console.error(`Failed to fetch ${feed.name}:`, e)
          errors.push(`${feed.name}: ${e}`)
          continue
        }
        
        const rss = await parser.parseString(rssText)
        
        if (!rss.items) continue
        
        let feedNewCount = 0
        for (const item of rss.items) {
          const itemTime = item.pubDate ? new Date(item.pubDate).getTime() : 0
          
          if (itemTime <= lastSyncTime) continue
          
          const url = item.link || `feed-${item.guid || Math.random()}`
          
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
            feedNewCount++
          }
        }
        
        feedsProcessed++
        console.log(`Feed ${feed.name}: ${feedNewCount} new articles`)
      } catch (feedError) {
        console.error(`Error fetching ${feed.name}:`, feedError)
        errors.push(`${feed.name}: ${feedError}`)
      }
    }
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ success: false, error: String(error), errors }, { status: 500 })
  }

  return Response.json({ 
    success: true, 
    newArticlesCount, 
    feedsProcessed,
    errors: errors.length > 0 ? errors : undefined 
  })
}

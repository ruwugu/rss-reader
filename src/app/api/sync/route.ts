import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Parser from 'rss-parser'

export const dynamic = 'force-dynamic'

// 预设的 RSS 订阅源列表
const DEFAULT_FEEDS = [
  { id: 'twitter-karpathy', name: 'Andrej Karpathy', twitter_handle: 'karpathy', url: 'https://rsshub.pseudoyu.com/twitter/user/karpathy', avatar: 'https://pbs.twimg.com/profile_images/1296667294148382721/9Pr6XrPB.jpg' },
  { id: 'twitter-sama', name: 'Sam Altman', twitter_handle: 'sama', url: 'https://rsshub.pseudoyu.com/twitter/user/sama', avatar: 'https://pbs.twimg.com/profile_images/1904933748015255552/k43GMz63.jpg' },
  { id: 'twitter-sagacity', name: '池建强', twitter_handle: 'sagacity', url: 'https://rsshub.pseudoyu.com/twitter/user/sagacity', avatar: 'https://pbs.twimg.com/profile_images/837956718/_____2010-04-20___10.16.37_400x400.png' },
]

// 简单的 RSS 获取
async function fetchRSS(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RSSReader/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      }
    })
    clearTimeout(timeout)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.text()
  } catch (e: any) {
    clearTimeout(timeout)
    console.log(`Fetch error for ${url}:`, e.message)
    throw e
  }
}

// 系统自动同步所有预设订阅源
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

  const parser = new Parser({ timeout: 30000 })
  let newArticlesCount = 0
  let feedsProcessed = 0
  const results: any[] = []

  // 1. 为每个 feed 确保系统记录存在
  for (const feedInfo of DEFAULT_FEEDS) {
    try {
      // 尝试插入系统 feed（忽略已存在错误）
      await supabase.from('feeds').insert({
        id: feedInfo.id,
        user_id: null,
        name: feedInfo.name,
        twitter_handle: feedInfo.twitter_handle,
        rss_url: feedInfo.url,
        avatar_url: feedInfo.avatar,
        is_active: true,
        is_system: true,
      }).then(({ error }) => {
        // 忽略重复 key 错误
        if (error && !error.message.includes('duplicate')) {
          console.log(`Feed insert warning: ${error.message}`)
        }
      })
    } catch (e) {
      console.log(`Feed ${feedInfo.id} insert:`, e)
    }
  }

  // 2. 抓取所有预设订阅源的文章
  for (const feedInfo of DEFAULT_FEEDS) {
    try {
      console.log(`Fetching ${feedInfo.name}...`)
      
      // 获取 RSS
      const rssText = await fetchRSS(feedInfo.url)
      const rss = await parser.parseString(rssText)
      
      if (!rss.items || rss.items.length === 0) {
        results.push({ feed: feedInfo.name, status: 'no_items' })
        continue
      }
      
      // 获取最近的文章时间
      const { data: latestArticle } = await supabase
        .from('articles')
        .select('published_at')
        .eq('feed_id', feedInfo.id)
        .order('published_at', { ascending: false })
        .limit(1)
        .single()
      
      const lastSyncTime = latestArticle?.published_at 
        ? new Date(latestArticle.published_at).getTime() 
        : 0
      
      let feedNewCount = 0
      for (const item of rss.items.slice(0, 20)) { // 只取最新20条
        const itemTime = item.pubDate ? new Date(item.pubDate).getTime() : 0
        
        // 跳过旧文章
        if (itemTime <= lastSyncTime) continue
        
        const url = item.link || `feed-${item.guid || Math.random()}`
        
        // 检查是否已存在
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('feed_id', feedInfo.id)
          .eq('url', url)
          .single()

        if (!existing) {
          const content = item.content || item.contentSnippet || item.summary || ''
          const title = item.title || '无标题'
          const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()

          await supabase.from('articles').insert({
            feed_id: feedInfo.id,
            user_id: null, // 公共文章
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
      results.push({ feed: feedInfo.name, new: feedNewCount, total: rss.items.length })
      console.log(`✓ ${feedInfo.name}: ${feedNewCount} new articles`)
      
    } catch (e: any) {
      console.error(`✗ ${feedInfo.name} error:`, e.message)
      results.push({ feed: feedInfo.name, error: e.message })
    }
  }

  return Response.json({ 
    success: true, 
    newArticlesCount, 
    feedsProcessed,
    results
  })
}

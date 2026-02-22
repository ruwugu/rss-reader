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

// 预设的 RSS 订阅源列表
const DEFAULT_FEEDS = [
  { id: 'twitter-karpathy', name: 'Andrej Karpathy', twitter_handle: 'karpathy', url: 'https://rsshub.pseudoyu.com/twitter/user/karpathy', avatar: 'https://pbs.twimg.com/profile_images/1296667294148382721/9Pr6XrPB.jpg' },
  { id: 'twitter-sama', name: 'Sam Altman', twitter_handle: 'sama', url: 'https://rsshub.pseudoyu.com/twitter/user/sama', avatar: 'https://pbs.twimg.com/profile_images/1904933748015255552/k43GMz63.jpg' },
  { id: 'twitter-sagacity', name: '池建强', twitter_handle: 'sagacity', url: 'https://rsshub.pseudoyu.com/twitter/user/sagacity', avatar: 'https://pbs.twimg.com/profile_images/837956718/_____2010-04-20___10.16.37_400x400.png' },
]

// 系统自动同步所有预设订阅源（不区分用户，公共缓存）
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

  const parser = new Parser({ timeout: 5000 })
  let newArticlesCount = 0
  let feedsProcessed = 0
  const errors: string[] = []

  // 1. 确保所有预设订阅源存在于 feeds 表中
  for (const feedInfo of DEFAULT_FEEDS) {
    const { data: existingFeed } = await supabase
      .from('feeds')
      .select('id')
      .eq('id', feedInfo.id)
      .single()
    
    if (!existingFeed) {
      // 创建预设订阅源（user_id 为空表示系统预设），使用 upsert 避免冲突
      await supabase.from('feeds').upsert({
        id: feedInfo.id,
        user_id: null, // 系统预设，不属于任何用户
        name: feedInfo.name,
        twitter_handle: feedInfo.twitter_handle,
        rss_url: feedInfo.url,
        avatar_url: feedInfo.avatar,
        is_active: true,
        is_system: true, // 标记为系统预设
      }, { onConflict: 'id' })
    }
  }

  // 2. 抓取所有预设订阅源的文章
  for (const feedInfo of DEFAULT_FEEDS) {
    try {
      // 获取该订阅源最近一次抓取的文章时间
      const { data: latestArticle } = await supabase
        .from('articles')
        .select('published_at')
        .eq('feed_id', feedInfo.id)
        .order('published_at', { ascending: false })
        .limit(1)
        .single()
      
      const lastSyncTime = latestArticle?.published_at ? new Date(latestArticle.published_at).getTime() : 0
      
      // 使用代理获取 RSS
      let rssText: string
      try {
        rssText = await fetchRSSWithProxy(feedInfo.url)
      } catch (e) {
        console.error(`Failed to fetch ${feedInfo.name}:`, e)
        errors.push(`${feedInfo.name}: ${e}`)
        continue
      }
      
      const rss = await parser.parseString(rssText)
      
      if (!rss.items) continue
      
      let feedNewCount = 0
      for (const item of rss.items) {
        const itemTime = item.pubDate ? new Date(item.pubDate).getTime() : 0
        
        // 只抓取最近一次抓取之后的新内容
        if (itemTime <= lastSyncTime) continue
        
        const url = item.link || `feed-${item.guid || Math.random()}`
        
        // 检查是否已存在（不区分用户，所有用户共享）
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

          // 插入文章（不关联特定用户，公共缓存）
          await supabase.from('articles').insert({
            feed_id: feedInfo.id,
            user_id: null, // 公共文章，不属于任何用户
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
      console.log(`Feed ${feedInfo.name}: ${feedNewCount} new articles`)
    } catch (feedError) {
      console.error(`Error fetching ${feedInfo.name}:`, feedError)
      errors.push(`${feedInfo.name}: ${feedError}`)
    }
  }

  return Response.json({ 
    success: true, 
    newArticlesCount, 
    feedsProcessed,
    errors: errors.length > 0 ? errors : undefined 
  })
}

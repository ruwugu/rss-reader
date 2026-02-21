import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

  const { articleId } = await request.json()

  // 获取文章
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .eq('user_id', user.id)
    .single()

  if (!article) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  // 如果已经有翻译，直接返回
  if (article.content_zh) {
    return Response.json({ success: true, translated: article.content_zh })
  }

  // 获取原始内容并清理 HTML
  const rawContent = article.content_raw || ''
  const cleanContent = rawContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanContent) {
    return Response.json({ error: 'No content to translate' }, { status: 400 })
  }

  try {
    // 使用免费 MyMemory API 翻译
    // 为了处理长文本，我们分段翻译
    const paragraphs = cleanContent.split('\n\n').filter((p: string) => p.trim())
    const translatedParagraphs: string[] = []

    for (const para of paragraphs) {
      // 每段限制在 500 字符以内（API 限制）
      const truncatedPara = para.slice(0, 500)
      
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncatedPara)}&langpair=en|zh`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.responseStatus === 200 && data.responseData) {
        translatedParagraphs.push(data.responseData.translatedText)
      } else {
        // 如果翻译失败，保留原文
        translatedParagraphs.push(truncatedPara)
      }
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    const translatedText = translatedParagraphs.join('\n\n')
    
    // 保存翻译结果到数据库
    await supabase
      .from('articles')
      .update({ content_zh: translatedText })
      .eq('id', articleId)

    return Response.json({ success: true, translated: translatedText })
  } catch (error) {
    console.error('Translation error:', error)
    return Response.json({ error: 'Translation failed' }, { status: 500 })
  }
}

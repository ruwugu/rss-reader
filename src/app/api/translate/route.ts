import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY
const MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1'

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

  if (article.content_zh) {
    return Response.json({ success: true, translated: article.content_zh })
  }

  if (!MINIMAX_API_KEY) {
    return Response.json({ error: 'Translation API not configured' }, { status: 500 })
  }

  try {
    // 使用 MiniMax 进行翻译
    const response = await fetch(`${MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的AI技术论文翻译助手。请将以下英文内容翻译成中文，要求：1. 保持专业术语的准确性 2. 理解上下文，保持连贯性 3. 翻译结果要自然流畅，符合中文阅读习惯 4. 保留原文中的代码、链接等格式 5. 直接输出翻译结果，不要有任何前缀或解释'
          },
          {
            role: 'user',
            content: article.content_raw || ''
          }
        ]
      })
    })

    const data = await response.json()
    
    if (data.choices && data.choices[0]) {
      const translatedText = data.choices[0].message.content
      
      // 保存翻译结果
      await supabase
        .from('articles')
        .update({ content_zh: translatedText })
        .eq('id', articleId)

      return Response.json({ success: true, translated: translatedText })
    } else {
      return Response.json({ error: 'Translation failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('Translation error:', error)
    return Response.json({ error: 'Translation failed' }, { status: 500 })
  }
}

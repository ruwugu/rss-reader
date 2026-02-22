import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { url } = await request.json()
  
  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RSSReader/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      }
    })
    
    clearTimeout(timeout)
    
    const text = await response.text()
    
    return Response.json({ 
      success: true, 
      data: text,
      status: response.status
    })
  } catch (error) {
    console.error('Proxy fetch error:', error)
    return Response.json({ 
      error: String(error),
      success: false 
    }, { status: 500 })
  }
}

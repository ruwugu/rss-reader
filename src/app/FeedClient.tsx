'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Star, Check, LogOut, Plus, RefreshCw } from 'lucide-react'

interface Feed {
  id: string
  name: string
  twitter_handle: string
  avatar_url: string
  rss_url?: string
}

// Twitter RSS 订阅源 (使用 rsshub.pseudoyu.com)
const TWITTER_RSSHUB = 'https://rsshub.pseudoyu.com/twitter'

const TWITTER_FEEDS = [
  { id: 'twitter-karpathy', name: 'Andrej Karpathy', twitter_handle: 'karpathy', url: `${TWITTER_RSSHUB}/user/karpathy`, avatar: 'https://pbs.twimg.com/profile_images/1296667294148382721/9Pr6XrPB.jpg', description: 'AI researcher' },
  { id: 'twitter-sama', name: 'Sam Altman', twitter_handle: 'sama', url: `${TWITTER_RSSHUB}/user/sama`, avatar: 'https://pbs.twimg.com/profile_images/1581800860582416384/5U7oZLJ3.jpg', description: 'OpenAI CEO' },
  { id: 'twitter-sagacity', name: '池建强', twitter_handle: 'sagacity', url: `${TWITTER_RSSHUB}/user/sagacity`, avatar: 'https://pbs.twimg.com/profile_images/1772866881564876800/_N0S6Sda.jpg', description: 'AI researcher' },
]

// 预定义订阅源
const AVAILABLE_FEEDS = [
  ...TWITTER_FEEDS
]

function decodeHtml(html: string) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()
}

interface Article {
  id: string
  title: string
  content_raw: string
  content_zh: string
  url: string
  published_at: string
  is_read: boolean
  is_favorite: boolean
  feed: Feed
}

export default function FeedClient({ userId }: { userId: string }) {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorite'>('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [selectedArticleLocal, setSelectedArticleLocal] = useState<{is_read: boolean, is_favorite: boolean, content_zh?: string} | null>(null)
  const [translatingId, setTranslatingId] = useState<string | null>(null)
  const [showManageFeed, setShowManageFeed] = useState(false)
  const [togglingFeed, setTogglingFeed] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [filter])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: feedsData } = await supabase.from('feeds').select('*').eq('user_id', userId).eq('is_active', true)
      if (feedsData) setFeeds(feedsData)
      
      // 只获取用户开启的订阅源的文章
      const activeFeedIds = feedsData?.map(f => f.id) || []
      if (activeFeedIds.length === 0) {
        setArticles([])
        return
      }
      
      let query = supabase.from('articles').select('*, feed:feeds(*)').eq('user_id', userId).in('feed_id', activeFeedIds).order('published_at', { ascending: false }).limit(50)
      if (filter === 'unread') query = query.eq('is_read', false)
      else if (filter === 'favorite') query = query.eq('is_favorite', true)
      
      const { data: articlesData } = await query
      if (articlesData) setArticles(articlesData as any)
    } catch (err) {
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setLoading(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)
      
      const res = await fetch('/api/sync', { 
        method: 'POST',
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      const result = await res.json()
      console.log('Sync result:', result)
      
      router.refresh()
      await loadData()
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncing(false)
      setLoading(false)
    }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  const toggleRead = async (article: Article) => {
    setSelectedArticleLocal(prev => prev ? { ...prev, is_read: !prev.is_read } : null)
    await supabase.from('articles').update({ is_read: !article.is_read }).eq('id', article.id)
    loadData()
  }

  const toggleFavorite = async (article: Article) => {
    setSelectedArticleLocal(prev => prev ? { ...prev, is_favorite: !prev.is_favorite } : null)
    await supabase.from('articles').update({ is_favorite: !article.is_favorite }).eq('id', article.id)
    loadData()
  }

  const translateArticle = async (articleId: string) => {
    setTranslatingId(articleId)
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId }) })
      const result = await res.json()
      if (result.translated) {
        setSelectedArticle(prev => prev ? { ...prev, content_zh: result.translated } : null)
        setSelectedArticleLocal(prev => prev ? { ...prev, content_zh: result.translated } : null)
      }
    } finally { setTranslatingId(null) }
  }

  const handleOpenArticle = (article: Article) => {
    setSelectedArticle(article)
    setSelectedArticleLocal({ is_read: article.is_read, is_favorite: article.is_favorite, content_zh: article.content_zh })
    if (!article.content_zh) translateArticle(article.id)
  }

  const toggleFeed = async (feed: typeof AVAILABLE_FEEDS[0]) => {
    setTogglingFeed(feed.id)
    try {
      const existing = feeds.find(f => f.rss_url === feed.url)
      let error = null
      if (existing) {
        const result = await supabase.from('feeds').update({ is_active: false }).eq('id', existing.id)
        error = result.error
      } else {
        const result = await supabase.from('feeds').insert({ user_id: userId, name: feed.name, twitter_handle: feed.twitter_handle, rss_url: feed.url, avatar_url: feed.avatar, is_active: true })
        error = result.error
      }
      if (error) {
        console.error('Supabase error:', error)
        alert('操作失败: ' + error.message)
      } else {
        await loadData()
      }
    } catch (err) {
      console.error('Toggle feed error:', err)
    } finally {
      setTogglingFeed(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">AI RSS</h1>
            <span className="text-xs text-gray-900">02220030</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowManageFeed(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-900"><Plus size={20} /></button>
            <button onClick={handleSync} disabled={syncing} className="p-2 hover:bg-gray-100 rounded-lg text-gray-900">
              <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleSignOut} className="p-2 hover:bg-gray-100 rounded-lg text-gray-900"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-2 flex gap-2">
        {(['all', 'unread', 'favorite'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'}`}>{f === 'all' ? '全部' : f === 'unread' ? '未读' : '收藏'}</button>
        ))}
      </div>

      <main className="max-w-2xl mx-auto px-4 py-2 space-y-2">
        {loading ? <div className="text-center py-8 text-gray-900">加载中...</div> : articles.length === 0 ? <div className="text-center py-8 text-gray-900">暂无内容</div> : articles.map(article => (
          <div key={article.id} onClick={() => handleOpenArticle(article)} className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition ${!article.is_read ? 'border-l-4 border-blue-500' : ''}`}>
            <div className="flex items-start gap-3">
              <img src={article.feed?.avatar_url || ''} alt={article.feed?.name} className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{article.feed?.name}</span>
                  <span className="text-gray-900 text-xs">{new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <h3 className="font-medium text-gray-900 line-clamp-2">{decodeHtml(article.title)}</h3>
                <p className="text-gray-900 text-sm mt-1 line-clamp-2">{decodeHtml(article.content_raw || '').slice(0, 150)}...</p>
              </div>
            </div>
          </div>
        ))}
      </main>

      {showManageFeed && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen max-w-2xl mx-auto bg-white">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">管理订阅</h2>
              <button onClick={() => setShowManageFeed(false)} className="p-1 text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="p-4 space-y-2">
              {AVAILABLE_FEEDS.map(feed => {
                const isOn = feeds.some(f => f.rss_url === feed.url)
                return (
                  <div key={feed.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <img src={feed.avatar} alt={feed.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{feed.name}</h3>
                      <p className="text-gray-600 text-xs">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">X</span>
                        <span className="ml-1">@{feed.twitter_handle}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => toggleFeed(feed)} 
                      disabled={togglingFeed === feed.id}
                      className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors flex-shrink-0 ${isOn ? 'bg-green-500' : 'bg-gray-300'} ${togglingFeed === feed.id ? 'opacity-50' : ''}`}>
                      <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen max-w-2xl mx-auto bg-white">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <button onClick={() => setSelectedArticle(null)} className="text-blue-600">← 返回</button>
              <div className="flex gap-2">
                {translatingId === selectedArticle?.id ? (<div className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg">⟳ 翻译中</div>) : !(selectedArticleLocal?.content_zh || selectedArticle.content_zh) && (<button onClick={() => translateArticle(selectedArticle.id)} className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg">翻译</button>)}
                <button onClick={() => toggleRead(selectedArticle)} className="p-2 hover:bg-gray-100 rounded-lg"><Check size={20} className={(selectedArticleLocal?.is_read ?? selectedArticle.is_read) ? 'text-green-600' : 'text-gray-600'} /></button>
                <button onClick={() => toggleFavorite(selectedArticle)} className="p-2 hover:bg-gray-100 rounded-lg"><Star size={20} className={(selectedArticleLocal?.is_favorite ?? selectedArticle.is_favorite) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'} /></button>
              </div>
            </div>
            <article className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <img src={selectedArticle.feed?.avatar_url || ''} alt={selectedArticle.feed?.name} className="w-12 h-12 rounded-full" />
                <div><h2 className="font-bold text-gray-900">{selectedArticle.feed?.name}</h2><p className="text-gray-900 text-sm">@{selectedArticle.feed?.twitter_handle} · {new Date(selectedArticle.published_at).toLocaleString('zh-CN')}</p></div>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-6">{decodeHtml(selectedArticle.title)}</h1>
              <div className="space-y-6">
                {selectedArticle.content_raw ? (
                  <div className="space-y-4">
                    {decodeHtml(selectedArticle.content_raw).split('\n\n').map((para, i) => (
                      <div key={i}>
                        <p className="text-gray-900 leading-relaxed">{para}</p>
                        {(selectedArticleLocal?.content_zh || selectedArticle.content_zh) && decodeHtml(selectedArticleLocal?.content_zh || selectedArticle.content_zh || '').split('\n\n')[i] && (<p className="text-gray-900 leading-relaxed mt-2 italic">{decodeHtml(selectedArticleLocal?.content_zh || selectedArticle.content_zh || '').split('\n\n')[i]}</p>)}
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-gray-900">暂无内容</p>)}
              </div>
              <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer" className="block mt-6 text-blue-600 hover:underline">查看原文 →</a>
            </article>
          </div>
        </div>
      )}
    </div>
  )
}

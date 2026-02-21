'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BookOpen, Star, Check, LogOut, Plus, RefreshCw, Trash2 } from 'lucide-react'

interface Feed {
  id: string
  name: string
  twitter_handle: string
  avatar_url: string
}

// 解码 HTML 实体
function decodeHtml(html: string) {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+/g, (match) => {
      return String.fromCharCode(parseInt(match.replace('&#', '')))
    })
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorite' | 'following'>('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [selectedArticleLocal, setSelectedArticleLocal] = useState<{is_read: boolean, is_favorite: boolean} | null>(null)
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState({ name: '', twitter_handle: '', rss_url: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    setLoading(true)
    
    // Load feeds
    const { data: feedsData } = await supabase
      .from('feeds')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (feedsData) setFeeds(feedsData)

    // Load articles
    let query = supabase
      .from('articles')
      .select('*, feed:feeds(*)')
      .eq('user_id', userId)
      .order('published_at', { ascending: false })
      .limit(50)

    if (filter === 'unread') {
      query = query.eq('is_read', false)
    } else if (filter === 'favorite') {
      query = query.eq('is_favorite', true)
    }

    const { data: articlesData } = await query
    if (articlesData) setArticles(articlesData as any)

    setLoading(false)
  }

  const handleSync = async () => {
    setSyncing(true)
    setLoading(true)  // 显示加载状态
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const result = await res.json()
      console.log('Sync result:', result)
      // 刷新后重新加载数据
      await loadData()
    } catch (error) {
      console.error('Sync error:', error)
    }
    setSyncing(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleRead = async (article: Article) => {
    // 立即更新本地状态
    setSelectedArticleLocal(prev => prev ? { ...prev, is_read: !prev.is_read } : null)
    // 异步更新服务器
    await supabase
      .from('articles')
      .update({ is_read: !article.is_read })
      .eq('id', article.id)
    loadData()
  }

  const toggleFavorite = async (article: Article) => {
    // 立即更新本地状态
    setSelectedArticleLocal(prev => prev ? { ...prev, is_favorite: !prev.is_favorite } : null)
    // 异步更新服务器
    await supabase
      .from('articles')
      .update({ is_favorite: !article.is_favorite })
      .eq('id', article.id)
    loadData()
  }

  const translateArticle = async (articleId: string) => {
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId })
      })
      const result = await res.json()
      if (result.translated) {
        // 更新当前选中的文章
        if (selectedArticle && selectedArticle.id === articleId) {
          setSelectedArticle({ ...selectedArticle, content_zh: result.translated })
        }
        // 刷新列表
        loadData()
      }
    } catch (error) {
      console.error('Translate error:', error)
    }
  }

  const addFeed = async () => {
    if (!newFeed.name || !newFeed.rss_url) return
    
    await supabase.from('feeds').insert({
      user_id: userId,
      name: newFeed.name,
      twitter_handle: newFeed.twitter_handle || newFeed.name.toLowerCase().replace(/\s+/g, '_'),
      rss_url: newFeed.rss_url,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(newFeed.name)}&background=random`
    })

    setShowAddFeed(false)
    setNewFeed({ name: '', twitter_handle: '', rss_url: '' })
    loadData()
  }

  const deleteFeed = async (feedId: string) => {
    await supabase.from('feeds').delete().eq('id', feedId)
    loadData()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">AI RSS</h1>
            <span className="text-xs text-gray-900">02210847</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddFeed(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-900"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-900"
            >
              <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-900"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="max-w-2xl mx-auto px-4 py-2 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-full text-sm ${
            filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
          }`}
        >
          未读
        </button>
        <button
          onClick={() => setFilter('favorite')}
          className={`px-4 py-1.5 rounded-full text-sm ${
            filter === 'favorite' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
          }`}
        >
          收藏
        </button>
        <button
          onClick={() => setFilter('following')}
          className={`px-4 py-1.5 rounded-full text-sm ${
            filter === 'following' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
          }`}
        >
          关注
        </button>
      </div>

      {filter === 'following' ? (
        <main className="max-w-2xl mx-auto px-4 py-2">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-bold text-lg mb-4">已关注的订阅源</h2>
            {feeds.length === 0 ? (
              <p className="text-gray-900 text-center py-8">暂无订阅</p>
            ) : (
              <div className="space-y-3">
                {feeds.map((feed) => (
                  <div key={feed.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={feed.avatar_url || ''}
                      alt={feed.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{feed.name}</h3>
                      <p className="text-gray-900 text-sm">@{feed.twitter_handle}</p>
                    </div>
                    <button
                      onClick={() => deleteFeed(feed.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="max-w-2xl mx-auto px-4 py-2 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-900">加载中...</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-gray-900">暂无内容</div>
          ) : (
            articles.map((article) => (
              <div
                key={article.id}
                onClick={() => {
                  setSelectedArticle(article)
                  setSelectedArticleLocal({ is_read: article.is_read, is_favorite: article.is_favorite })
                }}
                className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition ${
                  !article.is_read ? 'border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={article.feed?.avatar_url || ''}
                    alt={article.feed?.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{article.feed?.name}</span>
                      <span className="text-gray-900 text-xs">
                        {new Date(article.published_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 line-clamp-2">{decodeHtml(article.title)}</h3>
                    <p className="text-gray-900 text-sm mt-1 line-clamp-2">
                      {decodeHtml(article.content_raw || '').slice(0, 150)}...
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>
      )}

      {/* Add Feed Modal */}
      {showAddFeed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">添加订阅</h2>
            <input
              placeholder="名称（如：Hacker News）"
              value={newFeed.name}
              onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 mb-3 placeholder:text-gray-500"
            />
            <input
              placeholder="RSS 地址（如：https://hnrss.org/best）"
              value={newFeed.rss_url}
              onChange={(e) => setNewFeed({ ...newFeed, rss_url: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 mb-3 placeholder:text-gray-500"
            />
            <input
              placeholder="Twitter handle（可选，不填则用名称）"
              value={newFeed.twitter_handle}
              onChange={(e) => setNewFeed({ ...newFeed, twitter_handle: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 mb-4 placeholder:text-gray-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddFeed(false)}
                className="flex-1 py-2 border rounded-lg"
              >
                取消
              </button>
              <button
                onClick={addFeed}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen max-w-2xl mx-auto bg-white">
            {/* Article Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-blue-600"
              >
                ← 返回
              </button>
              <div className="flex gap-2">
                {!selectedArticle.content_zh && (
                  <button
                    onClick={() => translateArticle(selectedArticle.id)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg"
                  >
                    翻译
                  </button>
                )}
                <button
                  onClick={() => toggleRead(selectedArticle!)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Check size={20} className={(selectedArticleLocal?.is_read ?? selectedArticle?.is_read) ? 'text-green-600' : 'text-gray-600'} />
                </button>
                <button
                  onClick={() => toggleFavorite(selectedArticle!)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Star size={20} className={(selectedArticleLocal?.is_favorite ?? selectedArticle?.is_favorite) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'} />
                </button>
              </div>
            </div>

            {/* Article Content */}
            <article className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={selectedArticle.feed?.avatar_url || ''}
                  alt={selectedArticle.feed?.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h2 className="font-bold text-gray-900">{selectedArticle.feed?.name}</h2>
                  <p className="text-gray-900 text-sm">
                    @{selectedArticle.feed?.twitter_handle} · {new Date(selectedArticle.published_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-6">{decodeHtml(selectedArticle.title)}</h1>

              {/* Bilingual Content */}
              <div className="space-y-6">
                {selectedArticle.content_raw ? (
                  <>
                    <div className="space-y-4">
                      {decodeHtml(selectedArticle.content_raw).split('\n\n').map((para: string, i: number) => (
                        <div key={i}>
                          <p className="text-gray-900 leading-relaxed">{para}</p>
                          {selectedArticle.content_zh && decodeHtml(selectedArticle.content_zh).split('\n\n')[i] && (
                            <p className="text-gray-900 leading-relaxed mt-2 italic">
                              {decodeHtml(selectedArticle.content_zh).split('\n\n')[i]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-900">暂无内容</p>
                )}
              </div>

              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-6 text-blue-600 hover:underline"
              >
                查看原文 →
              </a>
            </article>
          </div>
        </div>
      )}
    </div>
  )
}

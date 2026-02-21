import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 预定义的 AI 相关 RSS 订阅源
export const AVAILABLE_FEEDS = [
  {
    id: 'hn-best',
    name: 'Hacker News Best',
    twitter_handle: 'hn_best',
    url: 'https://hnrss.org/best',
    avatar: 'https://news.ycombinator.com/y18.svg',
    description: 'Hacker News 最佳内容'
  },
  {
    id: 'hn-new',
    name: 'Hacker News New',
    twitter_handle: 'hn_new',
    url: 'https://hnrss.org/newest',
    avatar: 'https://news.ycombinator.com/y18.svg',
    description: 'Hacker News 最新内容'
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    twitter_handle: 'techcrunch',
    url: 'https://techcrunch.com/feed/',
    avatar: 'https://techcrunch.com/wp-content/uploads/2015/02/cropped-favicon-gradient.png',
    description: '科技新闻'
  },
  {
    id: 'mit-tech',
    name: 'MIT Technology Review',
    twitter_handle: 'mittech',
    url: 'https://www.technologyreview.com/feed/',
    avatar: 'https://www.technologyreview.com/favicon.ico',
    description: 'MIT 科技评论'
  },
  {
    id: 'wired',
    name: 'Wired',
    twitter_handle: 'wired',
    url: 'https://www.wired.com/feed/rss',
    avatar: 'https://www.wired.com/favicon.ico',
    description: 'Wired 科技'
  },
  {
    id: 'openai-blog',
    name: 'OpenAI Blog',
    twitter_handle: 'openai',
    url: 'https://openai.com/blog/rss.xml',
    avatar: 'https://openai.com/favicon.ico',
    description: 'OpenAI 官方博客'
  },
  {
    id: 'deeplearning-ai',
    name: 'DeepLearning.AI',
    twitter_handle: 'deeplearningai',
    url: 'https://www.deeplearning.ai/feed/',
    avatar: 'https://www.deeplearning.ai/favicon.ico',
    description: 'AI 深度学习'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    twitter_handle: 'anthropic',
    url: 'https://www.anthropic.com/rss/blog',
    avatar: 'https://www.anthropic.com/favicon.ico',
    description: 'Anthropic 官方博客'
  },
  {
    id: 'google-ai',
    name: 'Google AI',
    twitter_handle: 'googleai',
    url: 'https://blog.google/technology/ai/rss',
    avatar: 'https://www.google.com/favicon.ico',
    description: 'Google AI 博客'
  },
  {
    id: 'microsoft-ai',
    name: 'Microsoft AI',
    twitter_handle: 'microsoftai',
    url: 'https://blogs.microsoft.com/ai/feed',
    avatar: 'https://blogs.microsoft.com/favicon.ico',
    description: 'Microsoft AI 博客'
  }
]

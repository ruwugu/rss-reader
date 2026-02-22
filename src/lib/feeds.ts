import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Twitter RSS 订阅源 (使用 rsshub.pseudoyu.com)
const TWITTER_RSSHUB = 'https://rsshub.pseudoyu.com/twitter'

export const TWITTER_FEEDS = [
  {
    id: 'twitter-karpathy',
    name: 'Andrej Karpathy',
    twitter_handle: 'karpathy',
    url: `${TWITTER_RSSHUB}/user/karpathy`,
    avatar: 'https://pbs.twimg.com/profile_images/1296667294148382721/9Pr6XrPB.jpg',
    description: 'AI researcher, former Tesla/OpenAI'
  },
  {
    id: 'twitter-sama',
    name: 'Sam Altman',
    twitter_handle: 'sama',
    url: `${TWITTER_RSSHUB}/user/sama`,
    avatar: 'https://pbs.twimg.com/profile_images/1904933748015255552/k43GMz63.jpg',
    description: 'OpenAI CEO'
  },
  {
    id: 'twitter-sagacity',
    name: '池建强',
    twitter_handle: 'sagacity',
    url: `${TWITTER_RSSHUB}/user/sagacity`,
    avatar: 'https://pbs.twimg.com/profile_images/837956718/_____2010-04-20___10.16.37_400x400.png',
    description: '墨问西东创始人'
  }
]

// 预定义的订阅源
export const AVAILABLE_FEEDS = TWITTER_FEEDS

// 合并所有订阅源
export const ALL_FEEDS = AVAILABLE_FEEDS

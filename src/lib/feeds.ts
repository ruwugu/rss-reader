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
    id: 'twitter-elonmusk',
    name: 'Elon Musk',
    twitter_handle: 'elonmusk',
    url: `${TWITTER_RSSHUB}/user/elonmusk`,
    avatar: 'https://pbs.twimg.com/profile_images/1590289135619338240-p8lP4_r_.jpg',
    description: 'Tesla, SpaceX, X'
  },
  {
    id: 'twitter-sama',
    name: 'Sam Altman',
    twitter_handle: 'sama',
    url: `${TWITTER_RSSHUB}/user/sama`,
    avatar: 'https://pbs.twimg.com/profile_images/1581800860582416384/5U7oZLJ3.jpg',
    description: 'OpenAI CEO'
  },
  {
    id: 'twitter-demis',
    name: 'Demis Hassabis',
    twitter_handle: 'demishassabis',
    url: `${TWITTER_RSSHUB}/user/demishassabis`,
    avatar: 'https://pbs.twimg.com/profile_images/1553175885/demis_avatar_200x200.jpg',
    description: 'Google DeepMind CEO'
  },
  {
    id: 'twitter-jeffdean',
    name: 'Jeff Dean',
    twitter_handle: 'JeffDean',
    url: `${TWITTER_RSSHUB}/user/JeffDean`,
    avatar: 'https://pbs.twimg.com/profile_images/1221600828702249473/2d_Tx4Ag.jpg',
    description: 'Google AI'
  },
  {
    id: 'hwchase17',
    name: 'Chase',
    twitter_handle: 'hwchase17',
    url: `${TWITTER_RSSHUB}/user/hwchase17`,
    avatar: 'https://pbs.twimg.com/profile_images/1777620652245245952/lN-UrS7-.jpg',
    description: 'AI researcher, LangChain'
  },
  {
    id: 'earlyexit',
    name: 'Jiayi',
    twitter_handle: 'earlyexit',
    url: `${TWITTER_RSSHUB}/user/earlyexit`,
    avatar: 'https://pbs.twimg.com/profile_images/1695567553419460608/lz8m2OQd.jpg',
    description: 'AI researcher'
  },
  {
    id: 'soumithchintala',
    name: 'Soumith Chintala',
    twitter_handle: 'soumithchintala',
    url: `${TWITTER_RSSHUB}/user/soumithchintala`,
    avatar: 'https://pbs.twimg.com/profile_images/1163467487/soumith_200x200.jpg',
    description: 'PyTorch'
  },
  {
    id: 'goodfellow_ian',
    name: 'Ian Goodfellow',
    twitter_handle: 'goodfellow_ian',
    url: `${TWITTER_RSSHUB}/user/goodfellow_ian`,
    avatar: 'https://pbs.twimg.com/profile_images/764782156692EREse/3j0Mf2k_.jpg',
    description: 'GANs creator'
  },
  {
    id: 'ylecun',
    name: 'Yann LeCun',
    twitter_handle: 'ylecun',
    url: `${TWITTER_RSSHUB}/user/ylecun',
    avatar: 'https://pbs.twimg.com/profile_images/875446874504925184/I7hHFAk_.jpg',
    description: 'NYU, Meta AI'
  }
]

// 合并所有订阅源
export const ALL_FEEDS = [...AVAILABLE_FEEDS, ...TWITTER_FEEDS]

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

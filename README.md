# AI RSS Reader

AI 资讯 RSS 阅读器，订阅 Twitter 达人，中英文对照显示。

## 功能

- 📱 移动端适配
- 🔐 用户登录/注册
- 📊 订阅管理（预设 Karpathy、Ilya）
- 📖 阅读列表（全部/未读/收藏）
- 🌐 中英文段落对照显示
- ⭐ 收藏功能

## 快速部署到 Vercel

### 1. 推送代码到 GitHub

```bash
cd ~/.openclaw/workspace/projects/ai-rss-reader
git init
git add .
git commit -m "AI RSS Reader v1"
# 创建 GitHub 仓库并推送
```

### 2. 部署到 Vercel

1. 访问 https://vercel.com
2. 用 GitHub 登录
3. 点击 "New Project"
4. 选择刚才推送的仓库
5. 在 Environment Variables 添加：
   - `NEXT_PUBLIC_SUPABASE_URL` = 你的 Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 你的 Anon Key
6. 点击 Deploy

### 3. 配置 Supabase

在 Supabase 后台：
1. Settings → Authentication → URL Configuration
2. 添加你的 Vercel 域名到 "Redirect URLs"
   - 例如: `https://your-project.vercel.app/auth/v1/callback`

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

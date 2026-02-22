# RSS Reader 开发工作规范

## 1. 版本号规则

- **格式**: `MMDDHHmm`（月日时分）
- **示例**: `02221503` 表示 2月22日 15:03
- **位置**: 首页 Logo 旁边
- **更新时机**: 每次发布新版本时必须更新

## 2. 开发流程

### 2.1 本地开发
```bash
# 1. 克隆项目
git clone https://github.com/ruwugu/rss-reader.git
cd rss-reader

# 2. 创建功能分支
git checkout -b feat/功能名称
# 或
git checkout -b fix/问题描述

# 3. 开发完成后提交
git add -A
git commit -m "feat: 添加新功能"
```

### 2.2 发布流程
```bash
# 1. 合并到主分支
git checkout main
git merge feat/功能名称

# 2. 推送代码（自动触发 Vercel 部署）
git push origin main
```

## 3. 代码规范

### 3.1 版本号更新
每次发布前，在 `FeedClient.tsx` 中更新版本号：
```tsx
// 找到这行并更新
<span className="text-xs text-gray-500">02221503</span>
```

### 3.2 提交信息格式
```
feat: 新功能名称
fix: 修复问题描述
chore: 日常维护
refactor: 代码重构
```

### 3.3 环境变量
- `.env.local` - 本地开发
- Vercel 环境变量 - 生产环境

## 4. 功能新增规范

### 4.1 新增订阅源
1. 在 `src/lib/feeds.ts` 的 `DEFAULT_FEEDS` 数组中添加
2. 在 `src/app/FeedClient.tsx` 的 `TWITTER_FEEDS` 数组中添加（保持一致）
3. 需要提供：id, name, twitter_handle, url, avatar

### 4.2 新增 API
1. 在 `src/app/api/` 下创建 `route.ts`
2. 确保导出 `POST` 或 `GET` 函数
3. 添加必要的错误处理

## 5. 测试检查清单

发布前确认：
- [ ] 本地 `npm run build` 编译通过
- [ ] 版本号已更新
- [ ] 新功能已测试
- [ ] 没有 console 错误

## 6. 常见命令

```bash
# 本地开发
npm run dev

# 构建测试
npm run build

# 代码检查
npm run lint
```

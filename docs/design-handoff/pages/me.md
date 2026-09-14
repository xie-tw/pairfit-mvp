# Page · Me(我的 Tab)

> 路由:`/me` · 权限:公开(已登录显示账号卡) · 当前实现:`src/pages/Me.tsx`(PF-1 + PF-2 已搭)

## 目的

账号 / 主题 / 语言 / 订阅 / 设置 / 帮助 的入口页。

## 布局

```
┌──────────────────────────────┐
│  Me                          │
│  Profile, settings and       │
│  subscription.               │
│                              │
│  ╭──────────────────────────╮│ ← 账号卡(已登录 / 未登录态不同)
│  │ [avatar]  Mei            │
│  │           mei@x.com  Free│
│  │                          │
│  │                      ›  ││
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│
│  │ 🌙 Theme                 │
│  │ [Light|Dark|System]      ││
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│
│  │ 🌐 Language              │
│  │ [English|中文]           │
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│
│  │ 👑 Subscription    [Pro] ││
│  │ ⚙️ Settings              ││
│  │ ✨ What's new            │
│  │ 🌍 Help & feedback       │
│  ╰──────────────────────────╯│
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Me"/>` |
| 账号卡 | `<Card raised>` 含 avatar + 名字 + email + 等级 chip + chevron |
| 主题切换 | `<Card>` 含 `<SegmentedControl>` 3 选 |
| 语言切换 | `<Card>` 含 `<SegmentedControl>` 2 选 |
| 设置列表 | `<Card noPadding>` 含 4 行 `Row` |

## 账号卡两种状态

### 已登录

```tsx
<Link to="/profile">
  <Card raised className="pf-press hover:shadow-md">
    <div className="flex items-center gap-4">
      <Avatar emoji={user.avatar} initial={initial} size="lg" />
      <div className="flex-1 min-w-0">
        <h2>{user.displayName}</h2>
        <p>{user.email}</p>
      </div>
      <Badge variant="gradient">{isPro ? 'Pro' : 'Free'}</Badge>
      <ChevronRight />
    </div>
  </Card>
</Link>
```

### 未登录

```tsx
<Card raised>
  <div className="flex items-center gap-4">
    <Avatar initial="?" />
    <div>
      <h2>You're signed out</h2>
      <p>Sign in to sync your data across devices.</p>
    </div>
    <Link to="/login" className="rounded-full bg-brand-500 px-3 py-1.5 text-xs text-white">Sign in</Link>
  </div>
</Card>
```

## 交互

| 操作 | 行为 |
|---|---|
| 点账号卡 | 跳 /profile |
| 主题切换 | 实时切换 light / dark / system |
| 语言切换 | 实时切换(同步到 i18next) |
| 点 Subscription | 跳 /me/subscription |
| 点 Settings | 跳 /me/settings |
| 点 Help | 跳 /me/help |

## i18n

| key |
|---|
| `me.{title,subtitle,profile,settings,subscription,freeTier,signedOutTitle,signedOutBody,whatsNew,help}` |
| `common.{theme,light,dark,system,language}` |

## 已知偏差 / 改进点

- ✅ PF-1 + PF-2 已搭基础,与本规格一致。
- 改进:Coding Agent 可加 Pro 解锁后的"Pro benefits"行(PF-9)。
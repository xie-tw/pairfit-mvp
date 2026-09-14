# Page · Profile

> 路由:`/me/profile` · 权限:RequireAuth · 当前实现:`src/pages/Profile.tsx`(PF-2 已搭)

## 目的

用户编辑自己的资料(头像 / 昵称 / 单位 / 语言)+ 退出登录。

## 布局

```
┌──────────────────────────────┐
│  Profile                     │
│  Avatar, units, language,    │
│  sign out.                   │
│                              │
│  ╭──────────────────────────╮│ ← 账号卡(只读)
│  │ [avatar]  Mei            │
│  │           mei@x.com      │
│  │                  Free    │
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│ ← 头像选择
│  │ AVATAR                   │
│  │ [🤓] [🦊] [🐶] [🐱]...   │
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│ ← 昵称编辑
│  │ NICKNAME         [Saved] │
│  │ [input: Mei         ]   │
│  │ mei@x.com                │
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│ ← 单位切换
│  │ ⚖️ WEIGHT UNIT           │
│  │ [Kilograms|Pounds]       │
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│ ← 语言切换
│  │ LANGUAGE                 │
│  │ [English|中文]           │
│  ╰──────────────────────────╯│
│                              │
│  ╭──────────────────────────╮│ ← 退出登录
│  │     Sign out             ││
│  ╰──────────────────────────╯│
│  Sign out clears your        │
│  session on this device.     │
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Profile"/>` |
| 账号卡 | `<Card raised>` avatar + 名字 + email + 等级 chip(只读)|
| 头像选择 | `<Card>` 含 `<AvatarPicker>` |
| 昵称编辑 | `<Card>` 含 `<Input>` + "Saved" 提示 |
| 单位切换 | `<Card>` 含 `<SegmentedControl>` |
| 语言切换 | `<Card>` 含 `<SegmentedControl>` |
| 退出登录 | `<Button variant="danger" size="lg" block>` |

## 交互

| 操作 | 行为 |
|---|---|
| 选头像 | 立即更新用户记录 |
| 改昵称 | debounce 350ms 自动保存;显示 "Saved" 提示 1.5s |
| 改单位 | 立即生效(影响所有数字显示)|
| 改语言 | 同步到 i18next |
| 退出登录 | signOut() + navigate('/login', replace) |

## 状态

| 状态 | UI |
|---|---|
| **默认** | 全部字段显示当前值 |
| **昵称保存中** | debounce 中,无提示 |
| **昵称已保存** | "Saved" 提示 1.5s |
| **昵称超 32 字符** | "Keep it under 32 characters." |
| **退出登录中** | CTA spinner |

## 异常态

| 状态 | UI |
|---|---|
| **保存失败** | toast error + 恢复输入态 |

## i18n

| key |
|---|
| `profile.{title,subtitle,avatar,displayName,displayNameLabel,unit,unitKg,unitLb,language,saved,signOutHint,signedInAs,userMenu}` |

## 已知偏差 / 改进点

- ✅ PF-2 已搭基础(账号卡 / 头像 / 昵称 / 单位 / 语言 / 退出)。
- 改进:Coding Agent 可加 "Delete account" 行(PF-9 + 合规要求)。
- 改进:密码修改入口(目前无密码修改流程,只在 forgot-password)。
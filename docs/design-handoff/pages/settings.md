# Page · Settings

> 路由:`/me/settings` · 权限:RequireAuth · PF-9 实现

## 目的

数据管理 + 单位 / 语言 + 隐私 + 帮助。

## 布局

```
┌──────────────────────────────┐
│  ← Settings                  │
│  Units, language, data and   │
│  privacy.                    │
│                              │
│  PREFERENCES                 │
│  ⚖️ Weight unit              │
│     Kilograms (kg)      ›    │
│                              │
│  🌐 Language                 │
│     English             ›    │
│                              │
│  ─────────────────────       │
│  DATA                        │
│  📤 Export my data           │ ← download JSON
│  🗑️  Clear all data          │ ← 危险,二次确认
│                              │
│  ─────────────────────       │
│  PRIVACY                     │
│  🔒 Data is local-only       │
│     Learn more                │
│                              │
│  ─────────────────────       │
│  ABOUT                      │
│  ℹ️  Version                 │
│  📜 Privacy policy           │
│  📄 Terms of service          │
│  💌 Help & feedback          │
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Settings"/>` |
| 分组标题 | `<h2 className="pf-section-title">PREFERENCES</h2>` |
| 设置项 | `<Row icon=... title=... trailing={<ChevronRight />}>`,点击跳子页或弹 BottomSheet |
| 危险项 | 红色文字 + 单独分组 |

## 交互

| 操作 | 行为 |
|---|---|
| Weight unit | 跳 BottomSheet 选 kg / lb |
| Language | 跳 BottomSheet 选 en / zh |
| Export | 触发下载 `pairfit-export-{timestamp}.json`,含所有用户记录 + 关系 + Coins |
| Clear all data | Modal 二次确认 `dismissible: false`,输入 "DELETE" 确认 + 1 秒可撤销 |
| Version | 显示 "v0.1.0 (MVP)" |

## 状态

| 状态 | UI |
|---|---|
| **默认** | 全部设置项可点 |
| **导出中** | Row 显示 spinner + "Exporting..." |
| **导出失败** | toast error |
| **清空数据 — 输入 DELETE 中** | 输入框右侧显示已输入字符数 "2 / 6" |
| **清空数据 — 已确认** | 1 秒可撤销 Toast |

## i18n

| key |
|---|
| `settings.{title,subtitle}` |
| `settings.section.{preferences,data,privacy,about}` |
| `settings.row.{weightUnit,language,export,clearData,localOnly,version,privacyPolicy,terms,help}` |
| `settings.export.{preparing,success,filename}` |
| `settings.clearData.{title,body,confirmInput,confirm,success,undo}` |

## A11y

- 危险操作(clear)用 `<button>` 而非链接,SR 知道这是 action。
- "Type DELETE to confirm" 输入框 `aria-describedby="delete-warning"`。
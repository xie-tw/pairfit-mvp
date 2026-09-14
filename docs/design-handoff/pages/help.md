# Page · Help & Feedback

> 路由:`/me/help` · 权限:公开 · PF-9 实现

## 目的

帮助文档 + 反馈入口 + 关于。

## 布局

```
┌──────────────────────────────┐
│  ← Help & feedback           │
│  We're here to help.         │
│                              │
│  FAQ                         │
│  ┌────────────────────────┐  │
│  │ How do I bind my       │  │ ← accordion
│  │ partner?               ›│  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Why is my data local?  ›│  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ How do coins work?     ›│  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ What does Pro include? ›│  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ How do I export       ›│  │
│  │ everything?            │  │
│  └────────────────────────┘  │
│                              │
│  Feedback                    │
│  [Send us a note]            │
│                              │
│  Contact                     │
│  Email: hello@pairfit.app   │
│  Twitter: @pairfit          │
└──────────────────────────────┘
```

## 元素清单

| 元素 | 组件 |
|---|---|
| PageHeader | `<PageHeader title="Help & feedback"/>` |
| FAQ accordion | `<details>` / 自定义 accordion |
| 反馈按钮 | `<Button variant="primary">` 弹 mailto: |
| 联系信息 | 文本 + 链接 |

## 交互

| 操作 | 行为 |
|---|---|
| 展开 FAQ | `<details>` 展开 / 收起 |
| Send us a note | `mailto:hello@pairfit.app?subject=PairFit%20feedback` |
| 点链接 | 新窗口打开 |

## i18n

| key |
|---|
| `help.{title,subtitle}` |
| `help.faq.{bind,localData,coins,pro,export}` |
| `help.feedback.{send}` |
| `help.contact.{email,twitter}` |

## A11y

- FAQ 用 `<details>` + `<summary>`,键盘 + SR 原生支持。
- 邮件链接 `mailto:`,不会触发外部脚本。
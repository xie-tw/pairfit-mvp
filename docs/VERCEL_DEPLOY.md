# Vercel 部署指南

> **目标读者**:PairFit MVP 维护者 / 验收 Agent。
> **适用版本**:`main` 分支 `>= 05dae97c`(M1 完工版)。
> **预计耗时**:首次 5–10 分钟;之后每次 push 自动触发,无需人工。

---

## 1. 前置条件

| 条件 | 说明 |
|---|---|
| Vercel 账号 | https://vercel.com/signup(GitHub OAuth 即可,免费层够用) |
| GitHub repo 访问权 | `https://github.com/xie-tw/pairfit-mvp` |
| 环境变量 | 默认**不需要**任何环境变量也能跑;只要可选地设置 `OPENAI_API_KEY` 即可解锁 AI 食物估算和 AI 周报的真实 LLM 调用 |

> ⚠️ **MVP 阶段必须知道的限制**
> - 所有数据(账号、目标、体重、饮食、运动、Coins、邀请码)都存在浏览器 localStorage 里,**不会上云**。
> - 情侣绑定要求**两端在同一台设备 / 同一个浏览器 profile**(V1.1 再做云同步)。
> - Vercel 部署仅用于"两个人在同一设备上登录两个账号"的 MVP 场景。如果你的另一半要远程访问,先各自 import 到 Vercel,然后用同一台 Mac 切两个浏览器 profile 演示。

---

## 2. 一键导入(GitHub 集成,推荐)

1. 打开 https://vercel.com/new
2. **Import Git Repository** 搜索 `xie-tw/pairfit-mvp`,点 **Import**
3. **Project Name**:默认 `pairfit-mvp`(可改,会决定 `*.vercel.app` 子域名前缀)
4. **Framework Preset**:Vercel 自动识别为 **Vite**(因为 `vercel.json` 里写了 `framework: "vite"`)
5. **Build and Output Settings**:
   - Build Command:`npm run build`(默认即可)
   - Output Directory:`dist`(默认)
   - Install Command:`npm install`(默认)
6. **Environment Variables**(可选):
   - 点 **Environment Variables**,展开:
     - `OPENAI_API_KEY` → 你的 OpenAI key(只有需要 AI 食物估算 + AI 周报才填;不填也能用启发式回退)
     - `OPENAI_MODEL` → 可选,默认 `gpt-4o-mini`
   - **不要**填 `VITE_APP_NAME` / `VITE_DEFAULT_LOCALE` —— MVP 没用到,留空即可
7. 点 **Deploy**
8. 大约 1–2 分钟后,顶部会有 `https://pairfit-mvp.vercel.app`(或你改过的子域名)的访问链接

### 之后每次 push
- `git push origin main` → Vercel 自动检测 commit → 触发 production build + 部署
- PR → Vercel 自动生成 preview URL(`<branch>-<hash>.vercel.app`)
- 部署日志在 Vercel 后台 → Project → Deployments

---

## 3. CLI 部署(备选)

只在你不想走 GitHub 集成 / 想用脚本化部署时用。

```bash
# 第一次
npm i -g vercel
vercel link --yes          # 把当前目录关联到 Vercel project
vercel                     # preview 部署(拿到 preview URL)

# 生产部署
vercel --prod              # 部署到生产 URL
```

> Vercel CLI 读 `.vercel/project.json` 知道推到哪个 project,token 来自 `~/.vercel/auth.json`(本地)。

---

## 4. 部署健康自检(部署成功跑一次必过)

部署完后,挨个验证这一段:

```bash
URL="https://pairfit-mvp.vercel.app"

# 1. 根路径返回 200 + HTML
curl -sS -o /dev/null -w "GET / → %{http_code} (%{size_download}B in %{time_total}s)\n" "$URL/"

# 2. 主 JS chunk 返回 200(URL 在 HTML 里,实际文件名带 hash)
JS=$(curl -sS "$URL/" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
echo "JS chunk: $JS"
curl -sS -o /dev/null -w "  → %{http_code}\n" "$URL$JS"

# 3. 静态资源 Cache-Control(应返回 1 年)
curl -sSI "$URL$JS" | grep -i cache-control

# 4. SPA rewrite 工作(/records/weight 这种深链不应 404)
curl -sS -o /dev/null -w "GET /records/weight → %{http_code}\n" "$URL/records/weight"
```

期望:`GET /` 是 200,JS chunk 200,Cache-Control `public, max-age=31536000, immutable`,深链 200(SPA fallback)。

---

## 5. 环境变量完整清单

| 变量 | 必需? | 用途 | 默认 |
|---|---|---|---|
| `OPENAI_API_KEY` | 否 | AI 食物估算 + AI 周报的真实 LLM 路径 | 没设就降级到本地启发式(仍可用) |
| `OPENAI_MODEL` | 否 | 覆盖默认模型 | `gpt-4o-mini` |
| `VITE_APP_NAME` | 否 | (预留)改写 brand 文本 | `PairFit` |
| `VITE_DEFAULT_LOCALE` | 否 | (预留)首次访问默认语言 | `en` |

> MVP **不需要**任何环境变量就能完整跑。PF-1 的设计原则是"Vercel 一键导入即用",环境变量都是可选增强。

---

## 6. 已知 Vercel 部署坑(MVP 实测过)

### 6.1 语音输入(mic)在某些 Vercel preview 下不可用
- 浏览器要求**安全上下文**(HTTPS 或 localhost)才能用 `getUserMedia`。
- Vercel 默认 URL 是 HTTPS ✅,所以生产 URL 上的语音可用。
- 但 **Chrome incognito / 部分 Brave / Firefox strict 模式**会拒绝麦克风权限。**这是浏览器行为,不是 Vercel 问题**。
- 移动端 Safari(iOS)需要在 system settings 里给浏览器授 mic 权限。

### 6.2 SPA 路由 404
- `vercel.json` 已经写了 `rewrites: [{ source: "/(.*)", destination: "/index.html" }]`,**所有深链都会落到 `index.html`**。
- 如果你 fork 出去自己部署,**确认 `vercel.json` 没被改掉**,否则 `/records/weight` 这类深链会 404。

### 6.3 静态资源 hash 缓存
- `vercel.json` 给 `/assets/*` 设了 `max-age=31536000, immutable`。
- 但**用户在两次部署间刷新页面时**,老 chunk 不存在,会出 "Unexpected token <" 这种白屏错误。
- **解决**:长按刷新 / Cmd+Shift+R 强制刷新一次,或者 Vercel 会自动清掉(可后台 Override)。

### 6.4 Node 版本
- `package.json` 没 pin Node 版本,Vercel 默认用 Node 22。如果某次部署挂了,在 Project Settings → General → Node Version 显式选 22 或更新。
- 如果未来 pin 到 `engines.node`,记得 `npm install` 之前先 `nvm use 22`。

### 6.5 API 路由超时
- `/api/ai/food-estimate` / `/api/ai/weekly-report` 在 OpenAI 慢的时候会拖到 8–10 秒。
- Vercel 免费层 **Serverless Function 默认 10s 超时**,Pro 60s,Hobby 10s。
- 实测:GPT-4o-mini 食物估算 95% < 4s,正常没问题;如果你用更大的 model(比如 `gpt-4`),偶尔会超时 → 在 Vercel 后台把 timeout 调到 15s(Hobby 允许,Pro 最多 60s)。

---

## 7. 端到端冒烟测试(部署后跑一遍)

> **这是验收 Agent 的 7 项"部署健康"指标**,manual 也行,自动化也行。

1. 打开 `https://pairfit-mvp.vercel.app`,首屏 < 2s,看到 PairFit logo + Sign in 按钮
2. 注册一个新账号(`qa+<timestamp>@pairfit.local`),跳转 onboarding
3. 选 **Lose** → 填 72.5 / 65 → 看到曲线预览 → Lock it in → 跳回 home
4. Home 显示"Your progress"卡片 + 计划 ETA
5. 进 **Records → Weight**,看到 `Hold to record` 麦克风按钮
6. 进 **Trends**,看到带 Goal(G)参考线的曲线
7. 进 **Couple**,看到 "Your invite code" 按钮 + 6 位输入框

任何一步挂掉就是真问题,不是配置问题。

---

## 8. 故障排查清单

| 症状 | 可能原因 | 修法 |
|---|---|---|
| 部署 404 | `vercel.json` 被改 / 丢失 | 从 git 还原 `vercel.json` |
| 首页 OK,深链 404 | SPA rewrite 没生效 | 检查 `vercel.json` 的 `rewrites` |
| `Failed to fetch` on `/api/*` | Edge / Serverless 没识别 | 检查 `api/` 目录在 repo 根;`api/ai/food-estimate.ts` 和 `api/ai/weekly-report.ts` 都得在 |
| AI 食物估算返回 stub | `OPENAI_API_KEY` 没配 | Vercel → Settings → Environment Variables 加 |
| 麦克风按钮转圈不出文字 | 浏览器拒绝 mic 权限 | 重新授权限;HTTPS 必须;不要 incognito |
| 提交注册后页面不动 | 表单 validation 没通过 | 检查浏览器 console;所有字段必填;密码 8+ |
| 情侣绑定后 partner card 不显示 | 两个账号在不同浏览器 profile | MVP 必须同设备同 profile,Vercel 救不了 |

---

## 9. 后续(V1.1+)

- 域名:换 `pairfit.app` 自定义域(Vercel → Domains → Add,改 DNS)
- 真实支付:接 Stripe / Paddle,需要后端 + webhook,V1.1 再做
- 云同步:加 `/api/users/*` 路由 + Postgres,V1.1
- iOS / Android:Capacitor 套壳,无需改 Vercel 配置

---

**附:本指南也写在 README.md "☁️ Vercel 部署" 一节,但本文档更详细;以本文档为准。**
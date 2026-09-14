# PairFit · UI 组件清单

> 版本:v1.0 · 2026-09-14
>
> 本目录是 PairFit 全部 UI 组件的规格说明。每个组件一份 markdown,描述:用途 / props / 状态 / 例子 / 可访问性。
>
> **PF-1 已搭的组件**:`Button / Card / Input / AvatarPicker / EmptyState / PageHeader`(在 `src/components/ui/`)— 规格文档与现有代码兼容,只补充用法细节,不重写。
>
> **PF-3+ 需要新增的组件**:`VoiceButton / Modal / BottomSheet / Toast / Tabs / SegmentedControl / ProgressBar / ProgressCard / StatTile / MealCard / WorkoutCard / Badge / CoupleRibbon / ChartCard / StreakChip`。

---

## 组件目录

| 文件 | 组件 | 状态 | 依赖 |
|---|---|---|---|
| [button.md](./button.md) | `Button` | ✅ PF-1 已实现 | `lucide-react` (Loader2) |
| [card.md](./card.md) | `Card` | ✅ PF-1 已实现 | — |
| [input.md](./input.md) | `Input` | ✅ PF-1 已实现 | `lucide-react` |
| [page-header.md](./page-header.md) | `PageHeader` | ✅ PF-1 已实现 | — |
| [empty-state.md](./empty-state.md) | `EmptyState` | ✅ PF-1 已实现 | — |
| [avatar-picker.md](./avatar-picker.md) | `AvatarPicker` | ✅ PF-1 已实现 | — |
| [voice-button.md](./voice-button.md) | `VoiceButton` | 🆕 需新增(PF-3) | `lucide-react` (Mic) |
| [modal.md](./modal.md) | `Modal` | 🆕 需新增(PF-3) | `lucide-react` (X) |
| [bottom-sheet.md](./bottom-sheet.md) | `BottomSheet` | 🆕 需新增(PF-3) | — |
| [toast.md](./toast.md) | `Toast` | 🆕 需新增(PF-3) | `lucide-react` |
| [segmented-control.md](./segmented-control.md) | `SegmentedControl` | 🆕 需抽公共组件(PF-9) | — |
| [progress-bar.md](./progress-bar.md) | `ProgressBar` | 🆕 需新增(PF-3) | — |
| [progress-card.md](./progress-card.md) | `ProgressCard`(你/ta) | 🆕 需新增(PF-3) | `Card` + `ProgressBar` |
| [stat-tile.md](./stat-tile.md) | `StatTile` | 🆕 需新增(PF-3) | — |
| [meal-card.md](./meal-card.md) | `MealCard` | 🆕 需新增(PF-4) | — |
| [workout-card.md](./workout-card.md) | `WorkoutCard` | 🆕 需新增(PF-5) | — |
| [badge.md](./badge.md) | `Badge` | 🆕 需抽公共组件 | — |
| [couple-ribbon.md](./couple-ribbon.md) | `CoupleRibbon`(绑定状态) | 🆕 需新增(PF-6) | `AvatarPicker` |
| [chart-card.md](./chart-card.md) | `ChartCard`(曲线容器) | 🆕 需新增(PF-8) | Recharts |

---

## 组件复用约定(给 Coding Agent)

- **优先复用 PF-1 已搭的组件**:不要重新发明 `Button` / `Input` / `Card`,只扩展 props。
- **新增组件放 `src/components/ui/`**:路径与命名与 PF-1 保持一致。
- **复合组件**:`ProgressCard` / `MealCard` / `WorkoutCard` / `ChartCard` 应组合 `Card` 而非另起炉灶。
- **所有 icon-only 按钮**必须有 `aria-label`;emoji 必须 `aria-hidden`。
- **颜色只用 brand / accent / semantic 四档**(success / warning / danger / info),不要新增自定义色。
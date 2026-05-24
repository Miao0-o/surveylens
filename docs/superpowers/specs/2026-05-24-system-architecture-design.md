# AI 信效度分析系统 — 系统架构设计 v2.0

## 一、两大模式

| | 本地分析模式 | AI 解读模式 |
|---|---|---|
| 入口 | 首页 → 开始分析 | 首页 → 开始分析 → AI 设置页配置 |
| 登录要求 | 无 | 无 |
| 研究设计 | 可跳过 | **必须完成**（analysis_intent + 至少 1 个 outcome） |
| 统计计算 | Pyodide 浏览器本地 | Pyodide 浏览器本地 |
| AI 调用 | 不调用 | Claude API 经 FastAPI 代理 |
| 数据上传 | 不上传 | 仅传 ~500B 统计摘要 |

**AI 不是并行入口，是统计完成后的消费层。**

---

## 二、分层架构（5 层）

```
┌─────────────────────────────────────────┐
│  Layer 0: Data Understanding            │  JS 前置分类
│  - 列类型识别 (item_scale / metadata)    │
│  - 数据集分类 (scale_only / mixed / meta_only)
│  - 决定哪些分析可用                      │
├─────────────────────────────────────────┤
│  Layer 1: Statistics Engine (Truth)     │  Pyodide 主线程
│  - Cronbach's α, KMO, Bartlett          │
│  - EFA (Varimax), Bootstrap 稳定性       │
│  - 严格 deterministic, 固定 seed         │
├─────────────────────────────────────────┤
│  Layer 2: Validation Engine             │  JS 规则引擎
│  - 规则审计 (α>0.98 warn, KMO<0.50 error)
│  - Confidence Score 计算                │
│  - ValidationReport 生成                │
├─────────────────────────────────────────┤
│  Layer 3: AI Context Compression        │  JS Reducer
│  - 去掉原始矩阵、行级数据                │
│  - 压缩为 ~500B AICompressedInput        │
├─────────────────────────────────────────┤
│  Layer 4: Scientific AI Reviewer        │  Claude API
│  - 6 层 Prompt Pipeline (v2.0)          │
│  - System Contract → Context Filter →    │
│    Scientific Interpreter →              │
│    Output Structurer → Hallucination     │
│    Checker → Output Guard (JS 终检)      │
├─────────────────────────────────────────┤
│  Layer 5: Report Renderer               │  React
│  - 概览仪表盘、信度/效度/EFA/稳定性卡片  │
│  - AI 解读卡片（通俗/学术/诊断/APA）      │
│  - PDF / Excel 导出                     │
└─────────────────────────────────────────┘
```

---

## 三、状态机

```
                    ┌──────────┐
                    │   idle   │  初始状态
                    └────┬─────┘
                         │ upload file
                    ┌────▼─────┐
                    │  parsing │  文件解析中
                    └────┬─────┘
                         │ columns detected + classified
                    ┌────▼──────────┐
                    │ schema_draft  │  研究设计未完成
                    │ (可操作数据)    │
                    └────┬──────────┘
                         │ 完成 guided setup + 确认设计
                    ┌────▼──────────┐
                    │ schema_locked │  设计已确认
                    │ (可运行分析)   │
                    └────┬──────────┘
                         │ 点击"开始分析"
                    ┌────▼──────────┐
                    │  processing   │  Pyodide 计算中
                    │  (4步逐步)     │  reliability → validity → EFA → stability
                    └────┬──────────┘
                         │
              ┌──────────┼──────────┐
              │                     │
         AI 未连接              AI 已连接
              │                     │
    ┌─────────▼──────┐    ┌────────▼─────────┐
    │   completed    │    │ interpretation_    │
    │  (纯统计结果)   │    │ ready              │
    │                │    │ (可生成 AI 解读)    │
    └────────────────┘    └────────┬─────────┘
                                   │ 点击"生成完整解读"
                          ┌────────▼─────────┐
                          │  ai_processing   │
                          │  (4步流式)        │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │   completed      │
                          │  (统计 + AI 结果) │
                          └──────────────────┘
```

### Store 中的关键布尔值

| 字段 | 含义 |
|------|------|
| `hasData` | rawData !== null |
| `hasLikert` | likertColumns.length > 0 |
| `hasDesign` | researchDesign !== null && outcomeVariables.length > 0 |
| `designConfirmed` | 用户点击"确认设计" |
| `canRunAnalysis` | hasData && hasLikert && hasDesign && designConfirmed && pipelineState === "idle" |
| `aiMode === "connected"` | AI 后端可达 + API Key 有效 |

---

## 四、研究设计字段矩阵

| 字段 | 类型 | 本地模式 | AI 模式 | 何时必填 |
|------|------|:---:|:---:|------|
| `analysis_intent` | enum | 可选 | **必填** | AI 解读前 |
| `outcomeVariables` | ComputedVariable[] | 可选 | **必填** | AI 解读前 |
| `predictorVariables` | string[] | 可选 | 可选 | — |
| `theoreticalFramework` | string | 可选 | 推荐 | AI 生成理论化解读时 |
| `hypotheses` | string | 可选 | 推荐 | AI 评估假设时 |
| `freeNotes` | string | 可选 | 可选 | — |

### ComputedVariable 结构

```ts
interface ComputedVariable {
  name: string;           // "焦虑维度"
  method: "mean" | "sum" | "weighted_mean" | "factor_score";
  sourceItems: string[];  // ["Q1", "Q2", "Q3"]
}
```

**不展平为原始变量列表。** 计算变量保留其 method + sourceItems 作为一等数据结构。

---

## 五、用户流程

### 5.1 首页

```
┌──────────────────────────────────────┐
│        AI 信效度分析系统               │
│   上传问卷数据 → 自动信效度分析         │
│   数据全程本地运行                     │
│                                      │
│   [📊 开始分析]  ← 唯一 CTA           │
│   AI 设置 →                          │
└──────────────────────────────────────┘
```

### 5.2 分析工作台（/analyze）

```
上传数据
  ↓
自动列分类（Data Understanding Layer）
  ├─ Likert 题项 ≥3 → 可做信度分析
  ├─ 仅元数据 → 提示不可做 α，切换描述性统计
  └─ 混合 → 自动排除非量表列
  ↓
引导式研究设置（5 步表单，可跳过步骤 3-5）
  ├─ Step 1: 研究意图  [必填]
  ├─ Step 2: 结果变量  [必填，支持计算变量]
  ├─ Step 3: 预测变量  [选填]
  ├─ Step 4: 理论框架  [选填]
  └─ Step 5: 补充说明  [选填]
  ↓
研究设计确认面板
  ├─ 系统推断字段标注（置信度）
  ├─ 计算变量展示：方法 + 来源
  ├─ 每个字段可点击编辑
  └─ [确认设计] 按钮 → 🔒 锁定
  ↓
[开始分析] ← 按钮解锁
  ↓
Pyodide 逐步计算（4 步真实进度）
  ↓
结果展示
  ├─ 概览仪表盘（含 Confidence Score）
  ├─ 信度卡片
  ├─ 效度卡片 + 热力图
  ├─ 因子分析 + 结构图
  └─ 稳定性曲线
  ↓
右侧栏：AI 选项
  ├─ AI 未连接 → "配置 AI 获得学术解读" → /settings/ai
  └─ AI 已连接 → [生成完整解读] → 流式 4 步 → 5 类卡片
```

### 5.3 AI 设置页（/settings/ai）

```
隐私说明 → API Key 输入 → 启动命令（复制）→ 测试连接 → 进入工作台
```

---

## 六、AI 行为规则

### 6.1 何时可调用 AI

| 条件 | 可否调用 |
|------|:---:|
| 统计已完成 + AI 已连接 + designConfirmed | ✅ |
| 统计已完成 + AI 已连接 + 无研究设计 | ❌ 需提示补全 |
| 统计未完成 | ❌ |
| AI 未连接 | ❌ 跳转 /settings/ai |

### 6.2 研究设计对 AI 输出的影响

| 设计完整度 | AI 输出 |
|-----------|---------|
| 仅 analysis_intent | 通用解读（不针对特定理论） |
| + outcomeVariables | 聚焦结果变量的解读 |
| + theoreticalFramework | 理论驱动的解释 |
| + hypotheses | 假设评估 + 验证/否定结论 |

### 6.3 AI 提示补全规则

当用户点击 AI 解读但缺少关键字段时：

```
analysis_intent 缺失：
  → "请先选择研究意图（量表验证/探索分析/解释研究/预测建模）"

outcomeVariables 缺失：
  → "请先指定至少一个结果变量"

theoreticalFramework 缺失：
  → "未指定理论框架，AI 将提供通用解读（不针对特定理论）"
  → 用户可选择 [跳过，继续] 或 [补全框架]
```

---

## 七、关键 UX 决策

### 7.1 为什么 AI 不是首页入口？

AI 解读依赖统计结果。没有数据的 AI 解读没有意义。AI 是**分析结果的消费层**，不是独立的分析模式。

### 7.2 为什么需要"确认设计"锁？

防止用户在不清楚研究目的的情况下盲目运行分析。研究设计决定分析方法的适用性（量表验证 → α；预测 → 回归）。

### 7.3 为什么计算变量保留 method + sourceItems？

"焦虑维度 = mean(Q1, Q2, Q3)" 与 "Q1, Q2, Q3" 在统计意义上完全不同。前者是一个构念的测量，后者是三个独立题项。展平会丢失结构信息，导致 AI 无法正确解读。

### 7.4 为什么分析进度是真实步骤而非动画？

虚假进度条破坏信任。4 步真实进度（reliability → validity → EFA → stability）来自 Pyodide Worker 的实际执行顺序，每步完成才推进。

### 7.5 为什么不用 Worker（GitHub Pages 部署版）？

Web Worker 需要 Turbopack 分包加载，但分包的路径缺少 basePath 前缀，在 GitHub Pages 上 404。改为 Pyodide 主线程加载，功能完全一致。

---

## 八、文件索引

| 模块 | 文件 |
|------|------|
| 类型定义 | `src/types/index.ts` |
| 状态机 | `src/lib/store.ts` |
| Schema | `src/lib/schema.ts` |
| 数据分类器 | `src/lib/stats/data-classifier.ts` |
| 校验引擎 | `src/lib/stats/validation-engine.ts` |
| Pyodide Hook | `src/hooks/use-pyodide.ts` |
| AI Client (6层) | `src/lib/ai/client.ts` |
| AI Hook | `src/hooks/use-ai.ts` |
| 设计标准化 | `src/lib/ai/design-normalizer.ts` |
| 输出守门 | `src/lib/ai/output-guard.ts` |
| 首页 | `src/app/page.tsx` |
| 分析台 | `src/app/analyze/page.tsx` |
| AI 设置 | `src/app/settings/ai/page.tsx` |
| 引导设置 | `src/components/upload/guided-research-setup.tsx` |
| 设计审阅 | `src/components/upload/research-design-review.tsx` |
| 后端代理 | `backend/main.py` |
| Prompt 源 | `backend/ai/prompts/scientific_reviewer.txt` |

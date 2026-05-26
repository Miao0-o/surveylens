# SurveyLens

SurveyLens 是一个**完全本地运行**的 AI 问卷信效度分析工具。上传 CSV/Excel/Qualtrics 数据，自动完成信度分析、效度检验、因子分析、样本稳定性评估与 APA 格式结果生成。

---

## 在线体验（Live Demo）

👉 **[miao0-o.github.io/reliability-analysis-system](https://miao0-o.github.io/reliability-analysis-system/)**

---

## 项目背景

在学术研究和问卷开发中，信效度分析是不可或缺的核心环节。然而：

- SPSS / Jamovi / JASP 等工具学习曲线陡峭
- 统计结果解读需要专业知识
- 学术论文撰写需要 APA 格式输出
- 现有工具缺乏智能化引导

SurveyLens 致力于解决这些痛点：

- **零门槛操作**：拖拽上传 → 自动识别 → 一键分析 → AI 解读
- **隐私保护**：所有统计计算在浏览器本地 Pyodide (WASM) 引擎中完成，数据不出电脑
- **学术级输出**：Cronbach's α、KMO、Bartlett、EFA、Bootstrap 稳定性全流程覆盖
- **AI 智能解读**：通俗解释 + 学术解读 + 导师建议 + APA 格式论文结果

---

## 核心功能（Core Features）

### 数据预处理
- CSV / Excel / Qualtrics 文件上传（拖拽/点击）
- 规则引擎自动识别 Likert 题项（unique ≤ 7）
- 缺失值处理（整行删除 / 均值填补 + 容忍度滑块）
- AI 辅助反向题检测（Pearson 负相关分析）
- 拖拽式维度分组管理

### 统计分析引擎（Pyodide 浏览器本地执行）
- **信度分析**：Cronbach's α、标准化 α、题总相关、删除后 α 变化
- **效度分析**：KMO 检验（含单题 KMO）、Bartlett 球形检验、相关矩阵
- **探索性因子分析 (EFA)**：特征值分解、Varimax 旋转、因子载荷、共同度、方差解释率
- **样本稳定性评估**：Bootstrap 重抽样、α 稳定性曲线、拐点检测、推荐样本量

### AI 解释层（Claude API）
- 通俗解读（面向零基础用户）
- 学术解读（APA 风格专业解释）
- 导师建议（问题诊断 + 具体优化方案）
- 因子命名（AI 自动命名潜在因子）
- APA 格式论文结果（可直接复制）

### 可视化与导出
- 综合质量评分仪表盘（α × KMO × 稳定性加权）
- 相关矩阵热力图（正负相关双色渐变）
- 因子结构图（按最大载荷分组 + 彩色横条）
- 碎石图、样本稳定性曲线
- Excel 导出（8 Sheet 多工作表）
- PDF 学术报告（打印 / 下载）

---

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│            浏览器 (Next.js)                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ 数据上传  │  │ 统计引擎  │  │  AI 解读层         │  │
│  │ CSV/Excel│→│ Pyodide  │→│  Claude API 代理    │  │
│  │ 识别清理  │  │ (WASM)  │  │  (FastAPI)        │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│                                      ↓               │
│  ┌──────────────────────────────────────────────┐    │
│  │  结果可视化 + APA 文本 + 导出 PDF/Excel      │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

| 层级 | 技术栈 |
|------|-------|
| **前端** | Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui + Recharts |
| **统计引擎** | Pyodide (WASM) + pandas + numpy + scipy |
| **AI 层** | Claude API (API key 用户自带，经 FastAPI 代理转发) |
| **UI 风格** | 极简学术风（Jamovi / Linear / Notion 风格） |
| **数据原则** | **全本地运行，无数据上传** |

---

## 本地开发

### 环境要求
- Node.js 18+
- Python 3.11+（仅后端代理需要）

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/Miao0-o/reliability-analysis-system.git
cd reliability-analysis-system

# 2. 安装前端依赖
npm install

# 3. 启动 AI 代理后端（终端 1）
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# 4. 启动前端开发服务器（终端 2）
npm run dev
# 打开 http://localhost:3000
```

### 使用示例

1. 拖拽 `sample-data.csv` 到上传区
2. （可选）填写研究目标：`测量大学生焦虑水平`
3. 在"数据清洗"中配置缺失值策略
4. 在"维度管理"中拖拽题项分组
5. 点击"开始分析" → Pyodide 引擎自动计算
6. 配置 Claude API Key → 点击"AI 解读"
7. 导出 Excel / PDF 报告

---

## 项目结构

```
src/
├── app/                  Next.js App Router 页面
├── components/
│   ├── upload/           文件上传、研究信息输入
│   ├── preprocessing/    数据预览、缺失值、反向题、维度
│   ├── analysis/         概览、信度、效度、因子分析、稳定性
│   ├── export/           导出按钮（PDF/Excel）
│   ├── ai/               AI 结构化结果卡片（RightSidebar）
│   └── layout/           顶部导航、三栏布局
├── lib/
│   ├── store.ts          Zustand 全局状态机
│   ├── schema.ts         标准结果 Schema v1.0.0
│   ├── stats/            Python 统计代码、Pyodide Worker、通信桥
│   ├── ai/               Claude API Client、Result Reducer
│   └── export/           PDF/Excel 生成器
├── hooks/                usePyodide、useAI
└── types/                TypeScript 类型定义
```

---

## 数据隐私

**本系统不收集、不上传任何用户数据。**

- 所有文件解析、统计分析在浏览器本地执行
- 统计计算通过 Pyodide (WebAssembly) 在 Web Worker 中完成
- AI 解读仅提取结构化摘要，不含原始数据
- Claude API Key 仅存储于浏览器 sessionStorage
- 15 分钟无操作自动清除分析数据

---

## 路线图

- [x] P0：数据上传 + 信度分析 + 效度分析 + 基础可视化
- [x] P1：EFA 因子分析 + AI 结果解读 + 问题诊断 + 优化建议
- [x] P2：Bootstrap 样本稳定性 + APA 论文结果 + PDF/Excel 导出
- [ ] P3：CFA 验证性因子分析
- [ ] P4：SEM 结构方程模型
- [ ] P5：用户账户 + 云端存储 + 分享链接

---

## License

MIT License © 2026

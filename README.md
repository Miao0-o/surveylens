# SurveyLens

**帮助研究者判断问卷数据是否准备好进入下一阶段分析。**

👉 [在线体验](https://miao0-o.github.io/reliability-analysis-system/)

---

## 这是什么

SurveyLens 是一个完全在浏览器中运行的问卷分析工具。上传数据 → 自动完成信效度检验 → AI 辅助解读 → APA 格式报告。所有计算在本地完成，数据不会离开你的设备。

---

## 为什么用 SurveyLens

| | SPSS / Jamovi | SurveyLens |
|---|---|---|
| 安装 | 需要下载安装 | 浏览器打开即用 |
| 数据隐私 | 本地 | 本地（零上传） |
| AI 解读 | 无 | 证据可追溯的 AI 学术解读 |
| APA 报告 | 手动整理 | 一键生成 |
| 编码簿 | 手动编码 | CSV/XLSX/PDF/MD 自动映射 |

---

## 核心能力

- **数据准备度评估** — 判断问卷数据是否可以进入信效度分析
- **信度分析** — Cronbach's α、分维度信度、题总相关
- **效度与因子分析** — KMO、Bartlett、EFA、碎石图、载荷矩阵
- **样本稳定性** — Bootstrap 评估、推荐样本量
- **AI 学术解读** — 证据可追溯的统计解释 + 诊断考量 + APA 7 格式输出
- **编码簿映射** — CSV / Excel / SPSS / PDF / Markdown 自动文本→数值映射

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16 + TypeScript + Tailwind CSS + Recharts |
| 统计引擎 | Pyodide (WASM) + NumPy + SciPy |
| AI 层 | OpenRouter / Anthropic / OpenAI / DeepSeek 直连（用户自备 Key） |
| 部署 | GitHub Pages 静态托管 |

---

## 本地开发

```bash
git clone https://github.com/Miao0-o/reliability-analysis-system.git
cd reliability-analysis-system
npm install
npm run dev    # http://localhost:3000
```

---

## 数据隐私

- 所有统计计算在浏览器 Pyodide (WASM) 引擎中完成
- AI 仅接收统计摘要（~500 字符），不含原始数据
- API Key 仅存储于 sessionStorage，15 分钟无操作自动清除
- 无需注册、无后端、零数据上传

---

## License

MIT License © 2026

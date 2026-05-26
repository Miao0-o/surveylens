import Link from "next/link";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FAFAF9" }}>
      <header style={{ height: 56, borderBottom: "1px solid #E5E7EB", background: "#fff", display: "flex", alignItems: "center", padding: "0 24px" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>SurveyLens</span>
      </header>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>SurveyLens</h1>
        <p style={{ fontSize: 15, color: "#1F2937", marginBottom: 4 }}>帮助您判断问卷数据是否准备好进入下一阶段分析</p>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 24 }}>We help you decide whether your survey data is ready for analysis.</p>
        <p style={{ fontSize: 13, color: "#6B7280", maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
          SurveyLens 在浏览器本地完成信度检验、效度分析、因子分析与稳定性评估，帮助研究者判断当前数据是否具备足够的统计质量。
        </p>
        <Link href="/analyze" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, background: "#1F2937", color: "#FAFAF9", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
          开始分析
        </Link>
        <p style={{ fontSize: 12, color: "#D1D5DB", marginTop: 24 }}>无需注册 · 免费使用 · 数据全程本地运行</p>
      </main>
    </div>
  );
}

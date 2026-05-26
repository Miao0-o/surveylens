import Link from "next/link";
import { Cpu, Shield, FileText, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">SurveyLens</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">SurveyLens</h1>
        <p className="text-base text-foreground/80 font-medium mb-1">
          帮助您判断问卷数据是否准备好进入下一阶段分析
        </p>
        <p className="text-xs text-muted-foreground/60 mb-6">
          We help you decide whether your survey data is ready for analysis.
        </p>
        <p className="text-sm text-muted-foreground/70 max-w-md mb-8 leading-relaxed">
          SurveyLens 在浏览器本地完成信度检验、效度分析、因子分析与稳定性评估，
          帮助研究者判断当前数据是否具备足够的统计质量以支持后续建模与学术报告。
          所有计算均在本地完成，数据不会离开您的设备。
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-lg">
          <Feature icon={<Cpu className="w-5 h-5" strokeWidth={1.5} />} title="本地计算" desc="基于 Pyodide (WASM) 引擎，数据全程不离开浏览器" />
          <Feature icon={<Shield className="w-5 h-5" strokeWidth={1.5} />} title="零数据上传" desc="问卷数据不上传服务器，保护受访者隐私" />
          <Feature icon={<FileText className="w-5 h-5" strokeWidth={1.5} />} title="APA 学术格式" desc="自动生成 APA 7 格式结果段落，可复制至论文" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-10 w-full max-w-lg text-left">
          <Capability title="信度分析" items={["Cronbach's α", "题总相关", "删除后 α 变化", "分维度信度"]} />
          <Capability title="效度与因子" items={["KMO + Bartlett 检验", "探索性因子分析 (EFA)", "碎石图 + 载荷矩阵", "样本稳定性评估"]} />
          <Capability title="AI 学术解读" items={["研究导向的结果解释", "谨慎的诊断建议", "证据可追溯", "中英双语"]} />
          <Capability title="数据管理" items={["编码簿映射 (CSV/XLSX/PDF)", "反向题检测与确认", "缺失值处理", "维度分组管理"]} />
        </div>

        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          开始分析
        </Link>

        <p className="text-xs text-muted-foreground/50 mt-6">
          无需注册 · 免费使用 · 数据全程本地运行
        </p>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/50">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{desc}</p>
    </div>
  );
}

function Capability({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-secondary/20 border border-border/50">
      <p className="text-xs font-medium text-foreground mb-1">{title}</p>
      <ul className="text-[10px] text-muted-foreground space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" strokeWidth={1.5} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { parseCodebookFile } from "@/lib/codebook/parser";
import { applyMapping } from "@/lib/codebook/mapping-engine";
import type { CodebookSchema } from "@/lib/codebook/schema";

interface Props {
  codebook: CodebookSchema | null;
  onChange: (cb: CodebookSchema) => void;
}

export function CodebookUploader({ codebook, onChange }: Props) {
  const mappingFreeze = useAppStore((s) => s.mappingFreeze);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsParsing(true);
    try {
      const parsed = await parseCodebookFile(file);
      onChange(parsed);

      // Golden rule: mappingFreeze MUST be freshly derived from codebook + rawData.
      // Never re-use or layer on top of a previous freeze.
      const rawData = useAppStore.getState().rawData;
      if (rawData && Object.keys(parsed.questions).length > 0) {
        console.log("[codebook] data exists, applying fresh mapping...");
        const freeze = applyMapping(rawData.rows, parsed, rawData.headers);
        useAppStore.getState().setMappingFreeze(freeze);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败");
    } finally {
      setIsParsing(false);
    }
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <label className="text-sm font-medium text-foreground">编码簿 (Codebook)</label>
        <span className="text-[10px] text-muted-foreground">选填</span>
      </div>

      {/* Drop zone or success */}
      {!codebook ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30 hover:bg-secondary/50"}`}
        >
          {isParsing ? (
            <p className="text-xs text-muted-foreground">解析中...</p>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">上传编码簿</span>
              <span className="text-[10px] text-muted-foreground/60">CSV · JSON · SPSS · XLSX · PDF · MD</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".csv,.json,.sps,.xlsx,.xls,.pdf,.md" onChange={(e) => {
            const f = e.target.files?.[0]; if (f) handleFile(f);
          }} className="hidden" />
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
          <FileText className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground truncate">{codebook.source}</p>
            <p className="text-[10px] text-muted-foreground">
              {Object.keys(codebook.questions).length} 题 · {codebook.detectedReverseItems.length} 反向题
              {mappingFreeze && (
                <span className="text-emerald-500 ml-1">
                  · 映射 {(mappingFreeze.stats.confidence * 100).toFixed(0)}%
                </span>
              )}
            </p>
          </div>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2} />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-red-50 border border-red-100">
          <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-[10px] text-red-600">{error}</p>
        </div>
      )}

      {/* Preview */}
      {codebook && Object.keys(codebook.questions).length > 0 && (
        <details className="group">
          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
            预览映射 ({Object.keys(codebook.questions).length} 题)
          </summary>
          <div className="mt-1.5 max-h-[200px] overflow-y-auto space-y-1">
            {Object.entries(codebook.questions).slice(0, 50).map(([id, q]) => (
              <div key={id} className="px-2 py-1.5 rounded bg-secondary/20 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{id}</span>
                  {q.reverse && <span className="text-amber-500 text-[9px]">反向</span>}
                </div>
                <p className="text-muted-foreground truncate">{q.text || id}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(q.mapping).slice(0, 6).map(([label, val]) => (
                    <span key={label} className="text-[9px] bg-secondary/50 px-1 rounded">
                      {label}={val}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

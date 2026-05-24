"use client";

import { useAppStore } from "@/lib/store";
import { classifyDataset } from "@/lib/stats/data-classifier";
import { useMemo } from "react";
import type { ColumnInfo } from "@/types";

function profileColumns(
  headers: string[],
  rows: Record<string, unknown>[]
): ColumnInfo[] {
  return headers.map((name) => {
    const values = rows.map((r) => r[name]);
    const numericValues: number[] = [];
    let textCount = 0;
    let missingCount = 0;
    const uniqueSet = new Set<string>();

    for (const v of values) {
      if (v === null || v === undefined || v === "") {
        missingCount++;
        continue;
      }
      const str = String(v).trim();
      uniqueSet.add(str);
      const num = Number(str);
      if (!isNaN(num) && str !== "") {
        numericValues.push(num);
      } else {
        textCount++;
      }
    }

    const total = values.length;
    const uniqueValues = uniqueSet.size;

    // Classification rules
    let type: ColumnInfo["type"] = "unknown";
    if (textCount === 0 && numericValues.length > 0) {
      // All numeric
      if (uniqueValues <= 7 && uniqueValues >= 2) {
        type = "likert"; // Rule-based: ≤7 unique values → Likert candidate
      } else if (uniqueValues <= total * 0.05) {
        type = "id";
      } else {
        type = "numeric";
      }
    } else if (textCount > 0 && numericValues.length === 0) {
      type = "text";
    } else if (textCount > 0 && numericValues.length > 0) {
      type = "text"; // Mixed → treat as text
    }

    return {
      name,
      type,
      uniqueValues,
      min: numericValues.length > 0 ? Math.min(...numericValues) : undefined,
      max: numericValues.length > 0 ? Math.max(...numericValues) : undefined,
      mean:
        numericValues.length > 0
          ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
          : undefined,
      missingCount,
    };
  });
}

export function DataPreview() {
  const rawData = useAppStore((s) => s.rawData);
  const setColumns = useAppStore((s) => s.setColumns);
  const setLikertColumns = useAppStore((s) => s.setLikertColumns);

  const columns = useMemo(() => {
    if (!rawData) return [];
    const cols = profileColumns(rawData.headers, rawData.rows);
    setColumns(cols);
    setLikertColumns(cols.filter((c) => c.type === "likert").map((c) => c.name));
    // Run data classification
    const classResult = classifyDataset(cols, rawData);
    useAppStore.getState().setClassification(classResult);
    return cols;
  }, [rawData, setColumns, setLikertColumns]);

  if (!rawData) return null;

  const previewRows = rawData.rows.slice(0, 10);
  const displayHeaders = rawData.headers.slice(0, 12);
  const hasMoreCols = rawData.headers.length > 12;
  const hasMoreRows = rawData.rowCount > 10;

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      likert: "bg-blue-50 text-blue-600 border-blue-100",
      numeric: "bg-emerald-50 text-emerald-600 border-emerald-100",
      text: "bg-amber-50 text-amber-600 border-amber-100",
      id: "bg-slate-50 text-slate-500 border-slate-100",
      unknown: "bg-slate-50 text-slate-400 border-slate-100",
    };
    const labels: Record<string, string> = {
      likert: "Likert",
      numeric: "数值",
      text: "文本",
      id: "ID",
      unknown: "未知",
    };
    return (
      <span
        className={`inline-block text-[9px] px-1.5 py-0.5 rounded border ${map[type] || map.unknown}`}
      >
        {labels[type] || type}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{rawData.rowCount}</strong> 样本
        </span>
        <span>
          <strong className="text-foreground">{rawData.colCount}</strong> 变量
        </span>
        <span>
          <strong className="text-foreground">
            {columns.filter((c) => c.type === "likert").length}
          </strong>{" "}
          Likert 题
        </span>
      </div>

      {/* Column list */}
      <div>
        <h3 className="text-xs font-medium text-foreground mb-2">变量识别结果</h3>
        <div className="grid gap-1.5 max-h-[200px] overflow-y-auto">
          {columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/50"
            >
              <span className="text-xs text-foreground truncate mr-2">
                {col.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {col.missingCount > 0 && (
                  <span className="text-[10px] text-amber-500">
                    缺失 {col.missingCount}
                  </span>
                )}
                {typeBadge(col.type)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data table */}
      <div>
        <h3 className="text-xs font-medium text-foreground mb-2">
          数据预览（前 {Math.min(10, rawData.rowCount)} 行）
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/50">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium border-r border-border w-10">
                  #
                </th>
                {displayHeaders.map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-muted-foreground font-medium border-r border-border whitespace-nowrap max-w-[140px] truncate"
                  >
                    {h}
                  </th>
                ))}
                {hasMoreCols && (
                  <th className="text-left px-3 py-2 text-muted-foreground/50 font-normal">
                    ...+{rawData.headers.length - 12} 列
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-t border-border hover:bg-secondary/20">
                  <td className="px-3 py-1.5 text-muted-foreground border-r border-border">
                    {i + 1}
                  </td>
                  {displayHeaders.map((h) => (
                    <td
                      key={h}
                      className="px-3 py-1.5 text-foreground border-r border-border whitespace-nowrap max-w-[140px] truncate"
                    >
                      {String(row[h] ?? "")}
                    </td>
                  ))}
                  {hasMoreCols && <td className="px-3 py-1.5" />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMoreRows && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            ... 还有 {rawData.rowCount - 10} 行未显示
          </p>
        )}
      </div>
    </div>
  );
}

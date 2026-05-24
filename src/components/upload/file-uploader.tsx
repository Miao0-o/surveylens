"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ParsedData } from "@/types";
import * as XLSX from "xlsx";
import Papa from "papaparse";

type SupportedFormat = "csv" | "xlsx" | "qualtrics";

interface ParseResult {
  data: ParsedData;
  warnings: string[];
}

function detectFormat(fileName: string): SupportedFormat {
  const lower = fileName.toLowerCase();
  if (lower.includes("qualtrics")) return "qualtrics";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  return "csv";
}

async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const rows = result.data as Record<string, unknown>[];
        const warnings: string[] = [];
        if (rows.length === 0) warnings.push("文件为空或无法解析");
        if (headers.length === 0) warnings.push("未检测到列标题");
        resolve({
          data: {
            headers,
            rows,
            rowCount: rows.length,
            colCount: headers.length,
            fileName: file.name,
            fileType: "csv",
          },
          warnings,
        });
      },
      error: (err) => reject(new Error(`CSV解析失败: ${err.message}`)),
    });
  });
}

async function parseXLSXFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel 文件中未找到工作表");
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    blankrows: false,
  });
  const headers = Object.keys(json[0] ?? {});
  const warnings: string[] = [];
  if (json.length === 0) warnings.push("工作表为空");
  return {
    data: {
      headers,
      rows: json,
      rowCount: json.length,
      colCount: headers.length,
      fileName: file.name,
      fileType: "xlsx",
    },
    warnings,
  };
}

async function parseQualtrics(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const allRows = result.data as Record<string, unknown>[];
        // Qualtrics typically has 2 metadata header rows that leak into data
        const dataRows = allRows.filter((row) => {
          const vals = Object.values(row);
          // Skip rows that look like metadata (all values are "ImportId", metadata labels, etc.)
          const strVals = vals.filter((v) => typeof v === "string") as string[];
          if (strVals.some((v) => v.startsWith("{"))) return false;
          if (strVals.every((v) => v === "")) return false;
          return true;
        });
        const headers = result.meta.fields ?? [];
        resolve({
          data: {
            headers,
            rows: dataRows,
            rowCount: dataRows.length,
            colCount: headers.length,
            fileName: file.name,
            fileType: "qualtrics",
          },
          warnings: dataRows.length < allRows.length ? ["已自动跳过 Qualtrics 元数据行"] : [],
        });
      },
      error: (err) => reject(new Error(`Qualtrics 文件解析失败: ${err.message}`)),
    });
  });
}

export function FileUploader() {
  const setRawData = useAppStore((s) => s.setRawData);
  const setPipelineState = useAppStore((s) => s.setPipelineState);
  const rawData = useAppStore((s) => s.rawData);

  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setWarnings([]);
      setIsParsing(true);
      setPipelineState("processing" as never);
      // Keep it at "processing" and then back to idle after parsing

      try {
        const format = detectFormat(file.name);
        let result: ParseResult;

        switch (format) {
          case "csv":
            result = await parseCSV(file);
            break;
          case "xlsx":
            result = await parseXLSXFile(file);
            break;
          case "qualtrics":
            result = await parseQualtrics(file);
            break;
        }

        setRawData(result.data);
        setWarnings(result.warnings);
        setPipelineState("idle" as never);
      } catch (err) {
        setError(err instanceof Error ? err.message : "文件解析失败");
        setPipelineState("error" as never);
      } finally {
        setIsParsing(false);
      }
    },
    [setRawData, setPipelineState]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">上传数据</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
          ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/30 hover:bg-secondary/50"
          }`}
      >
        {isParsing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" strokeWidth={1.5} />
            <span className="text-sm text-muted-foreground">解析中...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm text-muted-foreground">
              拖拽文件到此处，或点击选择
            </span>
            <span className="text-xs text-muted-foreground/60">
              CSV · Excel · Qualtrics
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>

      {/* Success state */}
      {rawData && !isParsing && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
          <FileText className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">{rawData.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {rawData.rowCount} 行 × {rawData.colCount} 列
            </p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-amber-50 border border-amber-100">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-xs text-amber-700">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-red-50 border border-red-100">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

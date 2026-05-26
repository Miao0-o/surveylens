"use client";

import { useAppStore } from "@/lib/store";
import type { DimensionGroup } from "@/types";
import { useCallback, useMemo, useState } from "react";
import { Plus, X, GripVertical, Layers } from "lucide-react";

export function DimensionManager() {
  const rawData = useAppStore((s) => s.rawData);
  const likertColumns = useAppStore((s) => s.likertColumns);
  const dimensions = useAppStore((s) => s.dimensions);
  const setDimensions = useAppStore((s) => s.setDimensions);
  const theoreticalDimensions = useAppStore((s) => s.theoreticalDimensions);
  const [newDimName, setNewDimName] = useState("");
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverDim, setDragOverDim] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const parsedTheoryDims = useMemo(() => {
    if (!theoreticalDimensions.trim()) return [];
    return theoreticalDimensions.split(/[,，]/).map((d) => d.trim()).filter(Boolean);
  }, [theoreticalDimensions]);

  const assignedItems = useMemo(() => {
    const set = new Set<string>();
    dimensions.forEach((d) => d.items.forEach((item) => set.add(item)));
    return set;
  }, [dimensions]);

  const unassignedItems = useMemo(
    () => likertColumns.filter((c) => !assignedItems.has(c)),
    [likertColumns, assignedItems]
  );

  const addDimension = useCallback(() => {
    const name = newDimName.trim();
    if (!name || dimensions.some((d) => d.name === name)) return;
    setDimensions([...dimensions, { name, items: [] }]);
    setNewDimName("");
  }, [newDimName, dimensions, setDimensions]);

  const removeDimension = useCallback(
    (name: string) => setDimensions(dimensions.filter((d) => d.name !== name)),
    [dimensions, setDimensions]
  );

  const addItemToDim = useCallback(
    (dimName: string, item: string) => {
      setDimensions(
        dimensions.map((d) =>
          d.name === dimName && !d.items.includes(item)
            ? { ...d, items: [...d.items, item] }
            : d.name !== dimName
              ? { ...d, items: d.items.filter((i) => i !== item) }
              : d
        )
      );
    },
    [dimensions, setDimensions]
  );

  const removeItemFromDim = useCallback(
    (dimName: string, item: string) => {
      setDimensions(
        dimensions.map((d) =>
          d.name === dimName ? { ...d, items: d.items.filter((i) => i !== item) } : d
        )
      );
    },
    [dimensions, setDimensions]
  );

  const autoCreateFromTheory = useCallback(() => {
    if (parsedTheoryDims.length === 0) return;
    const newDims: DimensionGroup[] = parsedTheoryDims.map((name) => {
      const existing = dimensions.find((d) => d.name === name);
      return existing ?? { name, items: [] };
    });
    setDimensions(newDims);
  }, [parsedTheoryDims, dimensions, setDimensions]);

  // Drop handlers for dimension zones
  const handleDragOver = (e: React.DragEvent, dimName: string) => {
    e.preventDefault();
    setDragOverDim(dimName);
  };
  const handleDragLeave = () => setDragOverDim(null);
  const handleDrop = (dimName: string) => {
    setDragOverDim(null);
    if (dragItem) {
      addItemToDim(dimName, dragItem);
      setDragItem(null);
    }
  };

  if (!rawData || likertColumns.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-foreground">维度管理</h3>
        <span className="text-[10px] text-muted-foreground">
          {assignedItems.size}/{likertColumns.length} 已分组
        </span>
      </div>

      {parsedTheoryDims.length > 0 && dimensions.length === 0 && (
        <button
          onClick={autoCreateFromTheory}
          className="w-full px-3 py-2 rounded-lg border border-border text-[11px] text-muted-foreground
            hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          根据理论维度自动创建分组
        </button>
      )}

      {/* Add dimension input */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={newDimName}
          onChange={(e) => setNewDimName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDimension()}
          placeholder="新建维度（如：焦虑维度、抑郁维度）..."
          className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground
            placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={addDimension}
          disabled={!newDimName.trim()}
          className="px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground
            hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Dimensions */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {dimensions.map((dim) => (
          <div
            key={dim.name}
            className="rounded-lg border border-border bg-secondary/20 overflow-hidden"
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-secondary/40">
              <div className="flex items-center gap-1.5">
                <GripVertical className="w-3 h-3 text-muted-foreground/40" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-foreground">{dim.name}</span>
                <span className="text-[10px] text-muted-foreground">{dim.items.length} 题</span>
              </div>
              <button
                onClick={() => removeDimension(dim.name)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => handleDragOver(e, dim.name)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(dim.name)}
              className={`p-1.5 space-y-0.5 min-h-[32px] transition-colors ${
                dragOverDim === dim.name ? "bg-primary/10 border-2 border-dashed border-primary/30 rounded" : ""
              }`}
            >
              {dim.items.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 px-1.5 py-1">
                  点击下方题项或拖拽到此处
                </p>
              ) : (
                dim.items.map((item) => (
                  <div
                    key={item}
                    draggable
                    onDragStart={() => setDragItem(item)}
                    onDragEnd={() => { setDragItem(null); setDragOverDim(null); }}
                    className="flex items-center justify-between px-2 py-1 rounded bg-background border border-border/60 text-[11px] text-foreground
                      cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
                  >
                    <span className="truncate max-w-[160px]">{item}</span>
                    <button
                      onClick={() => removeItemFromDim(dim.name, item)}
                      className="text-muted-foreground/40 hover:text-destructive shrink-0 ml-1"
                    >
                      <X className="w-2.5 h-2.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unassigned items pool */}
      {unassignedItems.length > 0 && (
        <div>
          <label className="text-[10px] text-muted-foreground mb-1.5 block">
            未分组题项（点击分配到维度，或拖拽到上方分组）
            {dimensions.length === 0 && (
              <span className="text-amber-500 ml-1">— 请先创建维度</span>
            )}
          </label>
          <div className="flex flex-wrap gap-1">
            {unassignedItems.map((item) => (
              <div key={item} className="relative">
                {/* If no dimensions: clicking prompts to create one */}
                {dimensions.length === 0 ? (
                  <button
                    onClick={() => setNewDimName(item.includes("_") ? item.split("_")[0] : item)}
                    className="px-2 py-0.5 rounded border border-border bg-background text-[11px] text-muted-foreground
                      hover:text-foreground hover:border-amber-300 transition-colors"
                    title="请先在上方创建维度"
                  >
                    {item}
                  </button>
                ) : dimensions.length === 1 ? (
                  /* Single dimension: click to assign directly */
                  <button
                    onClick={() => addItemToDim(dimensions[0].name, item)}
                    className="px-2 py-0.5 rounded border border-border bg-background text-[11px] text-muted-foreground
                      hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    {item}
                  </button>
                ) : (
                  /* Multiple dimensions: click to toggle dropdown */
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item ? null : item)}
                      className="px-2 py-0.5 rounded border border-border bg-background text-[11px] text-muted-foreground
                        hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {item}
                    </button>
                    {openDropdown === item && (
                      <div className="absolute top-full left-0 mt-0.5 z-10 flex flex-col bg-card border border-border rounded-lg shadow-sm py-0.5 min-w-[130px]">
                        {dimensions.map((dim) => (
                          <button
                            key={dim.name}
                            onClick={() => {
                              addItemToDim(dim.name, item);
                              setOpenDropdown(null);
                            }}
                            className="px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 text-left"
                          >
                            分配到「{dim.name}」
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Click outside to close */}
                    {openDropdown === item && (
                      <div className="fixed inset-0 z-0" onClick={() => setOpenDropdown(null)} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {likertColumns.length === 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground">
          <Layers className="w-3 h-3 shrink-0" strokeWidth={1.5} />
          未检测到 Likert 题项
        </div>
      )}
    </div>
  );
}

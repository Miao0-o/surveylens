// ============================================================
// Pyodide Web Worker
// Loads Pyodide, executes Python statistical code, returns results
// ============================================================

// Import Pyodide type from CDN
declare function importScripts(...urls: string[]): void;

interface WorkerMessage {
  id: string;
  type: "init" | "run_analysis";
  payload?: unknown;
}

interface WorkerResponse {
  id?: string;
  type: "init_done" | "init_error" | "analysis_done" | "analysis_error" | "progress";
  payload?: unknown;
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (names: string[]) => Promise<void>;
  globals: Map<string, unknown>;
}

let pyodide: PyodideInstance | null = null;
let isReady = false;

// Pyodide CDN URL
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js";

async function initPyodide(): Promise<void> {
  try {
    importScripts(PYODIDE_URL);
    // After importScripts, loadPyodide is available globally
    const loadPyodide = (self as unknown as Record<string, unknown>).loadPyodide as
      | ((opts: { indexURL: string }) => Promise<PyodideInstance>)
      | undefined;

    if (!loadPyodide) {
      throw new Error("Pyodide failed to initialize: loadPyodide not found");
    }

    const py = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/",
    });
    pyodide = py;

    postMessage({
      type: "progress",
      payload: { stage: "loading_packages", message: "加载统计包中..." },
    });

    // Load required packages
    await py.loadPackage(["numpy", "scipy"]);

    postMessage({
      type: "progress",
      payload: { stage: "packages_loaded", message: "统计引擎就绪" },
    });

    isReady = true;
    postMessage({
      type: "init_done",
      payload: null,
    });
  } catch (err) {
    postMessage({
      type: "init_error",
      payload: err instanceof Error ? err.message : String(err),
    });
  }
}

async function runAnalysis(id: string, payload: { pythonCode: string; data: number[][]; itemLabels: string[]; rotation: string; nBootstrap: number }): Promise<void> {
  const py = pyodide;
  if (!isReady || !py) {
    postMessage({
      id,
      type: "analysis_error",
      payload: "Pyodide not initialized",
    });
    return;
  }

  try {
    postMessage({
      id,
      type: "progress",
      payload: { stage: "reliability", message: "计算信度..." },
    });

    const inputJson = JSON.stringify({
      data: payload.data,
      itemLabels: payload.itemLabels,
      rotation: payload.rotation,
      nBootstrap: payload.nBootstrap,
    });

    // Run the Python code: register modules first, then run main
    await py.runPythonAsync(payload.pythonCode);

    const resultJson = await py.runPythonAsync(
      `run_all_analyses('''${inputJson}''')`
    );

    const results = JSON.parse(resultJson as string);

    postMessage({
      id,
      type: "analysis_done",
      payload: results,
    });
  } catch (err) {
    postMessage({
      id,
      type: "analysis_error",
      payload: err instanceof Error ? err.message : String(err),
    });
  }
}

// Message handler
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case "init": {
      initPyodide();
      break;
    }
    case "run_analysis": {
      runAnalysis(msg.id, msg.payload as Parameters<typeof runAnalysis>[1]);
      break;
    }
  }
};

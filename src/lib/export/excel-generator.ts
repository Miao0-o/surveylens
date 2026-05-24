// ============================================================
// Excel Results Exporter
// Generates multi-sheet .xlsx with all analysis results
// ============================================================

import type { AnalysisResults, AIResults } from "@/types";

export async function downloadExcel(
  results: AnalysisResults,
  aiResults: AIResults | null,
  filename = "analysis-results.xlsx"
): Promise<void> {
  const XLSX = await import("xlsx");

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData: (string | number)[][] = [
    ["AI Reliability & Validity Analysis Report"],
    [""],
    ["Generated", new Date(results.meta.timestamp).toISOString()],
    ["Schema Version", results.meta.schemaVersion],
    [""],
    ["Sample Size", results.meta.sampleSize],
    ["Number of Items", results.meta.itemCount],
    ["Analysis Duration (ms)", results.meta.analysisDurationMs],
    [""],
    ["Cronbach's α", results.reliability.cronbachsAlpha],
    ["Standardized α", results.reliability.standardizedAlpha],
    ["KMO", results.validity.kmo],
    ["Bartlett χ²", results.validity.bartlettChiSquare],
    ["Bartlett df", results.validity.bartlettDf],
    ["Bartlett p", results.validity.bartlettPValue],
    ["Suggested Factors", results.efa.suggestedFactors],
    ["Variance Explained", results.efa.varianceExplained.reduce((a, b) => a + b, 0)],
    ["Stability Level", results.stability.stabilityLevel],
    ["Recommended N", results.stability.recommendedSampleSize],
    [""],
    ["Method Recommendation", results.recommendedMethod],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");

  // Sheet 2: Item-Level Reliability
  const relData: (string | number)[][] = [["Item", "Item-Total Correlation", "Alpha if Deleted"]];
  for (const [item, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
    relData.push([item, corr, results.reliability.alphaIfItemDeleted[item] ?? ""]);
  }
  const relWs = XLSX.utils.aoa_to_sheet(relData);
  relWs["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, relWs, "Item Reliability");

  // Sheet 3: KMO per Item
  const kmoData: (string | number)[][] = [["Item", "KMO"]];
  for (const [item, kmo] of Object.entries(results.validity.kmoPerItem)) {
    kmoData.push([item, kmo]);
  }
  const kmoWs = XLSX.utils.aoa_to_sheet(kmoData);
  kmoWs["!cols"] = [{ wch: 30 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, kmoWs, "KMO per Item");

  // Sheet 4: Correlation Matrix
  const corrData: (string | number)[][] = [["", ...results.validity.columnLabels.slice(0, 50)]];
  for (let i = 0; i < results.validity.correlationMatrix.length && i < 50; i++) {
    corrData.push([
      results.validity.columnLabels[i] ?? `V${i + 1}`,
      ...results.validity.correlationMatrix[i].slice(0, 50),
    ]);
  }
  const corrWs = XLSX.utils.aoa_to_sheet(corrData);
  XLSX.utils.book_append_sheet(workbook, corrWs, "Correlation Matrix");

  // Sheet 5: Factor Loadings
  const efaData: (string | number)[][] = [["Item", ...Array.from({ length: results.efa.suggestedFactors }, (_, i) => `Factor ${i + 1}`), "Communality"]];
  for (let i = 0; i < results.efa.loadings.length; i++) {
    efaData.push([
      results.efa.itemLabels[i] ?? `Q${i + 1}`,
      ...results.efa.loadings[i].slice(0, results.efa.suggestedFactors),
      results.efa.communalities[i] ?? "",
    ]);
  }
  const efaWs = XLSX.utils.aoa_to_sheet(efaData);
  efaWs["!cols"] = [{ wch: 30 }, ...Array(results.efa.suggestedFactors).fill({ wch: 12 }), { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, efaWs, "Factor Loadings");

  // Sheet 6: Eigenvalues
  const eigenData: (string | number)[][] = [["Factor", "Eigenvalue"]];
  results.efa.eigenvalues.forEach((val, i) => {
    eigenData.push([i + 1, val]);
  });
  const eigenWs = XLSX.utils.aoa_to_sheet(eigenData);
  XLSX.utils.book_append_sheet(workbook, eigenWs, "Eigenvalues");

  // Sheet 7: Stability Curve
  const stabData: (string | number)[][] = [["Sample Size", "Mean Alpha"]];
  for (const point of results.stability.alphaCurve) {
    stabData.push([point.sampleSize, point.alpha]);
  }
  const stabWs = XLSX.utils.aoa_to_sheet(stabData);
  XLSX.utils.book_append_sheet(workbook, stabWs, "Stability Curve");

  // Sheet 8: AI Results (if available)
  if (aiResults) {
    const aiData = [
      ["AI Interpretation"],
      [""],
      ["Plain-Language Summary", aiResults.explanation.simple],
      [""],
      ["Academic Interpretation", aiResults.explanation.academic],
      [""],
      ["APA-Formatted Results", aiResults.apaResult],
      [""],
      ["Advisor Suggestions"],
      ["Severity", "Title", "Detail"],
      ...aiResults.suggestions.map((s) => [s.severity, s.title, s.detail]),
      [""],
      ["Problem Diagnosis"],
      ["Low Reliability Items", aiResults.diagnosis.lowReliabilityItems.join(", ")],
      ["Cross-Loading Items", aiResults.diagnosis.crossLoadingItems.join(", ")],
      ["Reverse Item Risks", aiResults.diagnosis.reverseItemRisks.join(", ")],
    ];
    const aiWs = XLSX.utils.aoa_to_sheet(aiData);
    aiWs["!cols"] = [{ wch: 24 }, { wch: 60 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, aiWs, "AI Results");
  }

  // Download
  XLSX.writeFile(workbook, filename, { compression: true });
}

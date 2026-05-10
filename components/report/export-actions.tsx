"use client";

import * as React from "react";
import { Download, Printer, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportReportByPdfSection } from "@/lib/pdf-export";
import type { ReportData } from "@/lib/types";

interface ExportActionsProps {
  report: ReportData;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onExportingChange?: (exporting: boolean) => void;
  onNewAnalysis: () => void;
}

export function ExportActions({
  report,
  containerRef,
  onExportingChange,
  onNewAnalysis,
}: ExportActionsProps) {
  const [exporting, setExporting] = React.useState(false);
  const [progressText, setProgressText] = React.useState<string | null>(null);

  const handleExport = async () => {
    if (!containerRef.current || exporting) return;
    setExporting(true);
    onExportingChange?.(true);
    setProgressText("准备中…");
    try {
      // Let the UI paint "exporting mode" (animations off) first
      await new Promise((r) => setTimeout(r, 80));
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const safePos = (report.meta.formData.targetPosition || "报告").slice(
        0,
        20
      );
      await exportReportByPdfSection(containerRef.current, {
        fileName: `职业定位报告_${safePos}_${dateStr}.pdf`,
        onProgress: (done, total, label) => {
          setProgressText(`已导出 ${done}/${total} 章节${label ? ` · ${label}` : ""}`);
        },
      });
      setProgressText(null);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF 导出失败，请尝试使用浏览器打印功能");
    } finally {
      setExporting(false);
      onExportingChange?.(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--blue-100)] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 print:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1 text-xs text-[var(--muted-foreground)] truncate">
          {exporting && progressText ? progressText : "生成时间：" + new Date(report.meta.generatedAt).toLocaleString("zh-CN")}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 sm:h-9 min-h-[44px] sm:min-h-0"
            onClick={onNewAnalysis}
          >
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline ml-1">重新分析</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 sm:h-9 min-h-[44px] sm:min-h-0"
            onClick={handlePrint}
          >
            <Printer className="size-4" />
            <span className="hidden sm:inline ml-1">打印</span>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={exporting}
            onClick={handleExport}
            className="h-10 sm:h-9 min-h-[44px] sm:min-h-0 bg-[var(--navy-900)] hover:bg-[var(--navy-800)] text-white"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span className="ml-1">{exporting ? "导出中" : "下载 PDF"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

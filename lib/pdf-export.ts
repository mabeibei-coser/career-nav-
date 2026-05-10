export interface PdfExportOptions {
  fileName: string;
  onProgress?: (done: number, total: number, label?: string) => void;
}

const A4_MM = { width: 210, height: 297 };
const MARGIN_MM = 10;

export async function exportReportByPdfSection(
  container: HTMLElement,
  opts: PdfExportOptions
): Promise<void> {
  const html2canvasModule = await import("html2canvas-pro");
  const html2canvas = html2canvasModule.default;
  const { jsPDF } = await import("jspdf");

  // Wait for fonts to be ready (prevents mojibake / fallback font)
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const sections = Array.from(
    container.querySelectorAll<HTMLElement>("[data-pdf-section]")
  );

  if (sections.length === 0) {
    throw new Error("未找到任何可导出的报告章节");
  }

  const pdf = new jsPDF("p", "mm", "a4");
  const usableWidth = A4_MM.width - MARGIN_MM * 2;
  const usableHeight = A4_MM.height - MARGIN_MM * 2;
  const pxPerMm = 2.83465; // html2canvas outputs ~1 px = 0.2645 mm at scale 1; we use scale 2

  let firstPage = true;

  for (let i = 0; i < sections.length; i++) {
    const el = sections[i];
    opts.onProgress?.(i, sections.length, el.getAttribute("data-pdf-section") || undefined);

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: false,
      });

      const canvasAspect = canvas.height / canvas.width;
      const pdfImgWidth = usableWidth;
      const pdfImgHeight = pdfImgWidth * canvasAspect;

      if (pdfImgHeight <= usableHeight) {
        // Fits on a single page
        if (!firstPage) pdf.addPage();
        firstPage = false;
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(
          imgData,
          "JPEG",
          MARGIN_MM,
          MARGIN_MM,
          pdfImgWidth,
          pdfImgHeight
        );
      } else {
        // Section taller than a page → split by pixel slices corresponding to usableHeight
        const pageHeightPx = (usableHeight / pdfImgWidth) * canvas.width;
        let sliceStart = 0;
        const totalPx = canvas.height;
        while (sliceStart < totalPx) {
          const sliceHeight = Math.min(pageHeightPx, totalPx - sliceStart);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const ctx = sliceCanvas.getContext("2d");
          if (!ctx) throw new Error("canvas 上下文不可用");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sliceStart,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
          const imgData = sliceCanvas.toDataURL("image/jpeg", 0.92);
          const sliceHeightMm = (sliceHeight / canvas.width) * pdfImgWidth;
          if (!firstPage) pdf.addPage();
          firstPage = false;
          pdf.addImage(
            imgData,
            "JPEG",
            MARGIN_MM,
            MARGIN_MM,
            pdfImgWidth,
            sliceHeightMm
          );
          sliceStart += sliceHeight;
        }
      }
    } catch (err) {
      console.warn("[pdf-export] section failed:", err);
    }
  }

  opts.onProgress?.(sections.length, sections.length);
  pdf.save(opts.fileName);
  // intentionally unused
  void pxPerMm;
}

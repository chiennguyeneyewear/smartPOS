import { useEffect } from "react";
import { usePrintReceiptStore } from "@/stores/print-receipt-store";
import { usePrintSettingsStore } from "@/stores/print-settings-store";
import { InvoiceReceipt } from "./invoice-receipt";

// Renders the receipt only inside this hidden node; index.css's @media print
// rules hide everything else on the page so the printed output is just the
// receipt, regardless of which page (POS, Orders...) triggered it.
export function PrintReceiptRoot() {
  const { data, format, requestId } = usePrintReceiptStore();
  const copies = usePrintSettingsStore((s) => s.copies);

  useEffect(() => {
    if (!data || requestId === 0) return;
    const raf = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  if (!data) return null;

  return (
    <div id="print-receipt-root" className="hidden print:block">
      <style>{format === "thermal80" ? "@page { size: 80mm auto; margin: 0; }" : "@page { size: A5; margin: 10mm; }"}</style>
      {/* "Số bản in (Liên)" from print settings: each copy is forced onto its
          own page so a thermal cutter/A5 tray separates them correctly. */}
      {Array.from({ length: copies }, (_, i) => (
        <div key={i} style={i < copies - 1 ? { breakAfter: "page" } : undefined}>
          <InvoiceReceipt data={data} format={format} />
        </div>
      ))}
    </div>
  );
}

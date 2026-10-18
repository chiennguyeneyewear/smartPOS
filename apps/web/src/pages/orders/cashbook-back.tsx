import type { OpenBalanceLine } from "@/features/sales/api";

// Same shape as one A5 landscape page (210 x 148 mm) at the sheet's usual 1000px width, so the writing sits at
// the same size as on the front.
const PAGE_WIDTH = 1000;
const PAGE_MIN_HEIGHT = Math.round((PAGE_WIDTH * 148) / 210);

// name | phone | amount | day bought — spread across the page, each piece centred in its own space
const COLUMNS = "grid grid-cols-[1.5fr_1.2fr_1.6fr_0.7fr]";

// "18/10": day/month the customer bought, no leading zeros, like the hand-written sheet
function dayMonth(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(d)}/${Number(m)}`;
}

// 1000000 -> "1.000.000đ"
const dong = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

// The back of the day's thu-chi sheet: a plain blank page with only the customers who paid a deposit and still have a
// balance to pay, one written line each:  Anh Chiến   0977912316   Còn 1.000.000đ   18/10  (no table, no
// borders). On the day the customer picks the glasses up and pays the balance (the money itself goes on the front)
// the line is crossed out, and it is not on the next day's sheet any more.
// One page per branch: `data-back-page` lets the tab find every page to export/print.
export function CashbookBack({ lines }: { lines: OpenBalanceLine[] }) {
  return (
    <div
      data-back-page=""
      className="bg-white px-6 py-6 text-lg text-black"
      style={{ width: PAGE_WIDTH, minHeight: PAGE_MIN_HEIGHT }}
    >
      {lines.map((line) => (
        <div key={line.invoiceCode} className={`${COLUMNS} relative h-9 items-center text-center leading-9`}>
          <span className="whitespace-nowrap font-medium">{line.customerName}</span>
          <span className="whitespace-nowrap tabular-nums">{line.customerPhone}</span>
          <span className="whitespace-nowrap tabular-nums">{`Còn ${dong(line.amount)}`}</span>
          <span className="whitespace-nowrap tabular-nums">{dayMonth(line.boughtOn)}</span>
          {line.struck && (
            // paid today: one line struck through the whole written line
            <span className="pointer-events-none absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2 bg-black" />
          )}
        </div>
      ))}
    </div>
  );
}

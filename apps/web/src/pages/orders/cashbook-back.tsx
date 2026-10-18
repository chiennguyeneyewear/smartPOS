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
// the line is underlined, and it is not on the next day's sheet any more.
// One page per branch: `data-back-page` lets the tab find every page to export/print.
export function CashbookBack({ lines }: { lines: OpenBalanceLine[] }) {
  return (
    <div
      data-back-page=""
      className="bg-white px-6 py-6 text-lg text-black"
      style={{ width: PAGE_WIDTH, minHeight: PAGE_MIN_HEIGHT }}
    >
      {lines.map((line) => {
        // balance paid today: every piece of the line is underlined, right at the foot of the letters
        const underline = line.struck ? " underline decoration-2 underline-offset-2" : "";
        return (
          <div key={line.invoiceCode} className={`${COLUMNS} h-9 items-center text-center leading-9`}>
            <span className={`whitespace-nowrap font-medium${underline}`}>{line.customerName}</span>
            <span className={`whitespace-nowrap tabular-nums${underline}`}>{line.customerPhone}</span>
            <span className={`whitespace-nowrap tabular-nums${underline}`}>{`Còn ${dong(line.amount)}`}</span>
            <span className={`whitespace-nowrap tabular-nums${underline}`}>{dayMonth(line.boughtOn)}</span>
          </div>
        );
      })}
    </div>
  );
}

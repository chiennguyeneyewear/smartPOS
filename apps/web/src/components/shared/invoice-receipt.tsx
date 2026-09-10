import type { PaymentMethod } from "@smartpos/shared";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { ReceiptData, ReceiptFormat } from "@/stores/print-receipt-store";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Quẹt thẻ",
  DEBT: "Ghi nợ",
};

export function InvoiceReceipt({ data, format }: { data: ReceiptData; format: ReceiptFormat }) {
  const isThermal = format === "thermal80";
  const paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const change = paid - data.totalAmount;

  return (
    <div
      className="bg-white text-black"
      style={{
        width: isThermal ? "76mm" : "100%",
        fontSize: isThermal ? "11px" : "13px",
        fontFamily: "Arial, sans-serif",
        padding: isThermal ? "2mm" : 0,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: isThermal ? "2mm" : "4mm" }}>
        <div style={{ fontSize: isThermal ? "13px" : "18px", fontWeight: 700 }}>{data.storeName}</div>
        {data.storeAddress && <div>{data.storeAddress}</div>}
        {data.storePhone && <div>ĐT: {data.storePhone}</div>}
        <div style={{ fontSize: isThermal ? "12px" : "15px", fontWeight: 700, marginTop: isThermal ? "1.5mm" : "3mm" }}>
          HÓA ĐƠN BÁN HÀNG
        </div>
      </div>

      <div style={{ marginBottom: isThermal ? "2mm" : "3mm" }}>
        <div>
          Mã hóa đơn: <strong>{data.code}</strong>
        </div>
        <div>Thời gian: {formatDateTime(data.date)}</div>
        <div>Thu ngân: {data.cashierName}</div>
        {data.customerName && (
          <div>
            Khách hàng: {data.customerName}
            {data.customerPhone ? ` - ${data.customerPhone}` : ""}
          </div>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000" }}>
            <th style={{ textAlign: "left", padding: "1mm 0" }}>Tên hàng</th>
            <th style={{ textAlign: "center", padding: "1mm 0" }}>SL</th>
            <th style={{ textAlign: "right", padding: "1mm 0" }}>Đơn giá</th>
            {!isThermal && <th style={{ textAlign: "right", padding: "1mm 0" }}>Giảm giá</th>}
            <th style={{ textAlign: "right", padding: "1mm 0" }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i}>
              <td style={{ textAlign: "left", padding: "1mm 0" }}>{item.name}</td>
              <td style={{ textAlign: "center", padding: "1mm 0" }}>{item.quantity}</td>
              <td style={{ textAlign: "right", padding: "1mm 0" }}>{formatCurrency(item.unitPrice)}</td>
              {!isThermal && (
                <td style={{ textAlign: "right", padding: "1mm 0" }}>
                  {item.discount > 0 ? formatCurrency(item.discount) : "-"}
                </td>
              )}
              <td style={{ textAlign: "right", padding: "1mm 0" }}>{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", marginTop: "1.5mm", paddingTop: "1.5mm" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Tổng tiền hàng</span>
          <span>{formatCurrency(data.subTotal)}</span>
        </div>
        {data.discountAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Giảm giá hóa đơn</span>
            <span>{formatCurrency(data.discountAmount)}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: isThermal ? "13px" : "16px",
            fontWeight: 700,
            marginTop: "1mm",
          }}
        >
          <span>Tổng cộng</span>
          <span>{formatCurrency(data.totalAmount)}</span>
        </div>
        {data.payments.map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{METHOD_LABELS[p.method]}</span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {change > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tiền thừa trả khách</span>
            <span>{formatCurrency(change)}</span>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: isThermal ? "3mm" : "6mm" }}>Cảm ơn quý khách, hẹn gặp lại!</div>
    </div>
  );
}

import { Fragment } from "react";
import { formatCurrency } from "@/lib/utils";
import type { ReceiptData } from "@/stores/print-receipt-store";

// Mẫu hóa đơn thật của cửa hàng (mắt kính) — sao chép y chang bố cục/nội
// dung tĩnh (Lời dặn, Quý khách lưu ý, Đặt cọc/Còn, Hẹn giao kính...) từ
// file mẫu in gốc, chỉ thay các {biến} bằng dữ liệu hóa đơn thật.
export function InvoiceReceipt({ data }: { data: ReceiptData }) {
  const date = new Date(data.date);
  const gio = String(date.getHours()).padStart(2, "0");
  const phut = String(date.getMinutes()).padStart(2, "0");
  const ngay = date.getDate();
  const thang = date.getMonth() + 1;
  const nam = date.getFullYear();

  return (
    <div className="printBox bg-white text-black" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
      <table style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td style={{ fontSize: "11px", textAlign: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>{data.storeName}</span>
            </td>
          </tr>
          {data.storeAddress && (
            <tr>
              <td style={{ fontSize: "11px", textAlign: "center" }}>
                <span style={{ fontSize: "9px", fontWeight: "bold" }}>Đc: {data.storeAddress}</span>
              </td>
            </tr>
          )}
          {data.storePhone && (
            <tr>
              <td style={{ fontSize: "11px", textAlign: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: "bold" }}>PHẢN HỒI CHẤT LƯỢNG DỊCH VỤ {data.storePhone}</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ padding: "10px 0 0", textAlign: "center" }}>
        <strong style={{ fontSize: "12px" }}>HÓA ĐƠN BÁN HÀNG</strong>
      </div>

      <table style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td style={{ fontSize: "11px", textAlign: "center" }}>
              {gio}Giờ:{phut}phút - Ngày {ngay} tháng {thang} năm {nam}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ margin: "10px 0 15px", width: "100%" }}>
        <tbody>
          <tr>
            <td style={{ fontSize: "11px" }}>
              Khách hàng: <span style={{ fontSize: "16px" }}>{data.customerName || "Khách lẻ"}</span>
            </td>
          </tr>
          <tr>
            <td style={{ fontSize: "11px" }}>
              SĐT: <strong style={{ fontSize: "20px" }}>{data.customerPhone ?? ""}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ fontSize: "11px" }}>Số nhà :</td>
          </tr>
        </tbody>
      </table>

      <table cellPadding={3} style={{ width: "98%" }}>
        <tbody>
          <tr>
            <td style={{ borderBottom: "1px solid black", borderTop: "1px solid black", width: "35%" }}>
              <strong style={{ fontSize: "11px" }}>Đơn giá</strong>
            </td>
            <td style={{ borderBottom: "1px solid black", borderTop: "1px solid black", textAlign: "right", width: "30%" }}>
              <strong style={{ fontSize: "11px" }}>SL</strong>
            </td>
            <td style={{ borderBottom: "1px solid black", borderTop: "1px solid black", textAlign: "right" }}>
              <strong style={{ fontSize: "11px" }}>Thành tiền</strong>
            </td>
          </tr>
          {data.items.map((item, i) => (
            <Fragment key={i}>
              <tr>
                <td colSpan={3} style={{ paddingTop: "3px" }}>
                  <span style={{ fontSize: "12px" }}>{item.name}</span>
                </td>
              </tr>
              <tr>
                <td style={{ borderBottom: "1px dashed black" }}>
                  <span style={{ fontSize: "11px" }}>{item.discount > 0 ? formatCurrency(item.discount) : "0"}</span>
                </td>
                <td style={{ borderBottom: "1px dashed black", textAlign: "right" }}>
                  <span style={{ fontSize: "11px" }}>{item.quantity}</span>
                </td>
                <td style={{ borderBottom: "1px dashed black", textAlign: "right" }}>
                  <span style={{ fontSize: "11px" }}>{formatCurrency(item.lineTotal)}</span>
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>

      <table cellPadding={3} style={{ borderCollapse: "collapse", marginTop: "20px", width: "98%" }}>
        <tfoot>
          <tr>
            <td style={{ fontSize: "11px", fontWeight: "bold", textAlign: "right", whiteSpace: "nowrap" }}>
              Tổng thanh toán:
            </td>
            <td style={{ fontSize: "11px", fontWeight: "bold", textAlign: "right" }}>
              <strong style={{ fontSize: "16px" }}>{formatCurrency(data.totalAmount)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      <table cellPadding={1} cellSpacing={1} style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td>
              <strong style={{ fontSize: "12px" }}>LỜI DẶN</strong>
            </td>
            <td>
              <span style={{ fontSize: "12px" }}>+ Tập thích nghi độ kính mới từ 5 đến 10 ngày đầu</span>
            </td>
          </tr>
          <tr>
            <td>&nbsp;</td>
            <td>
              <span style={{ fontSize: "12px" }}>+ Đeo kính và lấy kính ra bằng 2 tay</span>
            </td>
          </tr>
          <tr>
            <td>&nbsp;</td>
            <td>
              <span style={{ fontSize: "12px" }}>
                + Lau kính bằng khăn và nước chuyên dụng ,<br />
                &nbsp;&nbsp;không lau bằng quần áo
              </span>
            </td>
          </tr>
          <tr>
            <td>&nbsp;</td>
            <td>
              <span style={{ fontSize: "12px" }}>+ Đo mắt định kỳ sau </span>
              <span style={{ fontSize: "22px" }}>6 tháng</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ textAlign: "center" }}>
        <strong>QÚY KHÁCH LƯU Ý</strong>
      </p>

      <p>
        - Các sản phẩm đã mua và đặt cọc sẽ không được hoàn trả tiền ,có thể đổi sang mẫu mã khác trong vòng 3 ngày kế
        từ khi mua và BẮT BUỘC mang theo hóa đơn khi đổi hàng,sản phẩm đổi cần bằng hoặc hơn giá trị đã mua, không
        trầy xước móp méo.
      </p>

      <p>
        - Bảo hành: Tròng kính khi mắt không thích nghi được theo số độ chỉ định của kỹ thuật viên trong vòng 10 ngày
        và xúc ốc, ve, gãy lò xo - vệ sinh kính hoàn toàn miễn phí.
      </p>

      <p>
        <strong>Đặt cọc&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Còn</strong>
      </p>

      <p>
        <span style={{ fontSize: "9px" }}>
          <strong>Hẹn ngày giao kính với khách</strong>
        </span>
      </p>

      <p>
        <span style={{ fontSize: "9px" }}>
          <strong>NV.................đã gọi điện khách tới nhận kính</strong>
        </span>
      </p>
    </div>
  );
}

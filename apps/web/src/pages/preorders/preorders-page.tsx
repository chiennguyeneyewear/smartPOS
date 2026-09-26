import { Fragment, useState } from "react";
import type { PaymentMethod, PreorderSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { PAYMENT_LABELS } from "@/lib/payment";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import {
  useCancelPreorder,
  useConfirmPreorderDeposit,
  useDeliverPreorder,
  usePreorders,
} from "@/features/preorders/hooks";

// Deposits held for longer than this get flagged, so orders nobody came back for don't sit forgotten.
export const WARN_AFTER_DAYS = 7;
export const ALERT_AFTER_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
export const daysOpen = (order: PreorderSummary) =>
  Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / DAY_MS));

const STATUS_FILTERS = [
  { value: "DEPOSITED", label: "Chờ giao" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "", label: "Tất cả" },
] as const;

function AgePill({ order }: { order: PreorderSummary }) {
  const days = daysOpen(order);
  const tone =
    order.status !== "DEPOSITED"
      ? "text-muted-foreground"
      : days >= ALERT_AFTER_DAYS
        ? "rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive"
        : days >= WARN_AFTER_DAYS
          ? "rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800"
          : "text-muted-foreground";
  return <span className={cn("text-xs", tone)}>{days === 0 ? "Hôm nay" : `${days} ngày`}</span>;
}

function DepositPill({ order }: { order: PreorderSummary }) {
  return order.depositMethod ? (
    <span>{PAYMENT_LABELS[order.depositMethod as PaymentMethod]}</span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Chờ xác nhận</span>
  );
}

function StatusPill({ order }: { order: PreorderSummary }) {
  if (order.status === "DELIVERED") {
    return <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Đã giao</span>;
  }
  if (order.status === "CANCELLED") {
    return <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Đã hủy</span>;
  }
  return <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Chờ giao</span>;
}

function ConfirmDepositDialog({ order, onClose }: { order: PreorderSummary | null; onClose: () => void }) {
  const confirm = useConfirmPreorderDeposit();
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER" | "CARD">("CASH");
  const [reference, setReference] = useState("");
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xác nhận tiền cọc {order?.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Khách đã cọc <span className="font-semibold">{formatCurrency(order?.depositAmount ?? 0)}</span>. Chọn cách khách
            đã đưa tiền cọc.
          </p>
          <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Tiền mặt</SelectItem>
              <SelectItem value="BANK_TRANSFER">Chuyển khoản</SelectItem>
              <SelectItem value="CARD">Quẹt thẻ</SelectItem>
            </SelectContent>
          </Select>
          {method === "BANK_TRANSFER" && (
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Mã giao dịch / nội dung chuyển khoản (nên nhập)"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bỏ qua
          </Button>
          <Button
            disabled={confirm.isPending}
            onClick={() =>
              order && confirm.mutate({ id: order.id, method, reference: reference.trim() || null }, { onSuccess: onClose })
            }
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The only place a discount is entered for a pre-order. It can't dig into the deposit already taken.
function DeliverDialog({ order, onClose }: { order: PreorderSummary | null; onClose: () => void }) {
  const deliver = useDeliverPreorder();
  const branchId = useAuthStore((s) => s.activeBranchId);
  const [discount, setDiscount] = useState("");
  const amount = parseMoney(discount);
  const maxDiscount = order ? order.subTotal - order.depositAmount : 0;
  const total = order ? order.subTotal - amount : 0;
  const owed = order ? total - order.depositAmount : 0;
  const tooMuch = amount > maxDiscount + 0.5;
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && (setDiscount(""), onClose())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Giao hàng {order?.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tổng tiền hàng</span>
            <span className="tabular-nums">{formatCurrency(order?.subTotal ?? 0)}</span>
          </div>
          <div className="space-y-1.5">
            <Label>Giảm giá (chỉ nhập được ở bước này)</Label>
            <MoneyInput value={discount} onChange={setDiscount} placeholder="0" />
            {tooMuch && (
              <p className="text-xs text-destructive">Giảm tối đa {formatCurrency(maxDiscount)} (không vượt quá số còn thiếu)</p>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Khách cần trả</span>
            <span className="tabular-nums">{formatCurrency(Math.max(0, total))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Đã cọc</span>
            <span className="tabular-nums">- {formatCurrency(order?.depositAmount ?? 0)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Còn phải thu</span>
            <span className="tabular-nums">{formatCurrency(Math.max(0, owed))}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Bấm Giao hàng sẽ ra hóa đơn ngay. Cách khách trả phần còn lại xác nhận sau ở mục Đơn hàng. Hóa đơn ra rồi thì
            không giảm giá được nữa.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => (setDiscount(""), onClose())}>
            Bỏ qua
          </Button>
          <Button
            disabled={deliver.isPending || tooMuch || !branchId}
            onClick={() =>
              order &&
              branchId &&
              deliver.mutate(
                { id: order.id, branchId, discountAmount: amount },
                { onSuccess: () => (setDiscount(""), onClose()) },
              )
            }
          >
            {deliver.isPending ? "Đang xử lý..." : "Giao hàng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ order, onClose }: { order: PreorderSummary | null; onClose: () => void }) {
  const cancel = useCancelPreorder();
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState("");
  const amount = parseMoney(refund);
  const invalid = !reason.trim() || amount > (order?.depositAmount ?? 0);
  function close() {
    setReason("");
    setRefund("");
    onClose();
  }
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hủy đơn {order?.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Khách đã cọc {formatCurrency(order?.depositAmount ?? 0)}. Nhập số tiền hoàn lại cho khách (0 nếu giữ cọc).
          </p>
          <div className="space-y-1.5">
            <Label>Hoàn cọc</Label>
            <MoneyInput value={refund} onChange={setRefund} placeholder="0" />
            {amount > (order?.depositAmount ?? 0) && <p className="text-xs text-destructive">Không được lớn hơn tiền cọc</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Lý do hủy</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Bỏ qua
          </Button>
          <Button
            variant="destructive"
            disabled={cancel.isPending || invalid}
            onClick={() =>
              order && cancel.mutate({ id: order.id, reason: reason.trim(), refundAmount: amount }, { onSuccess: close })
            }
          >
            Hủy đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PreordersPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const userId = useAuthStore((s) => s.user?.id);
  const [status, setStatus] = useState<string>("DEPOSITED");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [depositFor, setDepositFor] = useState<PreorderSummary | null>(null);
  const [deliverFor, setDeliverFor] = useState<PreorderSummary | null>(null);
  const [cancelFor, setCancelFor] = useState<PreorderSummary | null>(null);
  const { data, isLoading } = usePreorders({ status: status || undefined });
  const orders = data ?? [];

  const holding = orders.filter((o) => o.status === "DEPOSITED");
  const holdingTotal = holding.reduce((sum, o) => sum + o.depositAmount, 0);
  const overdue = holding.filter((o) => daysOpen(o) >= ALERT_AFTER_DAYS).length;

  const vnDay = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  const canConfirmDeposit = (o: PreorderSummary) =>
    o.status === "DEPOSITED" && (isAdmin || (o.createdById === userId && vnDay(o.createdAt) === vnDay(new Date().toISOString())));

  return (
    <div className="space-y-4">
      <PageHeader title="Đặt hàng" description="Đơn khách đặt cọc, chờ hàng về để giao" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm transition-colors",
                status === f.value ? "border-primary bg-primary/10 font-medium text-primary" : "border-input text-muted-foreground hover:bg-accent",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {holding.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Đang giữ cọc <span className="font-semibold text-foreground">{holding.length} đơn</span> ·{" "}
            <span className="font-semibold text-foreground">{formatCurrency(holdingTotal)}</span>
            {overdue > 0 && <span className="ml-2 font-medium text-destructive">{overdue} đơn quá {ALERT_AFTER_DAYS} ngày</span>}
          </p>
        )}
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-sm font-semibold text-muted-foreground">
            <tr>
              <th className="p-3">Mã đơn</th>
              <th className="p-3">Ngày đặt</th>
              <th className="p-3">Khách hàng</th>
              <th className="p-3 text-right">Tổng đơn</th>
              <th className="p-3 text-right">Đã cọc</th>
              <th className="p-3 text-right">Còn lại</th>
              <th className="p-3">Tiền cọc</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Chưa có đơn nào. Ở màn hình Bán hàng, chọn khách rồi bấm ĐẶT CỌC.
                </td>
              </tr>
            )}
            {orders.map((o) => {
              const open = expandedId === o.id;
              return (
                <Fragment key={o.id}>
                  <tr
                    className={cn("cursor-pointer border-t hover:bg-accent", open && "bg-primary/10")}
                    onClick={() => setExpandedId(open ? null : o.id)}
                  >
                    <td className="whitespace-nowrap p-3 font-medium">{o.code}</td>
                    <td className="whitespace-nowrap p-3">
                      <div className="leading-tight">
                        <p>{formatDateTime(o.createdAt)}</p>
                        <AgePill order={o} />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="leading-tight">
                        <p className="font-medium">{o.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{o.customer.phone ?? o.customer.code}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap p-3 text-right tabular-nums">{o.subTotal.toLocaleString("en-US")}</td>
                    <td className="whitespace-nowrap p-3 text-right tabular-nums">{o.depositAmount.toLocaleString("en-US")}</td>
                    <td className="whitespace-nowrap p-3 text-right font-medium tabular-nums">
                      {(o.subTotal - o.depositAmount).toLocaleString("en-US")}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      <DepositPill order={o} />
                    </td>
                    <td className="whitespace-nowrap p-3">
                      <StatusPill order={o} />
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-t bg-primary/5">
                      <td colSpan={8} className="p-4">
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <table className="w-full max-w-2xl text-sm">
                            <tbody>
                              {o.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-1 pr-3 text-muted-foreground">{item.product.sku}</td>
                                  <td className="py-1 pr-3">{item.product.name}</td>
                                  <td className="py-1 pr-3 text-right tabular-nums">x{item.quantity}</td>
                                  <td className="py-1 text-right tabular-nums">{(item.quantity * item.unitPrice).toLocaleString("en-US")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {o.prescription && (
                            <p>
                              <span className="text-muted-foreground">Thông số độ kính: </span>
                              {o.prescription}
                            </p>
                          )}
                          {o.note && (
                            <p>
                              <span className="text-muted-foreground">Ghi chú: </span>
                              {o.note}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Người lập: {o.createdByName}
                            {o.status === "DELIVERED" && o.invoiceCode && ` · Hóa đơn ${o.invoiceCode}`}
                            {o.status === "CANCELLED" &&
                              ` · Đã hủy: ${o.cancelReason ?? ""} · Hoàn cọc ${formatCurrency(o.refundAmount)}`}
                          </p>
                          {o.status === "DEPOSITED" && (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => setDeliverFor(o)}>
                                Giao hàng
                              </Button>
                              {canConfirmDeposit(o) && (
                                <Button size="sm" variant="outline" onClick={() => setDepositFor(o)}>
                                  {o.depositMethod ? "Sửa tiền cọc" : "Xác nhận tiền cọc"}
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive text-destructive hover:bg-destructive/5"
                                  onClick={() => setCancelFor(o)}
                                >
                                  Hủy đơn
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDepositDialog order={depositFor} onClose={() => setDepositFor(null)} />
      <DeliverDialog order={deliverFor} onClose={() => setDeliverFor(null)} />
      <CancelDialog order={cancelFor} onClose={() => setCancelFor(null)} />
    </div>
  );
}

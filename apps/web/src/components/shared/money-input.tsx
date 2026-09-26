import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// "3,000,000" -> 3000000 (blank or junk -> 0)
export function parseMoney(text: string): number {
  const n = Number(text.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: number | string): string {
  const digits = String(value).replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Amount field that shows thousands commas as you type; the parent keeps the formatted string.
export function MoneyInput({
  value,
  onChange,
  className,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <Input
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(formatMoney(e.target.value))}
      className={cn("text-right", className)}
      {...props}
    />
  );
}

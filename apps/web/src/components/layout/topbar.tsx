import { UserMenu } from "@/components/shared/user-menu";
import { InvoiceNotifications } from "./invoice-notifications";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b bg-card px-4">
      <InvoiceNotifications />
      <UserMenu />
    </header>
  );
}

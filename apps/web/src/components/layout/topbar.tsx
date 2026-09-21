import { UserMenu } from "@/components/shared/user-menu";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-end border-b bg-card px-4">
      <UserMenu />
    </header>
  );
}

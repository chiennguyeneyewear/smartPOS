import { Outlet, Link } from "react-router-dom";
import { LayoutGrid, ChevronDown, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PosLayout() {
  const user = useAuthStore((s) => s.user);
  const branches = user?.branches ?? [];
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const setActiveBranch = useAuthStore((s) => s.setActiveBranch);
  const logout = useLogout();
  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-3">
        <div className="flex items-center gap-3">
          <Link
            to="/inventory/products"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            title="Quay lại quản lý"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
              S
            </div>
            <span className="font-semibold text-foreground">SmartPOS</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                {activeBranch?.name ?? "Chọn chi nhánh"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Chi nhánh</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {branches.map((branch) => (
                <DropdownMenuItem key={branch.id} onSelect={() => setActiveBranch(branch.id)}>
                  {branch.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                <User className="h-3.5 w-3.5" />
                {user?.fullName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => logout.mutate()}>
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/app/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { PosLayout } from "@/components/layout/pos-layout";
import { LoginPage } from "@/pages/auth/login-page";
import { DashboardPage } from "@/pages/dashboard/dashboard-page";
import { PosPage } from "@/pages/pos/pos-page";
import { ProductsPage } from "@/pages/inventory/products-page";
import { StockPage } from "@/pages/inventory/stock-page";
import { MovementsPage } from "@/pages/inventory/movements-page";
import { CustomersPage } from "@/pages/customers/customers-page";
import { SuppliersPage } from "@/pages/suppliers/suppliers-page";
import { ReportsPage } from "@/pages/reports/reports-page";
import { UsersPage } from "@/pages/settings/users-page";
import { BranchesPage } from "@/pages/settings/branches-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PosLayout />}>
          <Route path="/pos" element={<PosPage />} />
        </Route>

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory/products" element={<ProductsPage />} />
          <Route path="/inventory/stock" element={<StockPage />} />
          <Route path="/inventory/movements" element={<MovementsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings/users" element={<UsersPage />} />
          <Route path="/settings/branches" element={<BranchesPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}

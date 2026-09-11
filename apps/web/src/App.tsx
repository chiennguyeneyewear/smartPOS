import { Navigate, Route, Routes } from "react-router-dom";
import { MENU_ITEMS } from "@smartpos/shared";
import { ProtectedRoute } from "@/app/protected-route";
import { MenuGuard } from "@/app/menu-guard";
import { AppShell } from "@/components/layout/app-shell";
import { PosLayout } from "@/components/layout/pos-layout";
import { LoginPage } from "@/pages/auth/login-page";
import { DashboardPage } from "@/pages/dashboard/dashboard-page";
import { PosPage } from "@/pages/pos/pos-page";
import { ProductsPage } from "@/pages/inventory/products-page";
import { StockPage } from "@/pages/inventory/stock-page";
import { MovementsPage } from "@/pages/inventory/movements-page";
import { CustomersPage } from "@/pages/customers/customers-page";
import { OrdersPage } from "@/pages/orders/orders-page";
import { ReportsPage } from "@/pages/reports/reports-page";
import { AnalyticsProductsPage } from "@/pages/reports/analytics-products-page";
import { AnalyticsCustomersPage } from "@/pages/reports/analytics-customers-page";
import { AnalyticsPerformancePage } from "@/pages/reports/analytics-performance-page";
import { EndOfDayReportPage } from "@/pages/reports/end-of-day-report-page";
import { SalesReportPage } from "@/pages/reports/sales-report-page";
import { OrdersReportPage } from "@/pages/reports/orders-report-page";
import { ProductsReportPage } from "@/pages/reports/products-report-page";
import { CustomersReportPage } from "@/pages/reports/customers-report-page";
import { UsersPage } from "@/pages/settings/users-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PosLayout />}>
          <Route
            path="/pos"
            element={
              <MenuGuard menuKey={MENU_ITEMS.POS}>
                <PosPage />
              </MenuGuard>
            }
          />
        </Route>

        <Route element={<AppShell />}>
          <Route
            path="/dashboard"
            element={
              <MenuGuard menuKey={MENU_ITEMS.DASHBOARD}>
                <DashboardPage />
              </MenuGuard>
            }
          />
          <Route
            path="/inventory/products"
            element={
              <MenuGuard menuKey={MENU_ITEMS.PRODUCTS}>
                <ProductsPage />
              </MenuGuard>
            }
          />
          <Route
            path="/inventory/stock"
            element={
              <MenuGuard menuKey={MENU_ITEMS.PRODUCTS}>
                <StockPage />
              </MenuGuard>
            }
          />
          <Route
            path="/inventory/movements"
            element={
              <MenuGuard menuKey={MENU_ITEMS.PRODUCTS}>
                <MovementsPage />
              </MenuGuard>
            }
          />
          <Route
            path="/customers"
            element={
              <MenuGuard menuKey={MENU_ITEMS.CUSTOMERS}>
                <CustomersPage />
              </MenuGuard>
            }
          />
          <Route
            path="/orders"
            element={
              <MenuGuard menuKey={MENU_ITEMS.ORDERS}>
                <OrdersPage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <ReportsPage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports/category-performance"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <AnalyticsProductsPage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports/customer-insights"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <AnalyticsCustomersPage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports/seller-performance"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <AnalyticsPerformancePage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports/end-of-day"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <EndOfDayReportPage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports/sales"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <SalesReportPage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports/orders"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <OrdersReportPage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports/products"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <ProductsReportPage />
              </MenuGuard>
            }
          />
          <Route
            path="/reports/customers"
            element={
              <MenuGuard menuKey={MENU_ITEMS.REPORTS}>
                <CustomersReportPage />
              </MenuGuard>
            }
          />
          <Route
            path="/settings/users"
            element={
              <MenuGuard menuKey={MENU_ITEMS.USERS}>
                <UsersPage />
              </MenuGuard>
            }
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}

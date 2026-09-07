import { Outlet } from "react-router-dom";

export function PosLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

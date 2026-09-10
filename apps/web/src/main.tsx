import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "@/app/query-client";
import { Toaster } from "@/components/ui/toaster";
import { PrintReceiptRoot } from "@/components/shared/print-receipt-root";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster />
        <PrintReceiptRoot />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

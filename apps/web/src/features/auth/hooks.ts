import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { loginRequest, logoutRequest } from "./api";

export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      setAccessToken(data.accessToken, data.user);
      navigate("/pos", { replace: true });
    },
    onError: () => {
      toast({ title: "Đăng nhập thất bại", description: "Email hoặc mật khẩu không đúng", variant: "destructive" });
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      logout();
      navigate("/login", { replace: true });
    },
  });
}

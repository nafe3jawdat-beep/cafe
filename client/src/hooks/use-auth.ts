import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { StaffUser } from "../types";

export function useAuth() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: async () => (await api.me()).user,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: ({ user }) => {
      queryClient.setQueryData<StaffUser>(["auth"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      queryClient.clear();
    },
  });
}

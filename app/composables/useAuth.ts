import type { AuthUser } from "~/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const user = useState<AuthUser | null>("auth-user", () => null);
  const token = useState<string | null>("auth-token", () => null);
  const isLoading = useState<boolean>("auth-loading", () => true);

  const isAuthenticated = computed(() => !!user.value && !!token.value);

  const setAuth = (authUser: AuthUser, authToken: string) => {
    user.value = authUser;
    token.value = authToken;
    if (import.meta.client) {
      localStorage.setItem("auth-token", authToken);
      localStorage.setItem("auth-user", JSON.stringify(authUser));
    }
  };

  const clearAuth = () => {
    user.value = null;
    token.value = null;
    if (import.meta.client) {
      localStorage.removeItem("auth-token");
      localStorage.removeItem("auth-user");
    }
  };

  const initAuth = async () => {
    isLoading.value = true;

    if (import.meta.client) {
      const storedToken = localStorage.getItem("auth-token");
      const storedUser = localStorage.getItem("auth-user");

      if (storedToken && storedUser) {
        token.value = storedToken;
        try {
          user.value = JSON.parse(storedUser);

          // Verify token is still valid
          const { data, error } = await useFetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (error.value || !data.value?.success) {
            clearAuth();
          } else {
            user.value = data.value.data as AuthUser;
          }
        } catch {
          clearAuth();
        }
      }
    }

    isLoading.value = false;
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await useFetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    if (error.value) {
      throw new Error(error.value.data?.message || "Login gagal");
    }

    if (data.value?.success && data.value.data) {
      setAuth(data.value.data.user, data.value.data.token);
      return data.value.data.user;
    }

    throw new Error("Login gagal");
  };

  const logout = async () => {
    if (token.value) {
      await useFetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });
    }
    clearAuth();
    navigateTo("/login");
  };

  const hasRole = (roles: AuthUser["role"][]) => {
    return user.value ? roles.includes(user.value.role) : false;
  };

  const isAdmin = computed(() => user.value?.role === "ADMIN");
  const isOps = computed(() => user.value?.role === "OPS");
  const isUser = computed(() => user.value?.role === "USER");

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isAdmin,
    isOps,
    isUser,
    setAuth,
    clearAuth,
    initAuth,
    login,
    logout,
    hasRole,
  };
};

export const useApi = () => {
  const { token } = useAuth();

  const api = async <T>(
    url: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: Record<string, unknown> | unknown[];
      query?: Record<string, unknown>;
    } = {}
  ): Promise<{ data: T | null; error: string | null }> => {
    try {
      const response = await $fetch(url, {
        method: options.method || "GET",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
          "Content-Type": "application/json",
        },
        body: options.body as Record<string, unknown> | undefined,
        query: options.query,
      });

      return { data: response as T, error: null };
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      const message = err.data?.message || err.message || "Network error";
      return { data: null, error: message };
    }
  };

  const get = <T>(url: string, query?: Record<string, unknown>) =>
    api<T>(url, { method: "GET", query });

  const post = <T>(url: string, body?: Record<string, unknown> | unknown[]) =>
    api<T>(url, { method: "POST", body });

  const put = <T>(url: string, body?: Record<string, unknown> | unknown[]) =>
    api<T>(url, { method: "PUT", body });

  const del = <T>(url: string) => api<T>(url, { method: "DELETE" });

  return {
    api,
    get,
    post,
    put,
    del,
  };
};

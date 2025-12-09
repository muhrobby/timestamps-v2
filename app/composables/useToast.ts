interface ToastOptions {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
}

export const useToast = () => {
  const toasts = useState<Toast[]>("toasts", () => []);

  const show = (options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = {
      id,
      ...options,
      duration: options.duration || 5000,
    };

    toasts.value.push(toast);

    // Auto remove after duration
    setTimeout(() => {
      remove(id);
    }, toast.duration);

    return id;
  };

  const remove = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  const success = (title: string, message?: string) => {
    return show({ type: "success", title, message });
  };

  const error = (title: string, message?: string) => {
    return show({ type: "error", title, message });
  };

  const warning = (title: string, message?: string) => {
    return show({ type: "warning", title, message });
  };

  const info = (title: string, message?: string) => {
    return show({ type: "info", title, message });
  };

  return {
    toasts,
    show,
    remove,
    success,
    error,
    warning,
    info,
  };
};

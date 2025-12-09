import type { UploadProgress } from "~/types";

interface UploadItem extends UploadProgress {
  packingRecordId: string;
}

export const useUploadProgress = () => {
  const items = useState<UploadItem[]>("upload-progress", () => []);
  const { token } = useAuth();
  const toast = useToast();

  let pollingInterval: NodeJS.Timeout | null = null;

  const addItem = (item: UploadItem) => {
    items.value.push(item);
    startPolling();
  };

  const updateItem = (imageId: string, updates: Partial<UploadItem>) => {
    const index = items.value.findIndex((i) => i.imageId === imageId);
    if (index > -1) {
      const currentItem = items.value[index];
      if (currentItem) {
        items.value[index] = { ...currentItem, ...updates };

        // Show toast on completion or failure
        if (updates.status === "COMPLETED") {
          toast.success("Upload selesai", currentItem.fileName);
          // Remove after showing
          setTimeout(() => removeItem(imageId), 3000);
        } else if (updates.status === "FAILED") {
          toast.error("Upload gagal", currentItem.fileName);
        }
      }
    }
  };

  const removeItem = (imageId: string) => {
    const index = items.value.findIndex((i) => i.imageId === imageId);
    if (index > -1) {
      items.value.splice(index, 1);
    }

    // Stop polling if no items left
    if (items.value.length === 0) {
      stopPolling();
    }
  };

  const startPolling = () => {
    if (pollingInterval) return;

    pollingInterval = setInterval(async () => {
      const pendingItems = items.value.filter(
        (i) => i.status === "PENDING" || i.status === "UPLOADING"
      );

      if (pendingItems.length === 0) {
        stopPolling();
        return;
      }

      const ids = pendingItems.map((i) => i.imageId).join(",");

      try {
        const response = await $fetch<{
          success: boolean;
          data: UploadProgress[];
        }>(`/api/packing/upload-status?ids=${ids}`, {
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        });

        if (response.success && response.data) {
          for (const update of response.data) {
            updateItem(update.imageId, {
              status: update.status,
              progress: update.progress,
              error: update.error,
            });
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  const pendingCount = computed(
    () =>
      items.value.filter(
        (i) => i.status === "PENDING" || i.status === "UPLOADING"
      ).length
  );

  const completedCount = computed(
    () => items.value.filter((i) => i.status === "COMPLETED").length
  );

  const failedCount = computed(
    () => items.value.filter((i) => i.status === "FAILED").length
  );

  const overallProgress = computed(() => {
    if (items.value.length === 0) return 0;
    const total = items.value.reduce((sum, i) => sum + i.progress, 0);
    return Math.round(total / items.value.length);
  });

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    startPolling,
    stopPolling,
    pendingCount,
    completedCount,
    failedCount,
    overallProgress,
  };
};

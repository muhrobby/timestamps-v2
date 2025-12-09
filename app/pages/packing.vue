<script setup lang="ts">
import type { PackingRecord, PackingImage } from "~/types";

interface PendingPhoto {
  id: string;
  file: File;
  url: string;
  order: number;
  fileName: string;
  timestamp?: string;
}

definePageMeta({
  layout: "default",
});

const { token, user } = useAuth();
const toast = useToast();
const { get, post, put } = useApi();
const {
  isOnline,
  saveDraft,
  loadDrafts,
  getDraft,
  deleteDraft,
  draftPhotosToFiles,
  drafts,
  isLoading: isDraftLoading,
} = useOfflineDraft();

// Form state
const invoiceNumber = ref("");
const notes = ref("");
const isScannerOpen = ref(false);
const isCreating = ref(false);
const currentRecord = ref<PackingRecord | null>(null);
const beforeImages = ref<PackingImage[]>([]);
const afterImages = ref<PackingImage[]>([]);
const useCamera = ref(true); // Toggle untuk memilih kamera atau upload file

// Photo preview state
const isPreviewOpen = ref(false);
const previewPhoto = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const previewType = ref<"BEFORE" | "AFTER">("BEFORE");
const cameraKey = ref(0); // Key to force camera component restart

// Batch photo collection (belum diupload)
const pendingBeforePhotos = ref<PendingPhoto[]>([]); // Max 5
const pendingAfterPhotos = ref<PendingPhoto[]>([]); // Max 5
const isUploadingAll = ref(false);
const uploadProgress = ref({ current: 0, total: 0 });
const isReordering = ref(false);

// Wizard Steps
const currentWizardStep = ref(1);
const wizardSteps = computed(() => [
  {
    id: 1,
    title: "Invoice",
    description: "Input nomor invoice",
    completed: !!currentRecord.value,
  },
  {
    id: 2,
    title: "Foto Before",
    description: `${beforeImages.value.length}/5 foto`,
    completed:
      beforeImages.value.length > 0 && pendingBeforePhotos.value.length === 0,
  },
  {
    id: 3,
    title: "Foto After",
    description: `${afterImages.value.length}/5 foto`,
    completed:
      afterImages.value.length > 0 && pendingAfterPhotos.value.length === 0,
  },
  {
    id: 4,
    title: "Selesai",
    description: "Review & submit",
    completed: false,
  },
]);

// Settings
const settings = ref({
  logoUrl: "",
  logoPosition: "top-right",
  timestampPosition: "bottom-right",
  showAddress: true,
  address: "",
  timestampFormat: "DD/MM/YYYY HH:mm:ss",
});

const currentDateTime = ref("");

// Update current time
const updateDateTime = () => {
  const now = new Date();
  currentDateTime.value = now.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

let timeInterval: NodeJS.Timeout | null = null;

onMounted(() => {
  updateDateTime();
  timeInterval = setInterval(updateDateTime, 1000);
  fetchSettings();

  // Restore current record from localStorage if exists
  const savedRecord = localStorage.getItem("currentPackingRecord");
  if (savedRecord) {
    try {
      currentRecord.value = JSON.parse(savedRecord);
    } catch (err) {
      console.error("Failed to restore packing record:", err);
      localStorage.removeItem("currentPackingRecord");
    }
  }
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});

const fetchSettings = async () => {
  const { data } = await get<Record<string, unknown>>("/api/settings");
  if (data) {
    settings.value = {
      logoUrl: (data.logoUrl as string) || "",
      logoPosition: (data.logoPosition as string) || "top-right",
      timestampPosition: (data.timestampPosition as string) || "bottom-right",
      showAddress: data.showAddress !== false,
      address: (data.address as string) || "",
      timestampFormat:
        (data.timestampFormat as string) || "DD/MM/YYYY HH:mm:ss",
    };
  }
};

const handleBarcodeScan = (code: string) => {
  invoiceNumber.value = code;
  toast.success("Barcode terscan", code);
};

const createPackingRecord = async () => {
  if (!invoiceNumber.value.trim()) {
    toast.error("Error", "Invoice number harus diisi");
    return;
  }

  isCreating.value = true;

  const { data, error } = await post<PackingRecord>("/api/packing", {
    invoiceNumber: invoiceNumber.value,
    notes: notes.value,
  });

  isCreating.value = false;

  if (error) {
    toast.error("Gagal", error);
    return;
  }

  if (data && (data as any).data) {
    // Backend return { success, data: record, message }
    const record = (data as any).data;
    currentRecord.value = record;
    // Save to localStorage for persistence across refreshes
    localStorage.setItem("currentPackingRecord", JSON.stringify(record));
    toast.success("Berhasil", "Record packing berhasil dibuat");
    // Move to next step
    currentWizardStep.value = 2;
  }
};

const goToStep = (stepId: number) => {
  // Validate before moving to next step
  if (stepId === 2 && !currentRecord.value) {
    toast.error("Error", "Buat record packing terlebih dahulu");
    return;
  }
  if (
    stepId === 3 &&
    beforeImages.value.length === 0 &&
    pendingBeforePhotos.value.length === 0
  ) {
    toast.warning("Perhatian", "Sebaiknya ambil foto BEFORE terlebih dahulu");
  }
  currentWizardStep.value = stepId;
};

const handleImageUploaded = (imageId: string, type: "BEFORE" | "AFTER") => {
  // Refresh images after upload
  refreshImages();
};

const handlePhotoTaken = async (file: File, type: "BEFORE" | "AFTER") => {
  if (!currentRecord.value) {
    toast.error("Error", "Tidak ada record packing aktif");
    return;
  }

  // Langsung simpan foto tanpa konfirmasi
  const timestamp = new Date().toISOString();
  const uniqueId = `pending-${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}`;

  if (type === "BEFORE") {
    // Check if already at max before taking photo
    if (pendingBeforePhotos.value.length >= 5) {
      toast.error("Error", "Maksimal 5 foto BEFORE sudah tercapai");
      return;
    }

    // Save photo immediately
    pendingBeforePhotos.value.push({
      id: uniqueId,
      file: file,
      url: URL.createObjectURL(file),
      order: pendingBeforePhotos.value.length + 1,
      fileName: file.name,
      timestamp,
    });

    toast.success(
      "Tersimpan",
      `Foto BEFORE ${pendingBeforePhotos.value.length}/5 tersimpan`
    );

    // ONLY close camera if NOW reached 5 photos (after push)
    if (pendingBeforePhotos.value.length >= 5) {
      setTimeout(() => {
        cameraKey.value++;
        toast.info(
          "Penuh",
          "5 foto BEFORE tersimpan. Kamera ditutup otomatis."
        );
      }, 300);
    }
  } else {
    // Check if already at max before taking photo
    if (pendingAfterPhotos.value.length >= 5) {
      toast.error("Error", "Maksimal 5 foto AFTER sudah tercapai");
      return;
    }

    // Save photo immediately
    pendingAfterPhotos.value.push({
      id: uniqueId,
      file: file,
      url: URL.createObjectURL(file),
      order: pendingAfterPhotos.value.length + 1,
      fileName: file.name,
      timestamp,
    });

    toast.success(
      "Tersimpan",
      `Foto AFTER ${pendingAfterPhotos.value.length}/5 tersimpan`
    );

    // ONLY close camera if NOW reached 5 photos (after push)
    if (pendingAfterPhotos.value.length >= 5) {
      setTimeout(() => {
        cameraKey.value++;
        toast.info("Penuh", "5 foto AFTER tersimpan. Kamera ditutup otomatis.");
      }, 300);
    }
  }

  // Kamera tetap buka sampai max photos tercapai
};

const confirmPhoto = () => {
  if (!previewPhoto.value || !previewUrl.value) return;

  const timestamp = new Date().toISOString();
  const uniqueId = `pending-${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}`;

  // Add to pending list based on type
  if (previewType.value === "BEFORE") {
    if (pendingBeforePhotos.value.length >= 5) {
      toast.error("Error", "Maksimal 5 foto BEFORE");
      return;
    }
    pendingBeforePhotos.value.push({
      id: uniqueId,
      file: previewPhoto.value,
      url: previewUrl.value,
      order: pendingBeforePhotos.value.length + 1,
      fileName: previewPhoto.value.name,
      timestamp,
    });
    toast.success(
      "Tersimpan",
      `Foto BEFORE ${pendingBeforePhotos.value.length}/5 ditambahkan`
    );
  } else {
    if (pendingAfterPhotos.value.length >= 5) {
      toast.error("Error", "Maksimal 5 foto AFTER");
      return;
    }
    const timestamp = new Date().toISOString();
    const uniqueId = `pending-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;
    pendingAfterPhotos.value.push({
      id: uniqueId,
      file: previewPhoto.value,
      url: previewUrl.value,
      order: pendingAfterPhotos.value.length + 1,
      fileName: previewPhoto.value.name,
      timestamp,
    });
    toast.success(
      "Tersimpan",
      `Foto AFTER ${pendingAfterPhotos.value.length}/5 ditambahkan`
    );
  }

  // Reset preview and restart camera
  previewPhoto.value = null;
  previewUrl.value = null;
  isPreviewOpen.value = false;
  cameraKey.value++;
};

const closePreview = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewPhoto.value = null;
  previewUrl.value = null;
  isPreviewOpen.value = false;
  // Force camera restart to allow retake
  cameraKey.value++;
};

const removePendingPhoto = (type: "BEFORE" | "AFTER", index: number) => {
  if (type === "BEFORE") {
    const photo = pendingBeforePhotos.value[index];
    if (photo) URL.revokeObjectURL(photo.url);
    pendingBeforePhotos.value.splice(index, 1);
    // Update order numbers
    pendingBeforePhotos.value = pendingBeforePhotos.value.map((p, i) => ({
      ...p,
      order: i + 1,
    }));
    toast.success("Dihapus", "Foto BEFORE dihapus");
  } else {
    const photo = pendingAfterPhotos.value[index];
    if (photo) URL.revokeObjectURL(photo.url);
    pendingAfterPhotos.value.splice(index, 1);
    // Update order numbers
    pendingAfterPhotos.value = pendingAfterPhotos.value.map((p, i) => ({
      ...p,
      order: i + 1,
    }));
    toast.success("Dihapus", "Foto AFTER dihapus");
  }
};

const removePendingPhotoById = (type: "BEFORE" | "AFTER", id: string) => {
  if (type === "BEFORE") {
    const photo = pendingBeforePhotos.value.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    pendingBeforePhotos.value = pendingBeforePhotos.value
      .filter((p) => p.id !== id)
      .map((p, i) => ({ ...p, order: i + 1 }));
    toast.success("Dihapus", "Foto BEFORE dihapus");
  } else {
    const photo = pendingAfterPhotos.value.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    pendingAfterPhotos.value = pendingAfterPhotos.value
      .filter((p) => p.id !== id)
      .map((p, i) => ({ ...p, order: i + 1 }));
    toast.success("Dihapus", "Foto AFTER dihapus");
  }
};

const handleReorder = <T extends { id: string; order: number }>(
  type: "BEFORE" | "AFTER",
  items: T[]
) => {
  if (type === "BEFORE") {
    pendingBeforePhotos.value = items as unknown as PendingPhoto[];
  } else {
    pendingAfterPhotos.value = items as unknown as PendingPhoto[];
  }
  toast.success("Diurutkan", `Urutan foto ${type} berhasil diubah`);
};

const uploadAllPhotos = async () => {
  // Validasi foto tersedia
  if (
    pendingBeforePhotos.value.length === 0 &&
    pendingAfterPhotos.value.length === 0
  ) {
    toast.error("Error", "Tidak ada foto untuk diupload");
    return;
  }

  // Jika belum ada record, buat dulu
  if (!currentRecord.value) {
    if (!invoiceNumber.value.trim()) {
      toast.error("Error", "Invoice Number harus diisi untuk membuat record");
      return;
    }

    toast.info("Membuat Record", "Membuat record packing terlebih dahulu...");

    const { data, error } = await post<PackingRecord>("/api/packing", {
      invoiceNumber: invoiceNumber.value,
      notes: notes.value,
    });

    if (error || !data) {
      toast.error("Gagal", error || "Gagal membuat record packing");
      return;
    }

    // Backend return { success, data: record, message }
    const record = (data as any).data;
    currentRecord.value = record;
    localStorage.setItem("currentPackingRecord", JSON.stringify(record));
    toast.success("Berhasil", "Record packing berhasil dibuat");
  }

  // Validasi record ID exists
  if (!currentRecord.value?.id) {
    console.error("❌ Current Record Invalid:", currentRecord.value);
    toast.error(
      "Error",
      "Record ID tidak valid. Silakan refresh halaman dan coba lagi."
    );
    return;
  }

  // Initialize upload retry composable
  const { uploadFileWithRetry } = useUploadRetry({
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 15000,
    backoffMultiplier: 2,
  });

  isUploadingAll.value = true;
  const allPhotos = [
    ...pendingBeforePhotos.value.map((p) => ({
      ...p,
      type: "BEFORE" as const,
    })),
    ...pendingAfterPhotos.value.map((p) => ({ ...p, type: "AFTER" as const })),
  ];
  uploadProgress.value = { current: 0, total: allPhotos.length };

  let successCount = 0;
  let failCount = 0;
  const failedPhotos: typeof allPhotos = [];

  for (const photo of allPhotos) {
    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(photo.file);
    });

    const result = await uploadFileWithRetry<{
      success: boolean;
      message?: string;
    }>(
      `/api/packing/${currentRecord.value.id}/upload`,
      {
        imageType: photo.type,
        fileName: photo.file.name,
        base64Data,
      },
      {
        Authorization: `Bearer ${token.value}`,
        "Content-Type": "application/json",
      }
    );

    if (result.success && result.data?.success) {
      successCount++;
      toast.success(
        "Upload",
        `Foto ${uploadProgress.value.current + 1}/${
          uploadProgress.value.total
        } berhasil`
      );
    } else {
      failCount++;
      failedPhotos.push(photo);
      console.error(
        "Upload failed:",
        result.error,
        `Attempts: ${result.attempts}`
      );

      if (result.attempts > 1) {
        toast.error(
          "Gagal Upload",
          `Foto gagal setelah ${result.attempts} percobaan: ${result.error}`
        );
      }
    }
    uploadProgress.value.current++;
  }

  isUploadingAll.value = false;

  // Only cleanup successfully uploaded photos
  const successfulIds = allPhotos
    .filter((p) => !failedPhotos.some((f) => f.id === p.id))
    .map((p) => p.id);

  // Cleanup successful photos
  pendingBeforePhotos.value
    .filter((p) => successfulIds.includes(p.id))
    .forEach((p) => URL.revokeObjectURL(p.url));
  pendingAfterPhotos.value
    .filter((p) => successfulIds.includes(p.id))
    .forEach((p) => URL.revokeObjectURL(p.url));

  // Keep only failed photos for retry
  pendingBeforePhotos.value = pendingBeforePhotos.value
    .filter((p) => !successfulIds.includes(p.id))
    .map((p, i) => ({ ...p, order: i + 1 }));
  pendingAfterPhotos.value = pendingAfterPhotos.value
    .filter((p) => !successfulIds.includes(p.id))
    .map((p, i) => ({ ...p, order: i + 1 }));

  // Refresh images
  await refreshImages();

  // Show result
  if (failCount === 0) {
    toast.success(
      "Berhasil",
      `${successCount} foto berhasil diupload ke Google Drive`
    );
  } else if (successCount > 0) {
    toast.error(
      "Sebagian Berhasil",
      `Berhasil: ${successCount}, Gagal: ${failCount}. Foto yang gagal tetap tersimpan untuk dicoba lagi.`
    );
  } else {
    toast.error(
      "Upload Gagal",
      `Semua ${failCount} foto gagal diupload. Silakan coba lagi.`
    );
  }
};

const refreshImages = async () => {
  if (!currentRecord.value) return;

  const { data } = await get<{ images: PackingImage[] }>(
    `/api/packing/${currentRecord.value.id}`
  );

  if (data) {
    beforeImages.value =
      data.images?.filter((i) => i.imageType === "BEFORE") || [];
    afterImages.value =
      data.images?.filter((i) => i.imageType === "AFTER") || [];
  }
};

const resetForm = () => {
  // Cleanup pending photos memory
  pendingBeforePhotos.value.forEach((p) => URL.revokeObjectURL(p.url));
  pendingAfterPhotos.value.forEach((p) => URL.revokeObjectURL(p.url));
  pendingBeforePhotos.value = [];
  pendingAfterPhotos.value = [];

  invoiceNumber.value = "";
  notes.value = "";
  currentRecord.value = null;
  // Clear saved record from localStorage
  localStorage.removeItem("currentPackingRecord");
  beforeImages.value = [];
  afterImages.value = [];
  // Reset wizard to step 1
  currentWizardStep.value = 1;
  cameraKey.value++; // Reset camera
  toast.success("Dibatalkan", "Form packing telah direset");
};

const uploadAndFinish = async () => {
  if (
    pendingBeforePhotos.value.length === 0 &&
    pendingAfterPhotos.value.length === 0
  ) {
    toast.error("Error", "Tidak ada foto untuk diupload");
    return;
  }

  // Upload all photos first
  await uploadAllPhotos();

  // Check if all uploaded successfully
  if (
    pendingBeforePhotos.value.length === 0 &&
    pendingAfterPhotos.value.length === 0
  ) {
    // All photos uploaded, auto reset form
    setTimeout(() => {
      resetForm();
      toast.success(
        "Selesai",
        "Packing selesai dan form telah direset. Siap untuk packing baru!"
      );
    }, 1000);
  } else {
    toast.error("Gagal", "Beberapa foto gagal diupload. Silakan coba lagi.");
  }
};

const finishPacking = async () => {
  toast.success("Selesai", "Packing berhasil disimpan");

  // Navigate to history or dashboard
  await navigateTo("/history");

  // Reset form after navigation
  setTimeout(() => {
    resetForm();
  }, 500);
};

// Offline draft functions
const isSavingDraft = ref(false);
const showDraftsModal = ref(false);

const saveAsDraft = async () => {
  if (
    pendingBeforePhotos.value.length === 0 &&
    pendingAfterPhotos.value.length === 0
  ) {
    toast.error("Error", "Tidak ada foto untuk disimpan");
    return;
  }

  isSavingDraft.value = true;

  try {
    const allPhotos = [
      ...pendingBeforePhotos.value.map((p) => ({
        id: p.id,
        file: p.file,
        type: "BEFORE" as const,
        order: p.order,
        timestamp: p.timestamp,
      })),
      ...pendingAfterPhotos.value.map((p) => ({
        id: p.id,
        file: p.file,
        type: "AFTER" as const,
        order: p.order,
        timestamp: p.timestamp,
      })),
    ];

    await saveDraft(
      currentRecord.value?.invoiceNumber || invoiceNumber.value,
      notes.value,
      allPhotos
    );

    toast.success(
      "Draft Tersimpan",
      `${allPhotos.length} foto disimpan untuk upload nanti`
    );
  } catch (err) {
    toast.error(
      "Gagal Simpan",
      err instanceof Error ? err.message : "Gagal menyimpan draft"
    );
  } finally {
    isSavingDraft.value = false;
  }
};

const loadDraftToForm = async (draftId: string) => {
  const draft = await getDraft(draftId);
  if (!draft) {
    toast.error("Error", "Draft tidak ditemukan");
    return;
  }

  // Set invoice and notes
  invoiceNumber.value = draft.invoiceNumber;
  notes.value = draft.notes;

  // Convert draft photos to files
  const photos = draftPhotosToFiles(draft);

  // Separate BEFORE and AFTER photos
  pendingBeforePhotos.value = photos
    .filter((p) => p.type === "BEFORE")
    .map((p) => ({
      id: p.id,
      file: p.file,
      url: p.url,
      order: p.order,
      fileName: p.fileName,
      timestamp: p.timestamp,
    }));

  pendingAfterPhotos.value = photos
    .filter((p) => p.type === "AFTER")
    .map((p) => ({
      id: p.id,
      file: p.file,
      url: p.url,
      order: p.order,
      fileName: p.fileName,
      timestamp: p.timestamp,
    }));

  showDraftsModal.value = false;
  toast.success(
    "Draft Dimuat",
    `Memuat draft untuk invoice ${draft.invoiceNumber}`
  );
};

const removeDraft = async (draftId: string) => {
  await deleteDraft(draftId);
  toast.success("Dihapus", "Draft berhasil dihapus");
};
</script>

<template>
  <div class="space-y-6">
    <!-- Offline Indicator -->
    <div
      v-if="!isOnline"
      class="rounded-lg bg-amber-100 border border-amber-300 p-4 flex items-center gap-3"
    >
      <svg
        class="h-6 w-6 text-amber-600 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
        />
      </svg>
      <div>
        <p class="font-medium text-amber-800">Anda Sedang Offline</p>
        <p class="text-sm text-amber-700">
          Foto akan disimpan sebagai draft dan diupload saat online kembali.
        </p>
      </div>
    </div>

    <!-- Header with Modern Gradient -->
    <div class="card card-elevated">
      <div class="card-body">
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div class="flex items-center gap-3">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-500/30"
              >
                <svg
                  class="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">
                  Dokumentasi Packing
                </h1>
                <p class="text-sm text-gray-600">
                  Proses dokumentasi foto packing barang
                </p>
              </div>
            </div>
          </div>

          <!-- Drafts Button & Live Info -->
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <!-- Drafts Button -->
            <button
              v-if="drafts.length > 0"
              @click="showDraftsModal = true"
              class="relative flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-amber-800 hover:bg-amber-200 transition-colors"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              <span class="text-sm font-medium">Draft</span>
              <span
                class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white"
              >
                {{ drafts.length }}
              </span>
            </button>

            <!-- Live Info Display -->
            <div class="text-right text-sm">
              <div class="font-medium text-gray-900">{{ currentDateTime }}</div>
              <div v-if="settings.showAddress" class="text-gray-600">
                {{ settings.address }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step Wizard Progress -->
    <div v-if="currentRecord" class="card">
      <div class="card-body">
        <UiStepWizard
          :steps="wizardSteps"
          :current-step="currentWizardStep"
          :allow-click-navigation="true"
          @step-click="goToStep"
        />
      </div>
    </div>

    <!-- Step 1: Invoice Input -->
    <div v-if="!currentRecord" class="card card-elevated">
      <div class="card-header">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 text-white font-bold shadow-md"
          >
            1
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Input Invoice</h2>
            <p class="text-sm text-gray-500">
              Masukkan nomor invoice untuk memulai
            </p>
          </div>
        </div>
      </div>
      <div class="card-body space-y-4">
        <div class="flex flex-col gap-4 sm:flex-row">
          <div class="flex-1">
            <UiInput
              v-model="invoiceNumber"
              label="Invoice Number"
              placeholder="Masukkan atau scan invoice"
              required
            />
          </div>
          <div class="flex items-end">
            <UiButton variant="secondary" @click="isScannerOpen = true">
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m10 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              Scan Barcode
            </UiButton>
          </div>
        </div>

        <div>
          <label class="label">Notes (opsional)</label>
          <textarea
            v-model="notes"
            rows="3"
            class="input"
            placeholder="Catatan tambahan..."
          ></textarea>
        </div>

        <UiButton
          variant="primary"
          :loading="isCreating"
          @click="createPackingRecord"
        >
          Mulai Dokumentasi
        </UiButton>
      </div>
    </div>

    <!-- Step 2 & 3: Photo Upload -->
    <template v-else>
      <!-- Record Info -->
      <div class="card">
        <div class="card-body">
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm text-gray-600">Invoice Number</p>
              <p class="text-xl font-bold text-gray-900">
                {{ currentRecord.invoiceNumber }}
              </p>
              <p v-if="notes" class="mt-1 text-sm text-gray-500">{{ notes }}</p>
            </div>
            <UiButton variant="outline" @click="resetForm"> Batal </UiButton>
          </div>
        </div>
      </div>

      <!-- Before Photos -->
      <div v-show="currentWizardStep === 2" class="card card-elevated">
        <div class="card-header flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold shadow-md"
            >
              2
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">
                Foto Before
                <span class="badge badge-primary ml-2"
                  >{{
                    beforeImages.length + pendingBeforePhotos.length
                  }}/5</span
                >
              </h2>
              <p class="text-sm text-gray-500">
                Ambil foto kondisi sebelum packing
              </p>
            </div>
          </div>
          <button
            @click="useCamera = !useCamera"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                v-if="useCamera"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
            </svg>
            {{ useCamera ? "Upload File" : "Gunakan Kamera" }}
          </button>
        </div>
        <div class="card-body space-y-4">
          <!-- Existing Images with Enhanced Grid -->
          <PackingPhotoGrid
            v-if="beforeImages.length > 0"
            :images="beforeImages"
            type="BEFORE"
            :watermark-position="settings.timestampPosition"
            :show-address="settings.showAddress"
            :address="settings.address"
            :current-date-time="currentDateTime"
          />

          <!-- Pending Photos (belum diupload) with Drag & Drop Reorder -->
          <div v-if="pendingBeforePhotos.length > 0" class="mb-4">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-medium text-gray-700">
                📸 Foto Tersimpan ({{ pendingBeforePhotos.length }}/5) - Belum
                diupload
              </p>
              <span class="text-xs text-gray-500 italic">
                Drag untuk mengurutkan
              </span>
            </div>
            <PackingPhotoReorder
              v-model="pendingBeforePhotos"
              :show-metadata="false"
              @photo-removed="(id) => removePendingPhotoById('BEFORE', id)"
              @order-changed="(items) => handleReorder('BEFORE', items)"
            />
          </div>

          <!-- Live Photo Counter -->
          <div
            v-if="
              useCamera &&
              pendingBeforePhotos.length > 0 &&
              pendingBeforePhotos.length < 5
            "
            class="mb-4 rounded-lg bg-blue-100 p-3 border border-blue-300"
          >
            <p class="text-sm font-medium text-blue-900">
              📸 {{ pendingBeforePhotos.length }}/5 foto tersimpan sementara
            </p>
            <p class="text-xs text-blue-700 mt-1">
              Foto akan otomatis tersimpan. Kamera tutup otomatis setelah 5
              foto.
            </p>
          </div>

          <!-- Camera Capture -->
          <PackingCameraCapture
            v-if="
              useCamera && beforeImages.length + pendingBeforePhotos.length < 5
            "
            :key="`before-${cameraKey}`"
            type="before"
            :max-photos="5"
            @photo-taken="(file) => handlePhotoTaken(file, 'BEFORE')"
          />

          <!-- File Upload (fallback) -->
          <PackingImageUploader
            v-else-if="!useCamera && beforeImages.length < 5"
            :packing-record-id="currentRecord.id"
            image-type="BEFORE"
            :max-files="5"
            :existing-count="beforeImages.length"
            @uploaded="(id) => handleImageUploaded(id, 'BEFORE')"
          />

          <div
            v-if="beforeImages.length >= 5"
            class="text-center text-sm text-gray-500 py-4"
          >
            Maksimal 5 foto sudah tercapai
          </div>
        </div>

        <!-- Navigation Footer for Before Photos -->
        <div class="card-footer">
          <div class="flex items-center justify-between">
            <UiButton variant="outline" @click="currentWizardStep = 1">
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Kembali
            </UiButton>
            <div class="flex items-center gap-2">
              <span
                v-if="beforeImages.length > 0 || pendingBeforePhotos.length > 0"
                class="text-sm text-gray-600"
              >
                <svg
                  class="inline h-5 w-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {{ beforeImages.length + pendingBeforePhotos.length }} foto
                tersimpan
              </span>
              <UiButton
                variant="primary"
                @click="currentWizardStep = 3"
                :disabled="
                  beforeImages.length === 0 && pendingBeforePhotos.length === 0
                "
              >
                Lanjut ke Foto After
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </UiButton>
            </div>
          </div>
        </div>
      </div>

      <!-- After Photos -->
      <div v-show="currentWizardStep === 3" class="card card-elevated">
        <div class="card-header flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 text-white font-bold shadow-md"
            >
              3
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">
                Foto After
                <span class="badge badge-success ml-2"
                  >{{ afterImages.length + pendingAfterPhotos.length }}/5</span
                >
              </h2>
              <p class="text-sm text-gray-500">
                Ambil foto kondisi setelah packing
              </p>
            </div>
          </div>
          <button
            @click="useCamera = !useCamera"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                v-if="useCamera"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
            </svg>
            {{ useCamera ? "Upload File" : "Gunakan Kamera" }}
          </button>
        </div>
        <div class="card-body space-y-4">
          <!-- Existing Images with Enhanced Grid -->
          <PackingPhotoGrid
            v-if="afterImages.length > 0"
            :images="afterImages"
            type="AFTER"
            :watermark-position="settings.timestampPosition"
            :show-address="settings.showAddress"
            :address="settings.address"
            :current-date-time="currentDateTime"
          />

          <!-- Pending Photos (belum diupload) with Drag & Drop Reorder -->
          <div v-if="pendingAfterPhotos.length > 0" class="mb-4">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-medium text-gray-700">
                📸 Foto Tersimpan ({{ pendingAfterPhotos.length }}/5) - Belum
                diupload
              </p>
              <span class="text-xs text-gray-500 italic">
                Drag untuk mengurutkan
              </span>
            </div>
            <PackingPhotoReorder
              v-model="pendingAfterPhotos"
              :show-metadata="false"
              @photo-removed="(id) => removePendingPhotoById('AFTER', id)"
              @order-changed="(items) => handleReorder('AFTER', items)"
            />
          </div>

          <!-- Live Photo Counter -->
          <div
            v-if="
              useCamera &&
              pendingAfterPhotos.length > 0 &&
              pendingAfterPhotos.length < 5
            "
            class="mb-4 rounded-lg bg-green-100 p-3 border border-green-300"
          >
            <p class="text-sm font-medium text-green-900">
              📸 {{ pendingAfterPhotos.length }}/5 foto tersimpan sementara
            </p>
            <p class="text-xs text-green-700 mt-1">
              Foto akan otomatis tersimpan. Kamera tutup otomatis setelah 5
              foto.
            </p>
          </div>

          <!-- Camera Capture -->
          <PackingCameraCapture
            v-if="
              useCamera && afterImages.length + pendingAfterPhotos.length < 5
            "
            :key="`after-${cameraKey}`"
            type="after"
            :max-photos="5"
            @photo-taken="(file) => handlePhotoTaken(file, 'AFTER')"
          />

          <!-- File Upload (fallback) -->
          <PackingImageUploader
            v-else-if="!useCamera && afterImages.length < 5"
            :packing-record-id="currentRecord.id"
            image-type="AFTER"
            :max-files="5"
            :existing-count="afterImages.length"
            @uploaded="(id) => handleImageUploaded(id, 'AFTER')"
          />

          <div
            v-if="afterImages.length >= 5"
            class="text-center text-sm text-gray-500 py-4"
          >
            Maksimal 5 foto sudah tercapai
          </div>
        </div>

        <!-- Navigation Footer for After Photos -->
        <div class="card-footer">
          <div class="flex items-center justify-between">
            <UiButton variant="outline" @click="currentWizardStep = 2">
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Kembali
            </UiButton>
            <div class="flex items-center gap-2">
              <span
                v-if="afterImages.length > 0 || pendingAfterPhotos.length > 0"
                class="text-sm text-gray-600"
              >
                <svg
                  class="inline h-5 w-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {{ afterImages.length + pendingAfterPhotos.length }} foto
                tersimpan
              </span>
              <UiButton
                variant="primary"
                @click="currentWizardStep = 4"
                :disabled="
                  afterImages.length === 0 && pendingAfterPhotos.length === 0
                "
              >
                Lanjut ke Review
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </UiButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Review & Upload -->
      <div v-show="currentWizardStep === 4" class="space-y-6">
        <!-- Summary Card -->
        <div class="card card-elevated">
          <div class="card-header">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow-md"
              >
                4
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900">
                  Review & Upload
                </h2>
                <p class="text-sm text-gray-500">
                  Periksa kembali sebelum upload
                </p>
              </div>
            </div>
          </div>
          <div class="card-body space-y-6">
            <!-- Invoice Info -->
            <div
              class="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border border-indigo-200"
            >
              <div class="flex items-start gap-4">
                <div
                  class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-indigo-700">
                    Invoice Number
                  </p>
                  <p class="text-2xl font-bold text-indigo-900 mt-1">
                    {{ currentRecord.invoiceNumber }}
                  </p>
                  <p v-if="notes" class="text-sm text-indigo-600 mt-2">
                    {{ notes }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Photos Summary -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Before Photos Summary -->
              <div class="rounded-xl bg-blue-50 p-6 border border-blue-200">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold"
                  >
                    <svg
                      class="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="font-semibold text-blue-900">Foto Before</p>
                    <p class="text-sm text-blue-600">
                      {{ beforeImages.length + pendingBeforePhotos.length }}
                      foto
                    </p>
                  </div>
                </div>
                <div
                  v-if="pendingBeforePhotos.length > 0"
                  class="rounded-lg bg-white p-3 border border-blue-300"
                >
                  <p class="text-sm text-blue-800">
                    <svg
                      class="inline h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {{ pendingBeforePhotos.length }} foto belum diupload
                  </p>
                </div>
              </div>

              <!-- After Photos Summary -->
              <div class="rounded-xl bg-green-50 p-6 border border-green-200">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white font-bold"
                  >
                    <svg
                      class="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="font-semibold text-green-900">Foto After</p>
                    <p class="text-sm text-green-600">
                      {{ afterImages.length + pendingAfterPhotos.length }} foto
                    </p>
                  </div>
                </div>
                <div
                  v-if="pendingAfterPhotos.length > 0"
                  class="rounded-lg bg-white p-3 border border-green-300"
                >
                  <p class="text-sm text-green-800">
                    <svg
                      class="inline h-4 w-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {{ pendingAfterPhotos.length }} foto belum diupload
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Simplified Action Buttons -->
        <div class="card card-elevated">
          <div class="card-body">
            <div
              v-if="
                pendingBeforePhotos.length > 0 || pendingAfterPhotos.length > 0
              "
              class="mb-6 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 p-4"
            >
              <h3
                class="text-lg font-semibold text-gray-900 flex items-center gap-2"
              >
                <svg
                  class="h-6 w-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
                Siap Upload ke Google Drive
              </h3>
              <p class="mt-1 text-sm text-gray-600">
                {{ pendingBeforePhotos.length }} foto BEFORE +
                {{ pendingAfterPhotos.length }} foto AFTER =
                <strong class="text-indigo-700"
                  >{{
                    pendingBeforePhotos.length + pendingAfterPhotos.length
                  }}
                  foto</strong
                >
                akan diupload
              </p>
              <div v-if="isUploadingAll" class="mt-3 space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-indigo-700 font-medium">
                    Mengupload {{ uploadProgress.current }}/{{
                      uploadProgress.total
                    }}
                  </span>
                  <span class="text-indigo-600">
                    {{
                      Math.round(
                        (uploadProgress.current / uploadProgress.total) * 100
                      )
                    }}%
                  </span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-bar-fill"
                    :style="{
                      width: `${
                        (uploadProgress.current / uploadProgress.total) * 100
                      }%`,
                    }"
                  />
                </div>
              </div>
            </div>

            <!-- 3 Button Simplified -->
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <UiButton
                variant="danger"
                :disabled="isUploadingAll || isSavingDraft"
                @click="resetForm"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Batal
              </UiButton>
              <UiButton
                variant="outline"
                :loading="isSavingDraft"
                :disabled="
                  isUploadingAll ||
                  isSavingDraft ||
                  (pendingBeforePhotos.length === 0 &&
                    pendingAfterPhotos.length === 0)
                "
                @click="saveAsDraft"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                Simpan Draft
              </UiButton>
              <UiButton
                variant="success"
                size="lg"
                :loading="isUploadingAll"
                :disabled="
                  isUploadingAll ||
                  !isOnline ||
                  (pendingBeforePhotos.length === 0 &&
                    pendingAfterPhotos.length === 0)
                "
                @click="uploadAndFinish"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {{
                  isOnline
                    ? "Upload & Selesaikan Packing"
                    : "Offline - Tidak Bisa Upload"
                }}
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Photo Preview Modal -->
    <UiModal v-model="isPreviewOpen" title="Preview Foto" size="xl">
      <div v-if="previewUrl" class="space-y-4">
        <!-- Preview Image -->
        <div
          class="relative aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
        >
          <img
            :src="previewUrl"
            alt="Photo preview"
            class="h-full w-full object-contain"
          />
          <div
            class="absolute top-4 left-4 rounded-full px-4 py-2 font-bold text-white shadow-lg"
            :class="previewType === 'BEFORE' ? 'bg-blue-600' : 'bg-green-600'"
          >
            {{ previewType === "BEFORE" ? "BEFORE" : "AFTER" }}
          </div>
        </div>

        <!-- Info -->
        <div class="rounded-lg bg-blue-50 p-4">
          <div class="flex items-start gap-3">
            <svg
              class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-blue-900">
                Foto akan dikumpulkan untuk diupload nanti
              </p>
              <p class="mt-1 text-sm text-blue-700">
                Anda bisa mengambil beberapa foto (max 5 per jenis), lalu upload
                sekaligus ke Google Drive.
              </p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <UiButton variant="outline" @click="closePreview">
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Batal & Ambil Ulang
          </UiButton>
          <UiButton variant="primary" @click="confirmPhoto">
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Simpan Foto Ini
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Barcode Scanner Modal -->
    <ScannerBarcodeScanner v-model="isScannerOpen" @scan="handleBarcodeScan" />

    <!-- Drafts Modal -->
    <UiModal v-model="showDraftsModal" title="Draft Tersimpan" size="lg">
      <div v-if="drafts.length === 0" class="text-center py-8">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <p class="mt-4 text-gray-500">Tidak ada draft tersimpan</p>
      </div>

      <div v-else class="space-y-4">
        <p class="text-sm text-gray-600">
          Draft akan diupload secara otomatis saat Anda online kembali, atau
          Anda dapat memilih untuk memuat draft ke form.
        </p>

        <div class="divide-y divide-gray-200 rounded-lg border border-gray-200">
          <div
            v-for="draft in drafts"
            :key="draft.id"
            class="flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div class="flex-1">
              <p class="font-medium text-gray-900">
                {{ draft.invoiceNumber || "Tanpa Invoice" }}
              </p>
              <p class="text-sm text-gray-500">
                {{ draft.photos.length }} foto •
                {{ new Date(draft.createdAt).toLocaleString("id-ID") }}
              </p>
              <span
                v-if="draft.synced"
                class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
              >
                Synced
              </span>
              <span
                v-else
                class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
              >
                Belum Upload
              </span>
            </div>
            <div class="flex gap-2">
              <UiButton
                variant="outline"
                size="sm"
                @click="loadDraftToForm(draft.id)"
              >
                Muat
              </UiButton>
              <UiButton
                variant="danger"
                size="sm"
                @click="removeDraft(draft.id)"
              >
                Hapus
              </UiButton>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="secondary" @click="showDraftsModal = false">
          Tutup
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import type { ImageType } from "~/types";

interface Props {
  packingRecordId: string;
  imageType: ImageType;
  maxFiles?: number;
  existingCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  maxFiles: 5,
  existingCount: 0,
});

const emit = defineEmits<{
  uploaded: [imageId: string];
}>();

const { token } = useAuth();
const toast = useToast();
const uploadProgress = useUploadProgress();

const isDragging = ref(false);
const isUploading = ref(false);
const previewFiles = ref<{ file: File; preview: string }[]>([]);

const remainingSlots = computed(
  () => props.maxFiles - props.existingCount - previewFiles.value.length
);

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (files) {
    handleFiles(Array.from(files));
  }
};

const handleFileInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    handleFiles(Array.from(target.files));
  }
  target.value = "";
};

const handleFiles = (files: File[]) => {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));

  if (imageFiles.length === 0) {
    toast.error("Format tidak valid", "Hanya file gambar yang diperbolehkan");
    return;
  }

  const availableSlots = remainingSlots.value;
  const filesToAdd = imageFiles.slice(0, availableSlots);

  if (filesToAdd.length < imageFiles.length) {
    toast.warning(
      "Batas tercapai",
      `Hanya ${filesToAdd.length} dari ${imageFiles.length} file yang ditambahkan`
    );
  }

  for (const file of filesToAdd) {
    const preview = URL.createObjectURL(file);
    previewFiles.value.push({ file, preview });
  }
};

const removePreview = (index: number) => {
  const item = previewFiles.value[index];
  if (item) {
    URL.revokeObjectURL(item.preview);
    previewFiles.value.splice(index, 1);
  }
};

const uploadFiles = async () => {
  if (previewFiles.value.length === 0) return;

  isUploading.value = true;

  for (const item of previewFiles.value) {
    try {
      // Convert to base64
      const base64 = await fileToBase64(item.file);

      // Upload to API
      const response = await $fetch<{
        success: boolean;
        data: { id: string };
        message?: string;
      }>(`/api/packing/${props.packingRecordId}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
        body: {
          imageType: props.imageType,
          fileName: item.file.name,
          base64Data: base64,
        },
      });

      if (response.success && response.data) {
        // Add to upload progress tracking
        uploadProgress.addItem({
          imageId: response.data.id,
          packingRecordId: props.packingRecordId,
          fileName: item.file.name,
          status: "PENDING",
          progress: 0,
        });

        emit("uploaded", response.data.id);
        toast.info("Antrian upload", `${item.file.name} masuk antrian`);
      }

      // Clean up preview
      URL.revokeObjectURL(item.preview);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error("Upload gagal", err.data?.message || item.file.name);
    }
  }

  previewFiles.value = [];
  isUploading.value = false;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

onUnmounted(() => {
  previewFiles.value.forEach((item) => URL.revokeObjectURL(item.preview));
});
</script>

<template>
  <div class="space-y-4">
    <!-- Upload Zone -->
    <div
      v-if="remainingSlots > 0"
      :class="[
        'upload-zone cursor-pointer',
        { 'upload-zone-active': isDragging },
      ]"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="($refs.fileInput as HTMLInputElement).click()"
    >
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
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p class="mt-2 text-sm text-gray-600">
        Drag & drop atau klik untuk upload
      </p>
      <p class="text-xs text-gray-500">
        {{ imageType === "BEFORE" ? "Foto Before" : "Foto After" }} ({{
          remainingSlots
        }}
        slot tersisa)
      </p>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleFileInput"
    />

    <!-- Preview Grid -->
    <div v-if="previewFiles.length > 0" class="space-y-3">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <div
          v-for="(item, index) in previewFiles"
          :key="index"
          class="relative aspect-square overflow-hidden rounded-lg border border-gray-200"
        >
          <img
            :src="item.preview"
            :alt="`Preview ${index + 1}`"
            class="h-full w-full object-cover"
          />
          <button
            @click="removePreview(index)"
            class="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <svg
              class="h-4 w-4"
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
          </button>
        </div>
      </div>

      <UiButton
        variant="primary"
        :loading="isUploading"
        :disabled="isUploading"
        @click="uploadFiles"
      >
        Upload {{ previewFiles.length }} Foto
      </UiButton>
    </div>
  </div>
</template>

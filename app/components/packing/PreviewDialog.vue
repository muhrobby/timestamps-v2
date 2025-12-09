<script setup lang="ts">
import { computed } from "vue";

interface PhotoMetadata {
  url: string;
  type: "BEFORE" | "AFTER";
  timestamp: string;
  location?: { lat: number; lng: number };
  address?: string;
  fileName: string;
}

interface Props {
  open: boolean;
  storeName: string;
  invoiceNumber: string;
  photos: PhotoMetadata[];
  notes?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "edit"): void;
  (e: "confirm"): void;
}>();

const beforePhotos = computed(() =>
  props.photos.filter((p) => p.type === "BEFORE")
);

const afterPhotos = computed(() =>
  props.photos.filter((p) => p.type === "AFTER")
);

const totalPhotos = computed(() => props.photos.length);

const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return timestamp;
  }
};

const formatLocation = (photo: PhotoMetadata) => {
  if (photo.address) {
    return photo.address;
  }
  if (photo.location) {
    return `${photo.location.lat.toFixed(6)}, ${photo.location.lng.toFixed(6)}`;
  }
  return "Lokasi tidak tersedia";
};

// State for metadata visibility
const showMetadata = ref(true);

const toggleMetadata = () => {
  showMetadata.value = !showMetadata.value;
};
</script>

<template>
  <UiModal
    :model-value="open"
    title="Preview & Konfirmasi"
    size="2xl"
    @update:model-value="(val: boolean) => !val && emit('close')"
  >
    <div class="space-y-6">
      <!-- Header Info -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-500">Nama Toko</p>
            <p class="mt-1 text-base font-semibold text-gray-900">
              {{ storeName }}
            </p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Nomor Invoice</p>
            <p class="mt-1 text-base font-semibold text-gray-900">
              {{ invoiceNumber }}
            </p>
          </div>
        </div>

        <div v-if="notes" class="mt-4">
          <p class="text-sm font-medium text-gray-500">Catatan</p>
          <p class="mt-1 text-sm text-gray-700">{{ notes }}</p>
        </div>
      </div>

      <!-- Photos Summary -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h3 class="text-lg font-semibold text-gray-900">
            Total Foto: {{ totalPhotos }}
          </h3>
          <span
            class="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
          >
            {{ beforePhotos.length }} BEFORE
          </span>
          <span
            class="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
          >
            {{ afterPhotos.length }} AFTER
          </span>
        </div>

        <!-- Toggle Metadata Button -->
        <button
          @click="toggleMetadata"
          class="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg
            v-if="showMetadata"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <svg
            v-else
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
          <span>{{ showMetadata ? "Sembunyikan" : "Tampilkan" }} Metadata</span>
        </button>
      </div>

      <!-- BEFORE Photos -->
      <div v-if="beforePhotos.length > 0">
        <h4 class="mb-3 text-base font-semibold text-blue-700">
          📸 Foto BEFORE ({{ beforePhotos.length }})
        </h4>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div
            v-for="(photo, index) in beforePhotos"
            :key="`before-${index}`"
            class="group relative overflow-hidden rounded-lg border-2 border-blue-300 bg-blue-50"
          >
            <!-- Photo Thumbnail -->
            <div class="aspect-square overflow-hidden bg-gray-100">
              <img
                :src="photo.url"
                :alt="`BEFORE ${index + 1}`"
                class="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>

            <!-- Photo Number Badge -->
            <div
              class="absolute top-2 left-2 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg"
            >
              #{{ index + 1 }}
            </div>

            <!-- Metadata Overlay (shown when showMetadata is true) -->
            <div
              v-if="showMetadata"
              class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white"
            >
              <div class="space-y-1 text-xs">
                <div class="flex items-start space-x-1">
                  <svg
                    class="mt-0.5 h-3 w-3 flex-shrink-0"
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
                  <span class="break-all">{{
                    formatTimestamp(photo.timestamp)
                  }}</span>
                </div>
                <div class="flex items-start space-x-1">
                  <svg
                    class="mt-0.5 h-3 w-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span class="line-clamp-2 break-all">{{
                    formatLocation(photo)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AFTER Photos -->
      <div v-if="afterPhotos.length > 0">
        <h4 class="mb-3 text-base font-semibold text-green-700">
          📸 Foto AFTER ({{ afterPhotos.length }})
        </h4>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div
            v-for="(photo, index) in afterPhotos"
            :key="`after-${index}`"
            class="group relative overflow-hidden rounded-lg border-2 border-green-300 bg-green-50"
          >
            <!-- Photo Thumbnail -->
            <div class="aspect-square overflow-hidden bg-gray-100">
              <img
                :src="photo.url"
                :alt="`AFTER ${index + 1}`"
                class="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>

            <!-- Photo Number Badge -->
            <div
              class="absolute top-2 left-2 rounded-full bg-green-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg"
            >
              #{{ index + 1 }}
            </div>

            <!-- Metadata Overlay -->
            <div
              v-if="showMetadata"
              class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white"
            >
              <div class="space-y-1 text-xs">
                <div class="flex items-start space-x-1">
                  <svg
                    class="mt-0.5 h-3 w-3 flex-shrink-0"
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
                  <span class="break-all">{{
                    formatTimestamp(photo.timestamp)
                  }}</span>
                </div>
                <div class="flex items-start space-x-1">
                  <svg
                    class="mt-0.5 h-3 w-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span class="line-clamp-2 break-all">{{
                    formatLocation(photo)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="totalPhotos === 0"
        class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center"
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
        <p class="mt-2 text-sm text-gray-500">Belum ada foto</p>
      </div>
    </div>

    <!-- Action Buttons -->
    <template #footer>
      <div class="flex justify-end space-x-3">
        <UiButton variant="outline" @click="emit('close')">
          <svg
            class="mr-2 h-4 w-4"
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

        <UiButton variant="secondary" @click="emit('edit')">
          <svg
            class="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Ubah
        </UiButton>

        <UiButton
          variant="primary"
          :disabled="totalPhotos === 0"
          @click="emit('confirm')"
        >
          <svg
            class="mr-2 h-4 w-4"
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
          Simpan & Upload
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

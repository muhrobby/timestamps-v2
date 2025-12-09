<script setup lang="ts">
import type { PackingImage } from "~/types";

interface Props {
  images: PackingImage[];
  type: "BEFORE" | "AFTER";
  loading?: boolean;
  watermarkPosition?: string;
  showAddress?: boolean;
  address?: string;
  currentDateTime?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  watermarkPosition: "bottom-right",
  showAddress: true,
  address: "",
  currentDateTime: "",
});

const emit = defineEmits<{
  imageClick: [image: PackingImage];
  imageDelete: [imageId: string];
}>();

const getTypeColor = (type: string) => {
  return type === "BEFORE"
    ? "from-blue-600 to-blue-500"
    : "from-green-600 to-emerald-500";
};

const getTypeBadgeColor = (type: string) => {
  return type === "BEFORE" ? "badge-primary" : "badge-success";
};
</script>

<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="aspect-square rounded-xl overflow-hidden"
      >
        <div class="skeleton h-full w-full" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="images.length === 0"
      class="text-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
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
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 13l-3 3m0 0l-3-3m3 3V9"
        />
      </svg>
      <p class="mt-4 text-sm text-gray-500">
        Belum ada foto {{ type === "BEFORE" ? "before" : "after" }}
      </p>
      <p class="mt-1 text-xs text-gray-400">
        Ambil foto menggunakan kamera atau upload file
      </p>
    </div>

    <!-- Photos Grid -->
    <div v-else class="space-y-3">
      <!-- Header Info -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span :class="['badge font-semibold', getTypeBadgeColor(type)]">
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
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
            </svg>
            {{ type }}
          </span>
          <span class="text-sm text-gray-600">{{ images.length }} foto</span>
        </div>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <div
          v-for="(image, index) in images"
          :key="image.id"
          class="group relative aspect-square overflow-hidden rounded-xl border-2 border-gray-200 hover:border-indigo-400 transition-all duration-300 hover:shadow-lg cursor-pointer"
          @click="emit('imageClick', image)"
        >
          <!-- Image -->
          <img
            v-if="image.driveUrl"
            :src="image.driveUrl"
            :alt="image.fileName"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />

          <!-- Upload Progress -->
          <div
            v-else
            class="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50"
          >
            <div class="spinner" />
            <p class="mt-3 text-sm font-medium text-gray-700">
              {{ image.uploadProgress }}%
            </p>
            <div class="progress-bar mt-2 w-20">
              <div
                class="progress-bar-fill"
                :style="{ width: `${image.uploadProgress}%` }"
              />
            </div>
          </div>

          <!-- Order Badge -->
          <div
            :class="[
              'absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full font-bold text-white text-xs shadow-lg',
              'bg-gradient-to-br',
              getTypeColor(type),
            ]"
          >
            {{ image.displayOrder || index + 1 }}
          </div>

          <!-- Status Badge (if uploaded) -->
          <div
            v-if="image.driveUrl"
            class="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-xs font-semibold text-white shadow-lg"
          >
            <svg
              class="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Uploaded</span>
          </div>

          <!-- Watermark Preview -->
          <div
            v-if="image.driveUrl"
            :class="['watermark', `watermark-${watermarkPosition}`]"
          >
            <p class="text-xs">{{ currentDateTime }}</p>
            <p v-if="showAddress" class="text-xs">{{ address }}</p>
          </div>

          <!-- Hover Overlay -->
          <div
            class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <div class="flex gap-2">
              <button
                class="btn btn-ghost bg-white/90 hover:bg-white text-gray-800 rounded-full h-10 w-10 p-0 flex items-center justify-center"
                @click.stop="emit('imageClick', image)"
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { items, overallProgress, pendingCount } = useUploadProgress();

const hasActiveUploads = computed(() => pendingCount.value > 0);

const statusIcon = (status: string) => {
  switch (status) {
    case "PENDING":
      return "⏳";
    case "UPLOADING":
      return "📤";
    case "COMPLETED":
      return "✅";
    case "FAILED":
      return "❌";
    default:
      return "⏳";
  }
};
</script>

<template>
  <Transition name="slide">
    <div
      v-if="hasActiveUploads || items.length > 0"
      class="fixed bottom-4 right-4 z-40 w-80 rounded-lg bg-white shadow-xl border border-gray-200"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between bg-blue-600 px-4 py-3 rounded-t-lg"
      >
        <div class="flex items-center gap-2 text-white">
          <svg
            class="h-5 w-5 animate-spin"
            v-if="pendingCount > 0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <svg
            class="h-5 w-5"
            v-else
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span class="font-medium">Upload Progress</span>
        </div>
        <span class="text-sm text-white/80">{{ overallProgress }}%</span>
      </div>

      <!-- Progress Bar -->
      <div class="progress-bar mx-4 mt-3">
        <div
          class="progress-bar-fill"
          :style="{ width: `${overallProgress}%` }"
        />
      </div>

      <!-- Items List -->
      <div class="max-h-48 overflow-y-auto p-4 space-y-2">
        <div
          v-for="item in items"
          :key="item.imageId"
          class="flex items-center gap-2 text-sm"
        >
          <span>{{ statusIcon(item.status) }}</span>
          <span class="flex-1 truncate">{{ item.fileName }}</span>
          <span class="text-gray-500">{{ item.progress }}%</span>
        </div>

        <div
          v-if="items.length === 0"
          class="text-center text-sm text-gray-500"
        >
          Tidak ada upload aktif
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>

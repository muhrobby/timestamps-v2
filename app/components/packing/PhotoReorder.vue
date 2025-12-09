<script
  setup
  lang="ts"
  generic="T extends { id: string; url: string; order: number; fileName?: string; timestamp?: string; location?: string }"
>
import Sortable from "sortablejs";

interface Props {
  modelValue: T[];
  disabled?: boolean;
  showMetadata?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showMetadata: true,
});

const emit = defineEmits<{
  "update:modelValue": [value: T[]];
  "photo-removed": [id: string];
  "order-changed": [items: T[]];
}>();

const containerRef = ref<HTMLElement | null>(null);
const sortableInstance = ref<Sortable | null>(null);
const selectedPhoto = ref<T | null>(null);
const showPreviewModal = ref(false);

const initSortable = () => {
  if (!containerRef.value || props.disabled) return;

  if (sortableInstance.value) {
    sortableInstance.value.destroy();
  }

  sortableInstance.value = Sortable.create(containerRef.value, {
    animation: 200,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    handle: ".drag-handle",
    disabled: props.disabled,
    onEnd: (evt) => {
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;

      if (oldIndex === undefined || newIndex === undefined) return;
      if (oldIndex === newIndex) return;

      // Reorder items
      const newItems = [...props.modelValue];
      const [movedItem] = newItems.splice(oldIndex, 1);
      if (movedItem) {
        newItems.splice(newIndex, 0, movedItem);
      }

      // Update order property
      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        order: index + 1,
      }));

      emit("update:modelValue", reorderedItems);
      emit("order-changed", reorderedItems);
    },
  });
};

const removePhoto = (id: string) => {
  const newItems = props.modelValue
    .filter((item) => item.id !== id)
    .map((item, index) => ({
      ...item,
      order: index + 1,
    }));

  emit("update:modelValue", newItems);
  emit("photo-removed", id);
};

const openPreview = (photo: T) => {
  selectedPhoto.value = photo;
  showPreviewModal.value = true;
};

const closePreview = () => {
  selectedPhoto.value = null;
  showPreviewModal.value = false;
};

// Watch for disabled changes
watch(
  () => props.disabled,
  (disabled) => {
    if (sortableInstance.value) {
      sortableInstance.value.option("disabled", disabled);
    }
  }
);

onMounted(() => {
  nextTick(() => {
    initSortable();
  });
});

onUnmounted(() => {
  if (sortableInstance.value) {
    sortableInstance.value.destroy();
  }
});
</script>

<template>
  <div class="photo-reorder-container">
    <div
      ref="containerRef"
      class="photo-grid"
      :class="{ 'is-disabled': disabled }"
    >
      <div
        v-for="photo in modelValue"
        :key="photo.id"
        class="photo-item"
        :data-id="photo.id"
      >
        <!-- Drag Handle -->
        <div
          v-if="!disabled"
          class="drag-handle"
          title="Drag untuk mengubah urutan"
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
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>

        <!-- Order Badge -->
        <div class="order-badge">#{{ photo.order }}</div>

        <!-- Photo -->
        <img
          :src="photo.url"
          :alt="photo.fileName"
          class="photo-image"
          @click="openPreview(photo)"
        />

        <!-- Overlay Controls -->
        <div class="photo-overlay">
          <button
            type="button"
            class="btn-preview"
            @click.stop="openPreview(photo)"
            title="Preview"
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

          <button
            v-if="!disabled"
            type="button"
            class="btn-remove"
            @click.stop="removePhoto(photo.id)"
            title="Hapus"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        <!-- Metadata -->
        <div
          v-if="showMetadata && (photo.timestamp || photo.location)"
          class="photo-metadata"
        >
          <p v-if="photo.timestamp" class="text-xs text-gray-500">
            📅 {{ photo.timestamp }}
          </p>
          <p v-if="photo.location" class="text-xs text-gray-500 truncate">
            📍 {{ photo.location }}
          </p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="modelValue.length === 0" class="empty-state">
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

    <!-- Preview Modal -->
    <UiModal
      v-model="showPreviewModal"
      :title="selectedPhoto?.fileName || 'Preview'"
      size="xl"
    >
      <div v-if="selectedPhoto" class="space-y-4">
        <img
          :src="selectedPhoto.url"
          :alt="selectedPhoto.fileName"
          class="w-full rounded-lg"
        />

        <div v-if="showMetadata" class="grid grid-cols-2 gap-4 text-sm">
          <div v-if="selectedPhoto.timestamp">
            <span class="font-medium text-gray-500">Waktu:</span>
            <p class="text-gray-900">{{ selectedPhoto.timestamp }}</p>
          </div>
          <div v-if="selectedPhoto.location">
            <span class="font-medium text-gray-500">Lokasi:</span>
            <p class="text-gray-900">{{ selectedPhoto.location }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="secondary" @click="closePreview">Tutup</UiButton>
          <UiButton
            v-if="!disabled && selectedPhoto"
            variant="danger"
            @click="
              removePhoto(selectedPhoto.id);
              closePreview();
            "
          >
            Hapus Foto
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.photo-reorder-container {
  @apply w-full;
}

.photo-grid {
  @apply grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5;
}

.photo-grid.is-disabled {
  @apply pointer-events-none opacity-75;
}

.photo-item {
  @apply relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm transition-all duration-200;
}

.photo-item:hover {
  @apply border-blue-300 shadow-md;
}

.drag-handle {
  @apply absolute top-2 left-2 z-20 cursor-grab rounded bg-white/90 p-1.5 text-gray-600 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-gray-900;
}

.drag-handle:active {
  @apply cursor-grabbing;
}

.order-badge {
  @apply absolute top-2 right-2 z-20 rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm;
}

.photo-image {
  @apply h-full w-full cursor-pointer object-cover;
}

.photo-overlay {
  @apply absolute inset-0 z-10 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200;
}

.photo-item:hover .photo-overlay {
  @apply opacity-100;
}

.btn-preview,
.btn-remove {
  @apply rounded-full p-2 text-white transition-all;
}

.btn-preview {
  @apply bg-blue-600 hover:bg-blue-700;
}

.btn-remove {
  @apply bg-red-600 hover:bg-red-700;
}

.photo-metadata {
  @apply absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white;
}

.empty-state {
  @apply flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center;
}

/* Sortable.js Classes */
.sortable-ghost {
  @apply opacity-40;
}

.sortable-chosen {
  @apply ring-2 ring-blue-500;
}

.sortable-drag {
  @apply shadow-xl;
}
</style>

<script setup lang="ts">
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  class?: string;
}

interface Props {
  columns: Column[];
  data: Record<string, unknown>[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  selectable?: boolean;
  selectedIds?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  sortOrder: "desc",
  selectable: false,
  selectedIds: () => [],
});

const emit = defineEmits<{
  sort: [key: string];
  "row-click": [row: Record<string, unknown>];
  "selection-change": [ids: string[]];
}>();

const toggleSort = (column: Column) => {
  if (column.sortable) {
    emit("sort", column.key);
  }
};

const isSelected = (id: string) => props.selectedIds.includes(id);

const toggleSelection = (id: string) => {
  const newSelection = isSelected(id)
    ? props.selectedIds.filter((i) => i !== id)
    : [...props.selectedIds, id];
  emit("selection-change", newSelection);
};

const toggleAllSelection = () => {
  if (props.selectedIds.length === props.data.length) {
    emit("selection-change", []);
  } else {
    emit(
      "selection-change",
      props.data.map((r) => r.id as string)
    );
  }
};

const isAllSelected = computed(
  () => props.data.length > 0 && props.selectedIds.length === props.data.length
);
</script>

<template>
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th v-if="selectable" class="w-10">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleAllSelection"
              class="rounded border-gray-300"
            />
          </th>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="[
              column.class,
              { 'cursor-pointer hover:bg-gray-100': column.sortable },
            ]"
            @click="toggleSort(column)"
          >
            <div class="flex items-center gap-1">
              {{ column.label }}
              <svg
                v-if="column.sortable && sortBy === column.key"
                class="h-4 w-4"
                :class="{ 'rotate-180': sortOrder === 'asc' }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Loading State -->
        <tr v-if="loading">
          <td :colspan="columns.length + (selectable ? 1 : 0)" class="py-8">
            <div class="flex items-center justify-center gap-2">
              <svg
                class="h-5 w-5 animate-spin text-blue-600"
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
              <span class="text-gray-500">Memuat data...</span>
            </div>
          </td>
        </tr>

        <!-- Empty State -->
        <tr v-else-if="data.length === 0">
          <td :colspan="columns.length + (selectable ? 1 : 0)" class="py-8">
            <div class="text-center text-gray-500">
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
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p class="mt-2">Tidak ada data</p>
            </div>
          </td>
        </tr>

        <!-- Data Rows -->
        <tr
          v-else
          v-for="row in data"
          :key="row.id as string"
          class="cursor-pointer"
          @click="$emit('row-click', row)"
        >
          <td v-if="selectable" @click.stop>
            <input
              type="checkbox"
              :checked="isSelected(row.id as string)"
              @change="toggleSelection(row.id as string)"
              class="rounded border-gray-300"
            />
          </td>
          <td v-for="column in columns" :key="column.key">
            <slot
              :name="`cell-${column.key}`"
              :row="row"
              :value="row[column.key]"
            >
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

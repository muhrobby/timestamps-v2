<script setup lang="ts">
interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:page": [page: number];
}>();

const visiblePages = computed(() => {
  const pages: (number | string)[] = [];
  const current = props.page;
  const total = props.totalPages;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (current > 3) {
      pages.push("...");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push("...");
    }

    pages.push(total);
  }

  return pages;
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages) {
    emit("update:page", page);
  }
};

const showingFrom = computed(() => (props.page - 1) * props.limit + 1);
const showingTo = computed(() =>
  Math.min(props.page * props.limit, props.total)
);
</script>

<template>
  <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
    <p class="text-sm text-gray-600">
      Menampilkan {{ showingFrom }} - {{ showingTo }} dari {{ total }} data
    </p>

    <nav class="flex items-center gap-1" aria-label="Pagination">
      <button
        :disabled="page <= 1"
        @click="goToPage(page - 1)"
        class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <template v-for="p in visiblePages" :key="p">
        <span v-if="p === '...'" class="px-2 text-gray-400">...</span>
        <button
          v-else
          @click="goToPage(p as number)"
          :class="[
            'min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium',
            p === page
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          {{ p }}
        </button>
      </template>

      <button
        :disabled="page >= totalPages"
        @click="goToPage(page + 1)"
        class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </nav>
  </div>
</template>

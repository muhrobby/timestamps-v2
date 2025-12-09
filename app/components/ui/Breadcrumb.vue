<script setup lang="ts">
interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

const props = defineProps<Props>();
</script>

<template>
  <nav class="flex items-center space-x-2 text-sm">
    <NuxtLink
      to="/dashboard"
      class="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors"
    >
      <svg
        class="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
      <span>Home</span>
    </NuxtLink>

    <template v-for="(item, index) in items" :key="index">
      <svg
        class="h-4 w-4 text-gray-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M8.25 4.5l7.5 7.5-7.5 7.5"
        />
      </svg>

      <NuxtLink
        v-if="item.to"
        :to="item.to"
        class="text-gray-500 hover:text-gray-900 transition-colors"
      >
        {{ item.label }}
      </NuxtLink>
      <span v-else class="font-semibold text-gray-900">
        {{ item.label }}
      </span>
    </template>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute();

// Breadcrumb items based on current route
const breadcrumbItems = computed(() => {
  const path = route.path;
  const items: { label: string; to?: string }[] = [];

  if (path === "/dashboard") {
    items.push({ label: "Dashboard" });
  } else if (path === "/packing") {
    items.push({ label: "Packing" });
  } else if (path === "/history") {
    items.push({ label: "History" });
  } else if (path === "/users") {
    items.push({ label: "Users" });
  } else if (path === "/stores") {
    items.push({ label: "Stores" });
  } else if (path === "/settings") {
    items.push({ label: "Settings" });
  } else if (path.startsWith("/users/")) {
    items.push({ label: "Users", to: "/users" });
    items.push({ label: "Detail" });
  } else if (path.startsWith("/stores/")) {
    items.push({ label: "Stores", to: "/stores" });
    items.push({ label: "Detail" });
  }

  return items;
});
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Sidebar Component -->
    <UiSidebar />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden lg:ml-64">
      <!-- Top Bar with Breadcrumb and User Dropdown -->
      <header
        class="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4"
      >
        <div class="flex items-center justify-between">
          <!-- Breadcrumb -->
          <UiBreadcrumb :items="breadcrumbItems" />

          <!-- User Dropdown -->
          <UiUserDropdown />
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto p-6">
        <slot />
      </main>
    </div>

    <!-- Upload Progress Widget (if exists) -->
    <PackingUploadProgressWidget v-if="route.path === '/packing'" />
  </div>
</template>

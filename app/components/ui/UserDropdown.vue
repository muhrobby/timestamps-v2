<script setup lang="ts">
const { user, isAdmin, logout } = useAuth();
const isOpen = ref(false);

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const closeDropdown = () => {
  isOpen.value = false;
};

const handleLogout = async () => {
  await logout();
  navigateTo("/login");
};

// Close dropdown when clicking outside
onMounted(() => {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".user-dropdown-container")) {
      closeDropdown();
    }
  });
});
</script>

<template>
  <div class="user-dropdown-container relative">
    <!-- User Button -->
    <button
      @click="toggleDropdown"
      class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
    >
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-violet-500 text-white text-sm font-semibold"
      >
        {{ user?.name?.charAt(0).toUpperCase() }}
      </div>
      <div class="hidden sm:block text-left">
        <p class="text-sm font-semibold text-gray-900">{{ user?.name }}</p>
        <p class="text-xs text-gray-500">
          {{ isAdmin ? "Administrator" : "User" }}
        </p>
      </div>
      <svg
        :class="[
          'h-4 w-4 text-gray-500 transition-transform',
          { 'rotate-180': isOpen },
        ]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
        />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="isOpen" class="dropdown">
        <!-- User Info Section -->
        <div class="border-b border-gray-200 px-4 py-3">
          <p class="text-sm font-semibold text-gray-900">{{ user?.name }}</p>
          <p class="text-xs text-gray-500">{{ user?.email }}</p>
          <div class="mt-2 flex items-center gap-2">
            <span
              :class="[
                'badge text-xs',
                isAdmin ? 'badge-primary' : 'badge-secondary',
              ]"
            >
              {{ isAdmin ? "Admin" : "User" }}
            </span>
            <span class="badge badge-success text-xs">
              {{ user?.store?.storeName || "No Store" }}
            </span>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="py-1">
          <NuxtLink to="/profile" @click="closeDropdown" class="dropdown-item">
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
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            Profile
          </NuxtLink>

          <NuxtLink
            v-if="isAdmin"
            to="/settings"
            @click="closeDropdown"
            class="dropdown-item"
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
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </NuxtLink>

          <button @click="handleLogout" class="dropdown-item w-full">
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
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-item {
  @apply flex items-center gap-2;
}
</style>

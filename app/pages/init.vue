<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const isInitializing = ref(false);
const initResult = ref<{ success: boolean; message: string } | null>(null);
const error = ref<string | null>(null);

const handleInit = async () => {
  isInitializing.value = true;
  error.value = null;

  try {
    const response = await $fetch("/api/init", {
      method: "POST",
    });

    initResult.value = response as any;
    if ((response as any).success) {
      setTimeout(() => {
        navigateTo("/login");
      }, 2000);
    }
  } catch (err: any) {
    error.value = err.data?.message || "Terjadi kesalahan saat inisialisasi";
  } finally {
    isInitializing.value = false;
  }
};
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4"
  >
    <div class="w-full max-w-md rounded-xl bg-white shadow-lg">
      <div class="border-b border-gray-200 px-6 py-8">
        <h1 class="text-2xl font-bold text-gray-900">Inisialisasi Database</h1>
        <p class="mt-2 text-gray-600">Setup data default untuk aplikasi</p>
      </div>

      <div class="px-6 py-8">
        <div v-if="!initResult" class="space-y-6">
          <div class="rounded-lg bg-blue-50 p-4">
            <h2 class="font-semibold text-blue-900">Informasi Setup</h2>
            <ul class="mt-2 space-y-2 text-sm text-blue-800">
              <li>✓ Membuat 4 toko default</li>
              <li>✓ Membuat 3 user default (Admin, OPS, User)</li>
              <li>✓ Mengatur konfigurasi watermark</li>
            </ul>
          </div>

          <div v-if="error" class="rounded-lg bg-red-50 p-4">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <button
            @click="handleInit"
            :disabled="isInitializing"
            :class="{
              'opacity-50 cursor-not-allowed': isInitializing,
            }"
            class="btn-primary w-full py-3 font-semibold"
          >
            <svg
              v-if="isInitializing"
              class="mr-2 h-5 w-5 animate-spin"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span v-if="isInitializing">Menginisialisasi...</span>
            <span v-else>Mulai Setup</span>
          </button>
        </div>

        <div v-else class="space-y-6">
          <div
            :class="{
              'bg-green-50': initResult.success,
              'bg-red-50': !initResult.success,
            }"
            class="rounded-lg p-4"
          >
            <p
              :class="{
                'text-green-800': initResult.success,
                'text-red-800': !initResult.success,
              }"
            >
              {{ initResult.message }}
            </p>
          </div>

          <div v-if="initResult.success" class="space-y-4">
            <div class="rounded-lg bg-gray-50 p-4">
              <h3 class="font-semibold text-gray-900">
                Data Default Telah Dibuat
              </h3>
              <div class="mt-3 space-y-2 text-sm">
                <p class="text-gray-600">
                  <strong>Admin:</strong> admin@packing.com / admin123
                </p>
                <p class="text-gray-600">
                  <strong>OPS:</strong> ops@packing.com / ops123
                </p>
                <p class="text-gray-600">
                  <strong>User:</strong> user@packing.com / user123
                </p>
              </div>
            </div>

            <div class="rounded-lg bg-yellow-50 p-4">
              <p class="text-sm text-yellow-800">
                ⚠️ Silakan ubah password default setelah login pertama kali
                untuk keamanan maksimal.
              </p>
            </div>

            <p class="text-center text-sm text-gray-600">
              Mengarahkan ke halaman login...
            </p>
          </div>

          <div v-else>
            <NuxtLink
              to="/init"
              class="btn-secondary block w-full py-2 text-center font-semibold"
            >
              Coba Lagi
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

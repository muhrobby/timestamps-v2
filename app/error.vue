<script setup lang="ts">
import type { NuxtError } from "#app";

defineProps<{
  error: NuxtError;
}>();

const handleError = () => {
  clearError({ redirect: "/" });
};
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div class="text-center">
      <div class="mb-6 text-8xl font-bold text-blue-600">
        {{ error.statusCode }}
      </div>

      <h1 class="mb-2 text-2xl font-bold text-gray-900">
        <template v-if="error.statusCode === 404">
          Halaman Tidak Ditemukan
        </template>
        <template v-else-if="error.statusCode === 403">
          Akses Ditolak
        </template>
        <template v-else-if="error.statusCode === 500"> Server Error </template>
        <template v-else> Terjadi Kesalahan </template>
      </h1>

      <p class="mb-8 text-gray-600">
        <template v-if="error.statusCode === 404">
          Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
        </template>
        <template v-else-if="error.statusCode === 403">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </template>
        <template v-else-if="error.statusCode === 500">
          Terjadi kesalahan pada server. Silakan coba lagi nanti.
        </template>
        <template v-else>
          {{ error.message || "Terjadi kesalahan yang tidak terduga." }}
        </template>
      </p>

      <div class="flex justify-center gap-4">
        <button @click="handleError" class="btn-primary">
          Kembali ke Beranda
        </button>
        <NuxtLink to="/login" class="btn-secondary"> Login </NuxtLink>
      </div>
    </div>
  </div>
</template>

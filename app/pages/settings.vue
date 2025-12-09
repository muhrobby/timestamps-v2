<script setup lang="ts">
import type { Settings } from "~/types";

definePageMeta({
  layout: "default",
  middleware: "role",
  meta: {
    requiredRole: ["ADMIN"],
  },
});

const { post } = useApi();
const toast = useToast();

const isLoading = ref(true);
const isSubmitting = ref(false);

// Form data
const formData = ref({
  logoPosition: "top-left" as
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right",
  addressPosition: "bottom-left" as
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right",
  timestampPosition: "bottom-right" as
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right",
  companyName: "",
  companyAddress: "",
  logoUrl: "",
  googleDriveFolderId: "",
});

const positionOptions = [
  { value: "top-left", label: "Atas Kiri" },
  { value: "top-center", label: "Atas Tengah" },
  { value: "top-right", label: "Atas Kanan" },
  { value: "bottom-left", label: "Bawah Kiri" },
  { value: "bottom-center", label: "Bawah Tengah" },
  { value: "bottom-right", label: "Bawah Kanan" },
];

const fetchSettings = async () => {
  isLoading.value = true;

  try {
    const response = await $fetch<Settings>("/api/settings");
    if (response) {
      formData.value = {
        logoPosition: response.logoPosition || "top-left",
        addressPosition: response.addressPosition || "bottom-left",
        timestampPosition: response.timestampPosition || "bottom-right",
        companyName: response.companyName || "",
        companyAddress: response.companyAddress || "",
        logoUrl: response.logoUrl || "",
        googleDriveFolderId: response.googleDriveFolderId || "",
      };
    }
  } catch (error) {
    // Settings might not exist yet
    console.log("No settings found, using defaults");
  }

  isLoading.value = false;
};

const saveSettings = async () => {
  isSubmitting.value = true;

  const { data, error } = await post<Settings>("/api/settings", formData.value);

  isSubmitting.value = false;

  if (error) {
    toast.error("Gagal", error);
    return;
  }

  toast.success("Berhasil", "Pengaturan berhasil disimpan");
};

onMounted(() => {
  fetchSettings();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Pengaturan</h1>
      <p class="text-gray-600">Konfigurasi aplikasi</p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <svg
        class="h-8 w-8 animate-spin text-blue-600"
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
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <!-- Company Info -->
      <div class="card">
        <div class="card-header">
          <h2 class="text-lg font-semibold text-gray-900">
            Informasi Perusahaan
          </h2>
        </div>
        <div class="card-body space-y-4">
          <UiInput
            v-model="formData.companyName"
            label="Nama Perusahaan"
            placeholder="PT. Contoh Indonesia"
          />
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">
              Alamat Perusahaan
            </label>
            <textarea
              v-model="formData.companyAddress"
              rows="3"
              class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Jl. Contoh No. 123, Jakarta"
            />
          </div>
          <UiInput
            v-model="formData.logoUrl"
            label="URL Logo"
            placeholder="https://example.com/logo.png"
            hint="URL gambar logo perusahaan"
          />
        </div>
      </div>

      <!-- Google Drive -->
      <div class="card">
        <div class="card-header">
          <h2 class="text-lg font-semibold text-gray-900">Google Drive</h2>
        </div>
        <div class="card-body space-y-4">
          <UiInput
            v-model="formData.googleDriveFolderId"
            label="Folder ID Google Drive"
            placeholder="1abc123..."
            hint="ID folder Google Drive untuk menyimpan foto"
          />
          <div class="rounded-lg bg-blue-50 p-4">
            <h3 class="font-medium text-blue-800">
              Cara Mendapatkan Folder ID
            </h3>
            <ol
              class="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-700"
            >
              <li>Buka Google Drive</li>
              <li>Buat atau buka folder yang diinginkan</li>
              <li>
                Lihat URL di browser, contoh:
                <code class="rounded bg-blue-100 px-1"
                  >drive.google.com/drive/folders/<strong
                    >1abc123...</strong
                  ></code
                >
              </li>
              <li>Copy ID setelah "folders/"</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Watermark Positions -->
      <div class="card lg:col-span-2">
        <div class="card-header">
          <h2 class="text-lg font-semibold text-gray-900">Posisi Watermark</h2>
          <p class="text-sm text-gray-500">
            Atur posisi elemen yang ditampilkan pada foto
          </p>
        </div>
        <div class="card-body">
          <div class="grid gap-6 sm:grid-cols-3">
            <UiSelect
              v-model="formData.logoPosition"
              label="Posisi Logo"
              :options="positionOptions"
            />
            <UiSelect
              v-model="formData.addressPosition"
              label="Posisi Alamat"
              :options="positionOptions"
            />
            <UiSelect
              v-model="formData.timestampPosition"
              label="Posisi Timestamp"
              :options="positionOptions"
            />
          </div>

          <!-- Preview -->
          <div class="mt-6">
            <label class="mb-2 block text-sm font-medium text-gray-700"
              >Preview</label
            >
            <div
              class="relative aspect-video w-full max-w-2xl rounded-lg border-2 border-dashed border-gray-300 bg-gray-100"
            >
              <!-- Grid overlay for reference -->
              <div class="absolute inset-0 grid grid-cols-3 grid-rows-3">
                <div
                  v-for="pos in [
                    'top-left',
                    'top-center',
                    'top-right',
                    'middle-left',
                    'middle-center',
                    'middle-right',
                    'bottom-left',
                    'bottom-center',
                    'bottom-right',
                  ]"
                  :key="pos"
                  class="border border-gray-200"
                />
              </div>

              <!-- Logo position indicator -->
              <div
                class="absolute rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white"
                :class="{
                  'left-2 top-2': formData.logoPosition === 'top-left',
                  'left-1/2 top-2 -translate-x-1/2':
                    formData.logoPosition === 'top-center',
                  'right-2 top-2': formData.logoPosition === 'top-right',
                  'bottom-2 left-2': formData.logoPosition === 'bottom-left',
                  'bottom-2 left-1/2 -translate-x-1/2':
                    formData.logoPosition === 'bottom-center',
                  'bottom-2 right-2': formData.logoPosition === 'bottom-right',
                }"
              >
                Logo
              </div>

              <!-- Address position indicator -->
              <div
                class="absolute rounded bg-green-500 px-2 py-1 text-xs font-medium text-white"
                :class="{
                  'left-2 top-8': formData.addressPosition === 'top-left',
                  'left-1/2 top-8 -translate-x-1/2':
                    formData.addressPosition === 'top-center',
                  'right-2 top-8': formData.addressPosition === 'top-right',
                  'bottom-8 left-2': formData.addressPosition === 'bottom-left',
                  'bottom-8 left-1/2 -translate-x-1/2':
                    formData.addressPosition === 'bottom-center',
                  'bottom-8 right-2':
                    formData.addressPosition === 'bottom-right',
                }"
              >
                Alamat
              </div>

              <!-- Timestamp position indicator -->
              <div
                class="absolute rounded bg-orange-500 px-2 py-1 text-xs font-medium text-white"
                :class="{
                  'left-2 top-14': formData.timestampPosition === 'top-left',
                  'left-1/2 top-14 -translate-x-1/2':
                    formData.timestampPosition === 'top-center',
                  'right-2 top-14': formData.timestampPosition === 'top-right',
                  'bottom-14 left-2':
                    formData.timestampPosition === 'bottom-left',
                  'bottom-14 left-1/2 -translate-x-1/2':
                    formData.timestampPosition === 'bottom-center',
                  'bottom-14 right-2':
                    formData.timestampPosition === 'bottom-right',
                }"
              >
                Timestamp
              </div>

              <!-- Center text -->
              <div
                class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-gray-400"
              >
                <svg
                  class="mx-auto h-12 w-12"
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
                <p class="mt-1 text-sm">Preview Foto</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div v-if="!isLoading" class="flex justify-end">
      <UiButton
        variant="primary"
        size="lg"
        :loading="isSubmitting"
        @click="saveSettings"
      >
        Simpan Pengaturan
      </UiButton>
    </div>
  </div>
</template>

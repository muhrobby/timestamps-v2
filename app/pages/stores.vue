<script setup lang="ts">
import type { Store } from "~/types";

definePageMeta({
  layout: "default",
  middleware: "role",
  meta: {
    requiredRole: ["ADMIN", "OPS"],
  },
});

const { isAdmin } = useAuth();
const { get, post, put, del } = useApi();
const toast = useToast();

// Data
const stores = ref<Store[]>([]);
const isLoading = ref(true);
const search = ref("");
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = ref(1);
const sortBy = ref("createdAt");
const sortOrder = ref<"asc" | "desc">("desc");

// Modal states
const isCreateModalOpen = ref(false);
const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSubmitting = ref(false);

const selectedStore = ref<Store | null>(null);

// Form data
const formData = ref({
  storeCode: "",
  storeName: "",
});

const columns = [
  { key: "storeCode", label: "Kode Store", sortable: true },
  { key: "storeName", label: "Nama Store", sortable: true },
  { key: "userCount", label: "User" },
  { key: "packingCount", label: "Packing" },
  { key: "actions", label: "" },
];

const fetchStores = async () => {
  isLoading.value = true;

  const { data } = await get<{
    data: Store[];
    total: number;
    totalPages: number;
  }>("/api/stores", {
    page: page.value,
    limit: limit.value,
    search: search.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
  });

  if (data) {
    stores.value = data.data;
    total.value = data.total;
    totalPages.value = data.totalPages;
  }

  isLoading.value = false;
};

const handleSort = (key: string) => {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = key;
    sortOrder.value = "desc";
  }
  fetchStores();
};

const handleSearch = useDebounceFn(() => {
  page.value = 1;
  fetchStores();
}, 300);

const openCreateModal = () => {
  resetForm();
  isCreateModalOpen.value = true;
};

const openEditModal = (store: Store) => {
  selectedStore.value = store;
  formData.value = {
    storeCode: store.storeCode,
    storeName: store.storeName,
  };
  isEditModalOpen.value = true;
};

const openDeleteModal = (store: Store) => {
  selectedStore.value = store;
  isDeleteModalOpen.value = true;
};

const resetForm = () => {
  formData.value = {
    storeCode: "",
    storeName: "",
  };
};

const createStore = async () => {
  if (!formData.value.storeCode || !formData.value.storeName) {
    toast.error("Error", "Semua field wajib diisi");
    return;
  }

  isSubmitting.value = true;

  const { data, error } = await post<Store>("/api/stores", formData.value);

  isSubmitting.value = false;

  if (error) {
    toast.error("Gagal", error);
    return;
  }

  toast.success("Berhasil", "Store berhasil dibuat");
  isCreateModalOpen.value = false;
  fetchStores();
};

const updateStore = async () => {
  if (!selectedStore.value) return;

  isSubmitting.value = true;

  const { data, error } = await put<Store>(
    `/api/stores/${selectedStore.value.id}`,
    formData.value
  );

  isSubmitting.value = false;

  if (error) {
    toast.error("Gagal", error);
    return;
  }

  toast.success("Berhasil", "Store berhasil diupdate");
  isEditModalOpen.value = false;
  fetchStores();
};

const deleteStore = async () => {
  if (!selectedStore.value) return;

  isSubmitting.value = true;

  const { error } = await del(`/api/stores/${selectedStore.value.id}`);

  isSubmitting.value = false;

  if (error) {
    toast.error("Gagal", error);
    return;
  }

  toast.success("Berhasil", "Store berhasil dihapus");
  isDeleteModalOpen.value = false;
  fetchStores();
};

watch([page], () => {
  fetchStores();
});

onMounted(() => {
  fetchStores();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Manajemen Store</h1>
        <p class="text-gray-600">Kelola store/cabang</p>
      </div>
      <div v-if="isAdmin">
        <UiButton variant="primary" @click="openCreateModal">
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Tambah Store
        </UiButton>
      </div>
    </div>

    <!-- Search -->
    <div class="card">
      <div class="card-body">
        <UiInput
          v-model="search"
          placeholder="Cari store..."
          @input="handleSearch"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <UiDataTable
        :columns="columns"
        :data="stores"
        :loading="isLoading"
        :sort-by="sortBy"
        :sort-order="sortOrder"
        @sort="handleSort"
      >
        <template #cell-userCount="{ row }">
          {{ (row as any)._count?.users || 0 }}
        </template>

        <template #cell-packingCount="{ row }">
          {{ (row as unknown as Record<string, unknown>)._count?.packingRecords || 0 }}
        </template>

        <template #cell-actions="{ row }">
          <div v-if="isAdmin" class="flex gap-2">
            <button
              @click.stop="openEditModal(row as unknown as Store)"
              class="text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              @click.stop="openDeleteModal(row as unknown as Store)"
              class="text-red-600 hover:text-red-800"
              :disabled="((row as unknown as Record<string, unknown>)._count as Record<string, number>)?.users > 0"
              :class="{ 'opacity-50 cursor-not-allowed': ((row as unknown as Record<string, unknown>)._count as Record<string, number>)?.users > 0 }"
            >
              Hapus
            </button>
          </div>
        </template>
      </UiDataTable>

      <div v-if="totalPages > 1" class="border-t border-gray-200 px-6 py-4">
        <UiPagination
          v-model:page="page"
          :total="total"
          :total-pages="totalPages"
          :limit="limit"
        />
      </div>
    </div>

    <!-- Create Modal -->
    <UiModal v-model="isCreateModalOpen" title="Tambah Store" size="md">
      <form @submit.prevent="createStore" class="space-y-4">
        <UiInput
          v-model="formData.storeCode"
          label="Kode Store"
          placeholder="Contoh: JKT-01"
          required
        />
        <UiInput
          v-model="formData.storeName"
          label="Nama Store"
          placeholder="Nama lengkap store"
          required
        />
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isCreateModalOpen = false">
          Batal
        </UiButton>
        <UiButton
          variant="primary"
          :loading="isSubmitting"
          @click="createStore"
        >
          Simpan
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit Modal -->
    <UiModal v-model="isEditModalOpen" title="Edit Store" size="md">
      <form @submit.prevent="updateStore" class="space-y-4">
        <UiInput v-model="formData.storeCode" label="Kode Store" required />
        <UiInput v-model="formData.storeName" label="Nama Store" required />
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isEditModalOpen = false">
          Batal
        </UiButton>
        <UiButton
          variant="primary"
          :loading="isSubmitting"
          @click="updateStore"
        >
          Update
        </UiButton>
      </template>
    </UiModal>

    <!-- Delete Modal -->
    <UiModal v-model="isDeleteModalOpen" title="Hapus Store" size="sm">
      <p class="text-gray-600">
        Apakah Anda yakin ingin menghapus store
        <strong>{{ selectedStore?.storeName }}</strong
        >? Tindakan ini tidak dapat dibatalkan.
      </p>

      <template #footer>
        <UiButton variant="secondary" @click="isDeleteModalOpen = false">
          Batal
        </UiButton>
        <UiButton variant="danger" :loading="isSubmitting" @click="deleteStore">
          Hapus
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

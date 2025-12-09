<script setup lang="ts">
import type { User, Store, UserRole, BulkImportResult } from "~/types";

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
const users = ref<User[]>([]);
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
const isBulkImportModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSubmitting = ref(false);

const selectedUser = ref<User | null>(null);
const bulkImportFile = ref<File | null>(null);
const bulkImportResult = ref<BulkImportResult | null>(null);

// Form data
const formData = ref({
  email: "",
  password: "",
  name: "",
  role: "USER" as UserRole,
  storeId: "",
  isActive: true,
});

const columns = [
  { key: "name", label: "Nama", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "role", label: "Role" },
  { key: "store", label: "Store" },
  { key: "isActive", label: "Status" },
  { key: "actions", label: "" },
];

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "OPS", label: "OPS" },
  { value: "USER", label: "User" },
];

const storeOptions = computed(() =>
  stores.value.map((s) => ({
    value: s.id,
    label: `${s.storeCode} - ${s.storeName}`,
  }))
);

const fetchUsers = async () => {
  isLoading.value = true;

  const { data } = await get<{
    data: User[];
    total: number;
    totalPages: number;
  }>("/api/users", {
    page: page.value,
    limit: limit.value,
    search: search.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
  });

  if (data) {
    users.value = data.data;
    total.value = data.total;
    totalPages.value = data.totalPages;
  }

  isLoading.value = false;
};

const fetchStores = async () => {
  const { data } = await get<Store[]>("/api/stores/list");
  if (data) {
    stores.value = data;
  }
};

const handleSort = (key: string) => {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = key;
    sortOrder.value = "desc";
  }
  fetchUsers();
};

const handleSearch = useDebounceFn(() => {
  page.value = 1;
  fetchUsers();
}, 300);

const openCreateModal = () => {
  resetForm();
  isCreateModalOpen.value = true;
};

const openEditModal = (user: User) => {
  selectedUser.value = user;
  formData.value = {
    email: user.email,
    password: "",
    name: user.name,
    role: user.role,
    storeId: user.storeId,
    isActive: user.isActive,
  };
  isEditModalOpen.value = true;
};

const openDeleteModal = (user: User) => {
  selectedUser.value = user;
  isDeleteModalOpen.value = true;
};

const resetForm = () => {
  formData.value = {
    email: "",
    password: "",
    name: "",
    role: "USER",
    storeId: "",
    isActive: true,
  };
};

const createUser = async () => {
  if (
    !formData.value.email ||
    !formData.value.password ||
    !formData.value.name ||
    !formData.value.storeId
  ) {
    toast.error("Error", "Semua field wajib diisi");
    return;
  }

  isSubmitting.value = true;

  const { data, error } = await post<User>("/api/users", formData.value);

  isSubmitting.value = false;

  if (error) {
    toast.error("Gagal", error);
    return;
  }

  toast.success("Berhasil", "User berhasil dibuat");
  isCreateModalOpen.value = false;
  fetchUsers();
};

const updateUser = async () => {
  if (!selectedUser.value) return;

  isSubmitting.value = true;

  const updateData = { ...formData.value };
  if (!updateData.password) {
    delete (updateData as Record<string, unknown>).password;
  }

  const { data, error } = await put<User>(
    `/api/users/${selectedUser.value.id}`,
    updateData
  );

  isSubmitting.value = false;

  if (error) {
    toast.error("Gagal", error);
    return;
  }

  toast.success("Berhasil", "User berhasil diupdate");
  isEditModalOpen.value = false;
  fetchUsers();
};

const deleteUser = async () => {
  if (!selectedUser.value) return;

  isSubmitting.value = true;

  const { error } = await del(`/api/users/${selectedUser.value.id}`);

  isSubmitting.value = false;

  if (error) {
    toast.error("Gagal", error);
    return;
  }

  toast.success("Berhasil", "User berhasil dihapus");
  isDeleteModalOpen.value = false;
  fetchUsers();
};

const handleBulkImportFile = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files?.[0]) {
    bulkImportFile.value = target.files[0];
    bulkImportResult.value = null;
  }
};

const processBulkImport = async () => {
  if (!bulkImportFile.value) {
    toast.error("Error", "Pilih file CSV terlebih dahulu");
    return;
  }

  isSubmitting.value = true;

  try {
    const text = await bulkImportFile.value.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const headerLine = lines[0];
    if (!headerLine) {
      toast.error("Gagal", "File CSV kosong atau format tidak valid");
      return;
    }
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

    const users: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const values = line.split(",").map((v) => v.trim());
      const user: Record<string, string> = {};
      headers.forEach((header, index) => {
        user[header] = values[index] || "";
      });
      users.push(user);
    }

    const { data, error } = await post<BulkImportResult>(
      "/api/users/bulk-import",
      { users }
    );

    if (error) {
      toast.error("Gagal", error);
    } else if (data) {
      bulkImportResult.value = data;
      toast.success(
        "Selesai",
        `${data.success} berhasil, ${data.failed} gagal`
      );
      fetchUsers();
    }
  } catch (error) {
    toast.error("Error", "Format file tidak valid");
  }

  isSubmitting.value = false;
};

const downloadTemplate = () => {
  const headers = "email,name,password,role,storeCode";
  const example = "user@example.com,John Doe,password123,USER,HQ";
  const content = `${headers}\n${example}`;

  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "user_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
};

watch([page], () => {
  fetchUsers();
});

onMounted(() => {
  fetchUsers();
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
        <h1 class="text-2xl font-bold text-gray-900">Manajemen User</h1>
        <p class="text-gray-600">Kelola pengguna aplikasi</p>
      </div>
      <div v-if="isAdmin" class="flex gap-2">
        <UiButton variant="outline" @click="isBulkImportModalOpen = true">
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Bulk Import
        </UiButton>
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
          Tambah User
        </UiButton>
      </div>
    </div>

    <!-- Search -->
    <div class="card">
      <div class="card-body">
        <UiInput
          v-model="search"
          placeholder="Cari user..."
          @input="handleSearch"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <UiDataTable
        :columns="columns"
        :data="users"
        :loading="isLoading"
        :sort-by="sortBy"
        :sort-order="sortOrder"
        @sort="handleSort"
      >
        <template #cell-store="{ row }">
          {{ (row as unknown as User).store?.storeName }}
        </template>

        <template #cell-role="{ value }">
          <span
            :class="[
              'badge',
              value === 'ADMIN'
                ? 'badge-primary'
                : value === 'OPS'
                ? 'badge-warning'
                : 'badge-gray',
            ]"
          >
            {{ value }}
          </span>
        </template>

        <template #cell-isActive="{ value }">
          <span :class="['badge', value ? 'badge-success' : 'badge-danger']">
            {{ value ? "Aktif" : "Nonaktif" }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div v-if="isAdmin" class="flex gap-2">
            <button
              @click.stop="openEditModal(row as unknown as User)"
              class="text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              @click.stop="openDeleteModal(row as unknown as User)"
              class="text-red-600 hover:text-red-800"
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
    <UiModal v-model="isCreateModalOpen" title="Tambah User" size="md">
      <form @submit.prevent="createUser" class="space-y-4">
        <UiInput
          v-model="formData.email"
          type="email"
          label="Email"
          placeholder="user@example.com"
          required
        />
        <UiInput
          v-model="formData.name"
          label="Nama"
          placeholder="Nama lengkap"
          required
        />
        <UiInput
          v-model="formData.password"
          type="password"
          label="Password"
          placeholder="Min. 6 karakter"
          required
        />
        <UiSelect
          v-model="formData.role"
          :options="roleOptions"
          label="Role"
          required
        />
        <UiSelect
          v-model="formData.storeId"
          :options="storeOptions"
          label="Store"
          placeholder="Pilih store"
          required
        />
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            v-model="formData.isActive"
            class="rounded border-gray-300"
          />
          <label for="isActive" class="text-sm text-gray-700">Aktif</label>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isCreateModalOpen = false">
          Batal
        </UiButton>
        <UiButton variant="primary" :loading="isSubmitting" @click="createUser">
          Simpan
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit Modal -->
    <UiModal v-model="isEditModalOpen" title="Edit User" size="md">
      <form @submit.prevent="updateUser" class="space-y-4">
        <UiInput v-model="formData.email" type="email" label="Email" required />
        <UiInput v-model="formData.name" label="Nama" required />
        <UiInput
          v-model="formData.password"
          type="password"
          label="Password"
          placeholder="Kosongkan jika tidak diubah"
        />
        <UiSelect
          v-model="formData.role"
          :options="roleOptions"
          label="Role"
          required
        />
        <UiSelect
          v-model="formData.storeId"
          :options="storeOptions"
          label="Store"
          required
        />
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActiveEdit"
            v-model="formData.isActive"
            class="rounded border-gray-300"
          />
          <label for="isActiveEdit" class="text-sm text-gray-700">Aktif</label>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isEditModalOpen = false">
          Batal
        </UiButton>
        <UiButton variant="primary" :loading="isSubmitting" @click="updateUser">
          Update
        </UiButton>
      </template>
    </UiModal>

    <!-- Delete Modal -->
    <UiModal v-model="isDeleteModalOpen" title="Hapus User" size="sm">
      <p class="text-gray-600">
        Apakah Anda yakin ingin menghapus user
        <strong>{{ selectedUser?.name }}</strong
        >? Tindakan ini tidak dapat dibatalkan.
      </p>

      <template #footer>
        <UiButton variant="secondary" @click="isDeleteModalOpen = false">
          Batal
        </UiButton>
        <UiButton variant="danger" :loading="isSubmitting" @click="deleteUser">
          Hapus
        </UiButton>
      </template>
    </UiModal>

    <!-- Bulk Import Modal -->
    <UiModal v-model="isBulkImportModalOpen" title="Bulk Import User" size="lg">
      <div class="space-y-4">
        <div>
          <p class="text-sm text-gray-600 mb-2">
            Upload file CSV dengan format: email, name, password, role,
            storeCode
          </p>
          <UiButton variant="outline" size="sm" @click="downloadTemplate">
            Download Template
          </UiButton>
        </div>

        <div>
          <label class="label">File CSV</label>
          <input
            type="file"
            accept=".csv"
            @change="handleBulkImportFile"
            class="input"
          />
        </div>

        <div
          v-if="bulkImportResult"
          class="rounded-lg border border-gray-200 p-4"
        >
          <div class="flex items-center gap-4 mb-2">
            <span class="badge-success badge"
              >{{ bulkImportResult.success }} berhasil</span
            >
            <span class="badge-danger badge"
              >{{ bulkImportResult.failed }} gagal</span
            >
          </div>

          <div v-if="bulkImportResult.errors.length > 0" class="mt-3">
            <p class="text-sm font-medium text-gray-700 mb-2">Errors:</p>
            <div class="max-h-40 overflow-y-auto text-sm">
              <div
                v-for="err in bulkImportResult.errors"
                :key="err.row"
                class="text-red-600"
              >
                Row {{ err.row }}: {{ err.error }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="secondary" @click="isBulkImportModalOpen = false">
          Tutup
        </UiButton>
        <UiButton
          variant="primary"
          :loading="isSubmitting"
          :disabled="!bulkImportFile"
          @click="processBulkImport"
        >
          Import
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

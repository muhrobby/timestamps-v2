<script setup lang="ts">
import type { PackingRecordWithRelations } from "~/types";

definePageMeta({
  layout: "default",
});

const { get } = useApi();

const records = ref<PackingRecordWithRelations[]>([]);
const isLoading = ref(true);
const search = ref("");
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = ref(1);
const sortBy = ref("packedAt");
const sortOrder = ref<"asc" | "desc">("desc");

const selectedRecord = ref<PackingRecordWithRelations | null>(null);
const isDetailOpen = ref(false);

const columns = [
  { key: "invoiceNumber", label: "Invoice", sortable: true },
  { key: "packedAt", label: "Tanggal", sortable: true },
  { key: "store", label: "Store" },
  { key: "user", label: "User" },
  { key: "images", label: "Foto" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

const fetchRecords = async () => {
  isLoading.value = true;

  const { data, error } = await get<{
    data: PackingRecordWithRelations[];
    total: number;
    totalPages: number;
  }>("/api/packing", {
    page: page.value,
    limit: limit.value,
    search: search.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
  });

  if (data) {
    records.value = data.data;
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
  fetchRecords();
};

const handleSearch = useDebounceFn(() => {
  page.value = 1;
  fetchRecords();
}, 300);

const openDetail = (record: PackingRecordWithRelations) => {
  selectedRecord.value = record;
  isDetailOpen.value = true;
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getImageCount = (record: PackingRecordWithRelations) => {
  const before =
    record.images?.filter((i) => i.imageType === "BEFORE").length || 0;
  const after =
    record.images?.filter((i) => i.imageType === "AFTER").length || 0;
  return `${before}/${after}`;
};

const getStatus = (record: PackingRecordWithRelations) => {
  if (!record.images || record.images.length === 0)
    return { label: "No Photos", class: "badge-gray" };
  if (record.images.every((i) => i.uploadStatus === "COMPLETED"))
    return { label: "Selesai", class: "badge-success" };
  if (record.images.some((i) => i.uploadStatus === "FAILED"))
    return { label: "Gagal", class: "badge-danger" };
  return { label: "Proses", class: "badge-warning" };
};

watch([page], () => {
  fetchRecords();
});

onMounted(() => {
  fetchRecords();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-bold text-gray-900">History Packing</h1>
        <p class="text-gray-600">Riwayat dokumentasi packing</p>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="card">
      <div class="card-body">
        <div class="flex flex-col gap-4 sm:flex-row">
          <div class="flex-1">
            <UiInput
              v-model="search"
              placeholder="Cari invoice..."
              @input="handleSearch"
            >
              <template #prefix>
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </template>
            </UiInput>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <UiDataTable
        :columns="columns"
        :data="records"
        :loading="isLoading"
        :sort-by="sortBy"
        :sort-order="sortOrder"
        @sort="handleSort"
        @row-click="(row: Record<string, unknown>) => openDetail(row as unknown as PackingRecordWithRelations)"
      >
        <template #cell-packedAt="{ value }">
          {{ formatDate(value as Date) }}
        </template>

        <template #cell-store="{ row }">
          {{ (row as unknown as PackingRecordWithRelations).store?.storeName }}
        </template>

        <template #cell-user="{ row }">
          {{ (row as unknown as PackingRecordWithRelations).user?.name }}
        </template>

        <template #cell-images="{ row }">
          <span class="text-sm text-gray-600">
            B:
            {{
              (row as unknown as PackingRecordWithRelations).images?.filter(
                (i) => i.imageType === "BEFORE"
              ).length || 0
            }}
            / A:
            {{
              (row as unknown as PackingRecordWithRelations).images?.filter(
                (i) => i.imageType === "AFTER"
              ).length || 0
            }}
          </span>
        </template>

        <template #cell-status="{ row }">
          <span
            :class="['badge', getStatus(row as unknown as PackingRecordWithRelations).class]"
          >
            {{ getStatus(row as unknown as PackingRecordWithRelations).label }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <button
            @click.stop="
              openDetail(row as unknown as PackingRecordWithRelations)
            "
            class="text-blue-600 hover:text-blue-800"
          >
            Detail
          </button>
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

    <!-- Detail Modal -->
    <UiModal
      v-model="isDetailOpen"
      :title="`Invoice: ${selectedRecord?.invoiceNumber}`"
      size="xl"
    >
      <div v-if="selectedRecord" class="space-y-6">
        <!-- Info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-600">Tanggal</p>
            <p class="font-medium">{{ formatDate(selectedRecord.packedAt) }}</p>
          </div>
          <div>
            <p class="text-gray-600">Store</p>
            <p class="font-medium">{{ selectedRecord.store?.storeName }}</p>
          </div>
          <div>
            <p class="text-gray-600">User</p>
            <p class="font-medium">{{ selectedRecord.user?.name }}</p>
          </div>
          <div>
            <p class="text-gray-600">Status</p>
            <span :class="['badge', getStatus(selectedRecord).class]">
              {{ getStatus(selectedRecord).label }}
            </span>
          </div>
          <div v-if="selectedRecord.notes" class="col-span-2">
            <p class="text-gray-600">Notes</p>
            <p class="font-medium">{{ selectedRecord.notes }}</p>
          </div>
        </div>

        <!-- Before Photos -->
        <div>
          <h3 class="mb-3 font-semibold text-gray-900">
            Foto Before ({{
              selectedRecord.images?.filter((i) => i.imageType === "BEFORE")
                .length || 0
            }})
          </h3>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <a
              v-for="image in selectedRecord.images?.filter(
                (i) => i.imageType === 'BEFORE'
              )"
              :key="image.id"
              :href="image.driveUrl || '#'"
              target="_blank"
              class="aspect-square overflow-hidden rounded-lg border border-gray-200 hover:opacity-80"
            >
              <img
                v-if="image.driveUrl"
                :src="image.driveUrl"
                :alt="image.fileName"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400"
              >
                <svg
                  class="h-8 w-8"
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
              </div>
            </a>
          </div>
        </div>

        <!-- After Photos -->
        <div>
          <h3 class="mb-3 font-semibold text-gray-900">
            Foto After ({{
              selectedRecord.images?.filter((i) => i.imageType === "AFTER")
                .length || 0
            }})
          </h3>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <a
              v-for="image in selectedRecord.images?.filter(
                (i) => i.imageType === 'AFTER'
              )"
              :key="image.id"
              :href="image.driveUrl || '#'"
              target="_blank"
              class="aspect-square overflow-hidden rounded-lg border border-gray-200 hover:opacity-80"
            >
              <img
                v-if="image.driveUrl"
                :src="image.driveUrl"
                :alt="image.fileName"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400"
              >
                <svg
                  class="h-8 w-8"
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
              </div>
            </a>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="secondary" @click="isDetailOpen = false">
          Tutup
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

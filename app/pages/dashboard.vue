<script setup lang="ts">
import type { PackingRecordWithRelations } from "~/types";

definePageMeta({
  layout: "default",
});

const { user, isAdmin, isOps } = useAuth();
const { get } = useApi();

const stats = ref({
  totalRecords: 0,
  todayRecords: 0,
  weekRecords: 0,
  monthRecords: 0,
  pendingUploads: 0,
  completedUploads: 0,
  failedUploads: 0,
  totalPhotos: 0,
  totalUsers: 0,
  totalStores: 0,
  successRate: 0,
  storageUsed: "0 MB",
});

const recentRecords = ref<PackingRecordWithRelations[]>([]);
const isLoading = ref(true);

// Chart data for activity
const activityData = ref({
  labels: [] as string[],
  datasets: [
    {
      label: "Packing Records",
      data: [] as number[],
    },
  ],
});

const fetchDashboardData = async () => {
  isLoading.value = true;

  try {
    // Fetch recent packing records
    const { data: packingData } = await get<{
      data: PackingRecordWithRelations[];
      total: number;
    }>("/api/packing", { limit: 10 });

    if (packingData) {
      recentRecords.value = packingData.data;
      stats.value.totalRecords = packingData.total;

      // Calculate total photos
      stats.value.totalPhotos = recentRecords.value.reduce(
        (count, record) => count + (record.images?.length || 0),
        0
      );

      // Calculate upload statistics
      const allImages = recentRecords.value.flatMap((r) => r.images || []);
      stats.value.completedUploads = allImages.filter(
        (i) => i.uploadStatus === "COMPLETED"
      ).length;
      stats.value.pendingUploads = allImages.filter(
        (i) => i.uploadStatus === "PENDING" || i.uploadStatus === "UPLOADING"
      ).length;
      stats.value.failedUploads = allImages.filter(
        (i) => i.uploadStatus === "FAILED"
      ).length;

      // Calculate success rate
      if (allImages.length > 0) {
        stats.value.successRate = Math.round(
          (stats.value.completedUploads / allImages.length) * 100
        );
      }

      // Count records by time period
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now.setDate(now.getDate() - 7));
      const monthStart = new Date(now.setMonth(now.getMonth() - 1));

      stats.value.todayRecords = recentRecords.value.filter(
        (r) => new Date(r.packedAt) >= todayStart
      ).length;
      stats.value.weekRecords = recentRecords.value.filter(
        (r) => new Date(r.packedAt) >= weekStart
      ).length;
      stats.value.monthRecords = recentRecords.value.filter(
        (r) => new Date(r.packedAt) >= monthStart
      ).length;

      // Estimate storage (rough calculation: 500KB per photo)
      const storageMB = Math.round(stats.value.totalPhotos * 0.5 * 100) / 100;
      stats.value.storageUsed =
        storageMB > 1000
          ? `${(storageMB / 1024).toFixed(2)} GB`
          : `${storageMB} MB`;
    }

    // Fetch user count (admin only)
    if (isAdmin.value) {
      const { data: usersData } = await get<{ total: number }>("/api/users");
      if (usersData) {
        stats.value.totalUsers = usersData.total || 0;
      }

      const { data: storesData } = await get<{ total: number }>("/api/stores");
      if (storesData) {
        stats.value.totalStores = storesData.total || 0;
      }
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Compute stats data for UiStatsCards component
const statsItems = computed(() => [
  {
    label: "Total Packing",
    value: stats.value.totalRecords,
    color: "blue" as const,
    sublabel: "Total keseluruhan",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>`,
  },
  {
    label: "Hari Ini",
    value: stats.value.todayRecords,
    color: "green" as const,
    sublabel: "Packing hari ini",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>`,
  },
  {
    label: "Minggu Ini",
    value: stats.value.weekRecords,
    color: "indigo" as const,
    sublabel: "7 hari terakhir",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>`,
  },
  {
    label: "Bulan Ini",
    value: stats.value.monthRecords,
    color: "purple" as const,
    sublabel: "30 hari terakhir",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>`,
  },
  {
    label: "Pending Upload",
    value: stats.value.pendingUploads,
    color: "orange" as const,
    sublabel: "Menunggu upload",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
  },
  {
    label: "Total Foto",
    value: stats.value.totalPhotos,
    color: "red" as const,
    sublabel: "Semua foto",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>`,
  },
]);

// Additional stats for admin
const adminStatsItems = computed(() => [
  {
    label: "Success Rate",
    value: `${stats.value.successRate}%`,
    color: "green" as const,
    sublabel: "Upload berhasil",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
  },
  {
    label: "Storage",
    value: stats.value.storageUsed,
    color: "indigo" as const,
    sublabel: "Ruang terpakai",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>`,
  },
  {
    label: "Total Users",
    value: stats.value.totalUsers,
    color: "purple" as const,
    sublabel: "Pengguna terdaftar",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>`,
  },
  {
    label: "Total Stores",
    value: stats.value.totalStores,
    color: "orange" as const,
    sublabel: "Toko terdaftar",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>`,
  },
]);

onMounted(() => {
  fetchDashboardData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Modern Header -->
    <div class="card card-elevated">
      <div class="card-body">
        <div class="flex items-center gap-4">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-500/30"
          >
            <svg
              class="h-8 w-8 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p class="text-gray-600">
              Selamat datang kembali,
              <span class="font-semibold">{{ user?.name }}</span
              >!
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="card">
          <div class="card-body">
            <div class="skeleton h-24 w-full"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Statistics -->
    <div v-else>
      <UiStatsCards :stats="statsItems" layout="grid" />
    </div>

    <!-- Admin Statistics -->
    <div v-if="!isLoading && isAdmin">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-900">
          Statistik Administrator
        </h2>
        <p class="text-sm text-gray-600">
          Informasi sistem dan manajemen pengguna
        </p>
      </div>
      <UiStatsCards :stats="adminStatsItems" layout="grid" />
    </div>

    <!-- Legacy Stats Grid (keeping for reference, but hidden) -->
    <div v-if="false" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="card">
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600"
            >
              📦
            </div>
            <div>
              <p class="text-sm text-gray-600">Total Packing</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ stats.totalRecords }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600"
            >
              📅
            </div>
            <div>
              <p class="text-sm text-gray-600">Hari Ini</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ stats.todayRecords }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600"
            >
              ⏳
            </div>
            <div>
              <p class="text-sm text-gray-600">Pending Upload</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ stats.pendingUploads }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isAdmin || isOps" class="card">
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600"
            >
              👥
            </div>
            <div>
              <p class="text-sm text-gray-600">Store</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ user?.storeName }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card">
      <div class="card-header">
        <h2 class="text-lg font-semibold text-gray-900">Quick Actions</h2>
      </div>
      <div class="card-body">
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/packing" class="btn-primary">
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
            Packing Baru
          </NuxtLink>
          <NuxtLink to="/history" class="btn-secondary">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Lihat History
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Recent Records -->
    <div class="card">
      <div class="card-header flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Packing Terakhir</h2>
        <NuxtLink to="/history" class="text-sm text-blue-600 hover:underline">
          Lihat Semua
        </NuxtLink>
      </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Tanggal</th>
              <th>Store</th>
              <th>User</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="5" class="py-8 text-center">
                <div class="skeleton mx-auto h-4 w-32"></div>
              </td>
            </tr>
            <tr v-else-if="recentRecords.length === 0">
              <td colspan="5" class="py-8 text-center text-gray-500">
                Belum ada data packing
              </td>
            </tr>
            <tr v-else v-for="record in recentRecords" :key="record.id">
              <td class="font-medium">{{ record.invoiceNumber }}</td>
              <td>{{ formatDate(record.packedAt) }}</td>
              <td>{{ record.store?.storeName }}</td>
              <td>{{ record.user?.name }}</td>
              <td>
                <span
                  :class="[
                    'badge',
                    record.images?.every((i) => i.uploadStatus === 'COMPLETED')
                      ? 'badge-success'
                      : record.images?.some((i) => i.uploadStatus === 'FAILED')
                      ? 'badge-danger'
                      : 'badge-warning',
                  ]"
                >
                  {{
                    record.images?.every((i) => i.uploadStatus === "COMPLETED")
                      ? "Selesai"
                      : record.images?.some((i) => i.uploadStatus === "FAILED")
                      ? "Gagal"
                      : "Proses"
                  }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const { login, isAuthenticated } = useAuth();
const toast = useToast();
const router = useRouter();

const form = reactive({
  email: "",
  password: "",
});

const isLoading = ref(false);
const errorMessage = ref("");

const handleSubmit = async () => {
  if (!form.email || !form.password) {
    errorMessage.value = "Email dan password harus diisi";
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await login(form.email, form.password);
    toast.success("Login berhasil", "Selamat datang!");
    router.push("/dashboard");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Login gagal";
  } finally {
    isLoading.value = false;
  }
};

// Redirect if already authenticated
onMounted(() => {
  if (isAuthenticated.value) {
    router.push("/dashboard");
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600 text-3xl text-white"
        >
          📦
        </div>
        <h1 class="mt-4 text-2xl font-bold text-gray-900">
          Packing Documentation
        </h1>
        <p class="mt-1 text-gray-600">Silakan login untuk melanjutkan</p>
      </div>

      <!-- Login Form -->
      <div class="card">
        <div class="card-body">
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <UiInput
              v-model="form.email"
              type="email"
              label="Email"
              placeholder="Masukkan email"
              required
            />

            <UiInput
              v-model="form.password"
              type="password"
              label="Password"
              placeholder="Masukkan password"
              required
            />

            <div
              v-if="errorMessage"
              class="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {{ errorMessage }}
            </div>

            <UiButton
              type="submit"
              variant="primary"
              :loading="isLoading"
              block
            >
              Login
            </UiButton>
          </form>
        </div>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-center text-sm text-gray-500">
        &copy; {{ new Date().getFullYear() }} Packing Documentation System
      </p>
    </div>
  </div>
</template>

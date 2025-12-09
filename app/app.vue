<script setup lang="ts">
const { initAuth } = useAuth();

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UiToast />
  </div>
</template>

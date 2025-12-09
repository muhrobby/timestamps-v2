<script setup lang="ts">
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  scan: [code: string];
}>();

const scannerId = `scanner-${Math.random().toString(36).slice(2, 9)}`;
let html5QrCode: Html5Qrcode | null = null;

const isScanning = ref(false);
const error = ref<string | null>(null);

const startScanning = async () => {
  if (!props.modelValue) return;

  try {
    error.value = null;
    html5QrCode = new Html5Qrcode(scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ],
      verbose: false,
    });

    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        emit("scan", decodedText);
        stopScanning();
        emit("update:modelValue", false);
      },
      () => {
        // Scan error - ignore
      }
    );

    isScanning.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Gagal memulai scanner";
    console.error("Scanner error:", err);
  }
};

const stopScanning = async () => {
  if (html5QrCode && isScanning.value) {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch {
      // Ignore stop errors
    }
    isScanning.value = false;
  }
};

const close = () => {
  stopScanning();
  emit("update:modelValue", false);
};

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        startScanning();
      });
    } else {
      stopScanning();
    }
  }
);

onUnmounted(() => {
  stopScanning();
});
</script>

<template>
  <UiModal
    v-model="props.modelValue"
    title="Scan Barcode"
    size="md"
    @update:model-value="close"
  >
    <div class="space-y-4">
      <div
        :id="scannerId"
        class="min-h-[300px] overflow-hidden rounded-lg bg-black"
      />

      <p v-if="error" class="text-center text-sm text-red-500">
        {{ error }}
      </p>

      <p class="text-center text-sm text-gray-500">
        Arahkan kamera ke barcode atau QR code
      </p>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="close"> Tutup </UiButton>
    </template>
  </UiModal>
</template>

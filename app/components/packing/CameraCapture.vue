<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";

interface CameraProps {
  type: "before" | "after";
  maxPhotos?: number;
}

const props = withDefaults(defineProps<CameraProps>(), {
  maxPhotos: 5,
});

const emit = defineEmits<{
  (e: "photoTaken", file: File): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const stream = ref<MediaStream | null>(null);
const isCameraActive = ref(false);
const isCapturing = ref(false);
const capturedPhoto = ref<string | null>(null);
const currentLocation = ref<{ lat: number; lng: number } | null>(null);
const currentAddress = ref<string>("Memuat lokasi...");
const isLoadingLocation = ref(false);

// Camera switching
const facingMode = ref<"environment" | "user">("environment"); // environment = back camera
const availableCameras = ref<MediaDeviceInfo[]>([]);
const selectedCameraId = ref<string | null>(null);
const showCameraSelector = ref(false);

// Geolocation fallback
const locationPermissionDenied = ref(false);
const manualLocationInput = ref(false);

// Watermark settings (will be loaded from API)
const watermarkSettings = ref({
  companyName: "PT. Contoh Indonesia",
  companyAddress: "Jl. Contoh Alamat No. 123, Jakarta 12345",
  logoUrl: "",
  logoPosition: "top-left" as const,
  addressPosition: "bottom-left" as const,
  timestampPosition: "bottom-right" as const,
});

const currentDateTime = computed(() => {
  const now = new Date();
  const date = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${date} ${time}`;
});

const getCurrentLocation = async () => {
  isLoadingLocation.value = true;
  locationPermissionDenied.value = false;

  try {
    if (!navigator.geolocation) {
      // Geolocation not supported - use fallback
      currentAddress.value = watermarkSettings.value.companyAddress;
      isLoadingLocation.value = false;
      return;
    }

    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      }
    );

    currentLocation.value = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    // Reverse geocoding menggunakan Nominatim (OpenStreetMap)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "PackingApp/1.0",
          },
        }
      );

      const data = await response.json();

      if (data.display_name) {
        // Format alamat yang lebih ringkas
        const addr = data.address || {};
        const parts = [
          addr.road || addr.suburb || addr.neighbourhood,
          addr.city || addr.town || addr.village,
          addr.state,
        ].filter(Boolean);

        currentAddress.value = parts.join(", ") || data.display_name;
      } else {
        currentAddress.value = `${position.coords.latitude.toFixed(
          6
        )}, ${position.coords.longitude.toFixed(6)}`;
      }
    } catch (geoError) {
      console.error("Error reverse geocoding:", geoError);
      currentAddress.value = `${position.coords.latitude.toFixed(
        6
      )}, ${position.coords.longitude.toFixed(6)}`;
    }
  } catch (error) {
    console.error("Error getting location:", error);

    // Check if permission was denied
    if (
      error instanceof GeolocationPositionError &&
      error.code === error.PERMISSION_DENIED
    ) {
      locationPermissionDenied.value = true;
      currentAddress.value =
        "📍 Lokasi ditolak - gunakan alamat default atau input manual";
    } else {
      // Timeout or other errors - use fallback
      currentAddress.value = watermarkSettings.value.companyAddress;
    }
  } finally {
    isLoadingLocation.value = false;
  }
};

const requestLocationPermission = async () => {
  manualLocationInput.value = false;
  await getCurrentLocation();
};

const useManualLocation = () => {
  manualLocationInput.value = true;
  currentAddress.value = watermarkSettings.value.companyAddress;
  currentLocation.value = null;
  locationPermissionDenied.value = false;
};

const skipLocation = () => {
  currentAddress.value = watermarkSettings.value.companyAddress;
  currentLocation.value = null;
  locationPermissionDenied.value = false;
  manualLocationInput.value = false;
};

const loadSettings = async () => {
  try {
    const response = await fetch("/api/settings");
    const data = await response.json();
    if (data.success && data.settings) {
      watermarkSettings.value = {
        companyName:
          data.settings.companyName || watermarkSettings.value.companyName,
        companyAddress:
          data.settings.companyAddress ||
          watermarkSettings.value.companyAddress,
        logoUrl: data.settings.logoUrl || "",
        logoPosition: data.settings.logoPosition || "top-left",
        addressPosition: data.settings.addressPosition || "bottom-left",
        timestampPosition: data.settings.timestampPosition || "bottom-right",
      };
    }
  } catch (error) {
    console.error("Error loading watermark settings:", error);
  }
};

const listAvailableCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras.value = devices.filter(
      (device) => device.kind === "videoinput"
    );
  } catch (error) {
    console.error("Error listing cameras:", error);
  }
};

const startCamera = async () => {
  try {
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: selectedCameraId.value
        ? {
            deviceId: { exact: selectedCameraId.value },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          }
        : {
            facingMode: facingMode.value, // environment = back, user = front
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
    };

    stream.value = await navigator.mediaDevices.getUserMedia(constraints);

    if (videoRef.value) {
      videoRef.value.srcObject = stream.value;
      isCameraActive.value = true;

      // Load current location saat kamera dibuka
      getCurrentLocation();

      // List available cameras after first access
      if (availableCameras.value.length === 0) {
        await listAvailableCameras();
      }
    }
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Tidak dapat mengakses kamera. Pastikan permission sudah diberikan.");
  }
};

const switchCamera = async () => {
  stopCamera();
  // Toggle between front and back camera
  facingMode.value =
    facingMode.value === "environment" ? "user" : "environment";
  await startCamera();
};

const selectCamera = async (deviceId: string) => {
  stopCamera();
  selectedCameraId.value = deviceId;
  showCameraSelector.value = false;
  await startCamera();
};

const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop());
    stream.value = null;
    isCameraActive.value = false;
  }
};

const drawWatermark = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) => {
  const padding = 20;
  const lineHeight = 30;

  // Set font and style
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "white";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 8;

  // Draw timestamp
  const timestamp = currentDateTime.value;
  const timestampMetrics = ctx.measureText(timestamp);
  let timestampX = padding;
  let timestampY = canvas.height - padding;

  if (watermarkSettings.value.timestampPosition.includes("top")) {
    timestampY = padding + lineHeight;
  }
  if (watermarkSettings.value.timestampPosition.includes("right")) {
    timestampX = canvas.width - timestampMetrics.width - padding;
  }
  if (watermarkSettings.value.timestampPosition.includes("center")) {
    timestampX = (canvas.width - timestampMetrics.width) / 2;
  }

  ctx.strokeText(timestamp, timestampX, timestampY);
  ctx.fillText(timestamp, timestampX, timestampY);

  // Draw address
  ctx.font = "20px Arial";
  const addressLines = [
    watermarkSettings.value.companyName,
    currentAddress.value,
  ];

  let addressY = canvas.height - padding - lineHeight;
  if (watermarkSettings.value.addressPosition.includes("top")) {
    addressY = padding + lineHeight * 2;
  }

  addressLines.forEach((line, index) => {
    if (!line) return;

    const metrics = ctx.measureText(line);
    let addressX = padding;

    if (watermarkSettings.value.addressPosition.includes("right")) {
      addressX = canvas.width - metrics.width - padding;
    }
    if (watermarkSettings.value.addressPosition.includes("center")) {
      addressX = (canvas.width - metrics.width) / 2;
    }

    const y = watermarkSettings.value.addressPosition.includes("top")
      ? addressY + index * lineHeight
      : addressY - (addressLines.length - 1 - index) * lineHeight;

    ctx.strokeText(line, addressX, y);
    ctx.fillText(line, addressX, y);
  });

  // Draw logo if available
  // (Logo will be drawn separately if logoUrl is provided)
  if (watermarkSettings.value.logoUrl) {
    // Logo handling will be implemented in drawLogoOnCanvas
  }

  // Draw photo type badge
  ctx.font = "bold 28px Arial";
  const badge = props.type === "before" ? "BEFORE" : "AFTER";
  const badgeMetrics = ctx.measureText(badge);
  const badgeX = (canvas.width - badgeMetrics.width) / 2;
  const badgeY = padding + lineHeight;

  // Badge background
  ctx.fillStyle =
    props.type === "before"
      ? "rgba(59, 130, 246, 0.8)"
      : "rgba(16, 185, 129, 0.8)";
  ctx.fillRect(
    badgeX - 10,
    badgeY - lineHeight + 5,
    badgeMetrics.width + 20,
    lineHeight + 10
  );

  // Badge text
  ctx.fillStyle = "white";
  ctx.fillText(badge, badgeX, badgeY);
};

const capturePhoto = async () => {
  if (!videoRef.value || !canvasRef.value) return;

  isCapturing.value = true;

  try {
    const video = videoRef.value;
    const canvas = canvasRef.value;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw watermarks
    drawWatermark(ctx, canvas);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const timestamp = Date.now();
        const fileName = `${props.type}_${timestamp}.jpg`;
        const file = new File([blob], fileName, { type: "image/jpeg" });

        // Show preview
        capturedPhoto.value = URL.createObjectURL(blob);

        // Emit to parent (parent will auto-save without modal)
        emit("photoTaken", file);

        // Cleanup preview to prepare for next photo
        setTimeout(() => {
          if (capturedPhoto.value) {
            URL.revokeObjectURL(capturedPhoto.value);
            capturedPhoto.value = null;
          }
        }, 100);

        // DON'T stop camera - keep it open for continuous shooting
        // stopCamera(); // REMOVED: kamera tetap buka untuk foto berikutnya
        isCapturing.value = false;
      },
      "image/jpeg",
      0.95
    );
  } catch (error) {
    console.error("Error capturing photo:", error);
    isCapturing.value = false;
  }
};

const refreshLocation = () => {
  getCurrentLocation();
};

onMounted(() => {
  loadSettings();
});

onUnmounted(() => {
  stopCamera();
  if (capturedPhoto.value) {
    URL.revokeObjectURL(capturedPhoto.value);
  }
});
</script>

<template>
  <div class="camera-container">
    <div class="camera-wrapper">
      <!-- Video Preview with Live Watermark Overlay -->
      <div class="video-container" :class="{ active: isCameraActive }">
        <video
          ref="videoRef"
          autoplay
          playsinline
          class="video-feed"
          @loadedmetadata="() => videoRef?.play()"
        ></video>

        <!-- Live Watermark Overlay -->
        <div v-if="isCameraActive" class="watermark-overlay">
          <!-- Timestamp -->
          <div
            class="watermark-item timestamp"
            :class="`position-${watermarkSettings.timestampPosition}`"
          >
            {{ currentDateTime }}
          </div>

          <!-- Address -->
          <div
            class="watermark-item address"
            :class="`position-${watermarkSettings.addressPosition}`"
          >
            <div class="company-name">{{ watermarkSettings.companyName }}</div>
            <div class="company-address">
              <span v-if="isLoadingLocation">📍 Memuat lokasi...</span>
              <span v-else>{{ currentAddress }}</span>
            </div>
          </div>

          <!-- Photo Type Badge -->
          <div class="photo-badge" :class="type">
            {{ type === "before" ? "BEFORE" : "AFTER" }}
          </div>
        </div>
      </div>

      <!-- Hidden canvas for capturing -->
      <canvas ref="canvasRef" style="display: none"></canvas>

      <!-- Geolocation Fallback UI -->
      <div v-if="locationPermissionDenied" class="location-fallback-banner">
        <div class="fallback-content">
          <svg
            class="icon-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div class="fallback-text">
            <p class="font-semibold">Izin lokasi ditolak</p>
            <p class="text-sm">
              Foto akan menggunakan alamat default perusahaan atau Anda dapat
              skip lokasi
            </p>
          </div>
          <div class="fallback-actions">
            <button
              @click="requestLocationPermission"
              class="btn-retry"
              type="button"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Coba Lagi
            </button>
            <button @click="skipLocation" class="btn-skip" type="button">
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              Skip
            </button>
          </div>
        </div>
      </div>

      <!-- Camera Selector Dropdown -->
      <div
        v-if="showCameraSelector && availableCameras.length > 1"
        class="camera-selector-dropdown"
      >
        <div class="selector-header">
          <h4 class="text-sm font-semibold text-gray-900">Pilih Kamera</h4>
          <button
            @click="showCameraSelector = false"
            class="btn-close"
            type="button"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="selector-list">
          <button
            v-for="camera in availableCameras"
            :key="camera.deviceId"
            @click="selectCamera(camera.deviceId)"
            class="selector-item"
            :class="{ active: camera.deviceId === selectedCameraId }"
            type="button"
          >
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
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{{
              camera.label || `Kamera ${availableCameras.indexOf(camera) + 1}`
            }}</span>
            <svg
              v-if="camera.deviceId === selectedCameraId"
              class="h-5 w-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Captured Photo Preview -->
      <transition name="fade">
        <div v-if="capturedPhoto" class="captured-preview">
          <img :src="capturedPhoto" alt="Captured photo" />
          <div class="capture-success">✓ Foto berhasil diambil!</div>
        </div>
      </transition>

      <!-- Camera Controls -->
      <div class="camera-controls">
        <button
          v-if="!isCameraActive"
          @click="startCamera"
          class="btn-primary btn-camera"
          type="button"
        >
          <svg
            class="icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Buka Kamera
        </button>

        <div v-else class="active-controls">
          <button
            @click="capturePhoto"
            :disabled="isCapturing"
            class="btn-capture"
            type="button"
          >
            <div class="capture-ring">
              <div class="capture-button"></div>
            </div>
          </button>

          <button
            @click="stopCamera"
            class="btn-secondary btn-stop"
            type="button"
          >
            <svg
              class="icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Tutup Kamera
          </button>

          <button
            v-if="availableCameras.length <= 2"
            @click="switchCamera"
            class="btn-secondary btn-switch"
            type="button"
            title="Toggle front/back camera"
          >
            <svg
              class="icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span class="hidden sm:inline">Ganti Kamera</span>
          </button>

          <button
            v-else
            @click="showCameraSelector = !showCameraSelector"
            class="btn-secondary btn-switch"
            type="button"
            title="Pilih kamera"
          >
            <svg
              class="icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            <span class="hidden sm:inline"
              >Pilih Kamera ({{ availableCameras.length }})</span
            >
          </button>

          <button
            @click="refreshLocation"
            :disabled="isLoadingLocation"
            class="btn-secondary btn-location"
            type="button"
            title="Refresh lokasi"
          >
            <svg
              class="icon"
              :class="{ 'animate-spin': isLoadingLocation }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Refresh Lokasi
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.camera-wrapper {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.video-container {
  position: relative;
  width: 100%;
  min-height: 400px;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-container.active {
  min-height: 0;
}

.video-feed {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

/* Watermark Overlay */
.watermark-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}

.watermark-item {
  position: absolute;
  color: white;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.timestamp {
  font-size: 20px;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.address {
  font-size: 16px;
}

.company-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.company-address {
  font-size: 14px;
  opacity: 0.9;
}

/* Position classes */
.position-top-left {
  top: 20px;
  left: 20px;
}

.position-top-center {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.position-top-right {
  top: 20px;
  right: 20px;
}

.position-bottom-left {
  bottom: 80px;
  left: 20px;
}

.position-bottom-center {
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
}

.position-bottom-right {
  bottom: 80px;
  right: 20px;
}

/* Photo Badge */
.photo-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: bold;
  color: white;
  padding: 15px 40px;
  border-radius: 12px;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
  letter-spacing: 2px;
  opacity: 0.3;
}

.photo-badge.before {
  background: rgba(59, 130, 246, 0.6);
}

.photo-badge.after {
  background: rgba(16, 185, 129, 0.6);
}

/* Camera Controls */
.camera-controls {
  padding: 20px;
  background: #000;
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.active-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  justify-content: center;
}

.btn-camera {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 16px;
}

.btn-capture {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.btn-capture:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.capture-ring {
  width: 80px;
  height: 80px;
  border: 4px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-capture:hover:not(:disabled) .capture-ring {
  border-color: rgba(255, 255, 255, 0.8);
  transform: scale(1.05);
}

.capture-button {
  width: 64px;
  height: 64px;
  background: white;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-capture:active:not(:disabled) .capture-button {
  transform: scale(0.9);
}

.btn-stop,
.btn-switch,
.btn-location {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 14px;
}

.btn-location:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon {
  width: 20px;
  height: 20px;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Captured Preview */
.captured-preview {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.captured-preview img {
  max-width: 90%;
  max-height: 80%;
  border-radius: 8px;
}

.capture-success {
  margin-top: 20px;
  color: #10b981;
  font-size: 20px;
  font-weight: bold;
  animation: pulse 1s infinite;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Geolocation Fallback Banner */
.location-fallback-banner {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 15;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.fallback-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.icon-warning {
  width: 24px;
  height: 24px;
  color: #f59e0b;
  flex-shrink: 0;
}

.fallback-text {
  flex: 1;
  color: #78350f;
}

.fallback-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-retry,
.btn-skip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry {
  background: white;
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-retry:hover {
  background: #fef3c7;
}

.btn-skip {
  background: #78350f;
  border-color: #78350f;
  color: white;
}

.btn-skip:hover {
  background: #92400e;
}

/* Camera Selector Dropdown */
.camera-selector-dropdown {
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  max-width: 90%;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.selector-list {
  max-height: 300px;
  overflow-y: auto;
}

.selector-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.selector-item:hover {
  background: #f9fafb;
}

.selector-item.active {
  background: #eff6ff;
  color: #2563eb;
}

.selector-item span {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 640px) {
  .watermark-item {
    font-size: 14px;
    padding: 8px 12px;
  }

  .timestamp {
    font-size: 16px;
  }

  .address {
    font-size: 13px;
  }

  .company-address {
    font-size: 12px;
  }

  .photo-badge {
    font-size: 24px;
    padding: 10px 30px;
  }

  .active-controls {
    flex-wrap: wrap;
  }

  .btn-stop,
  .btn-switch,
  .btn-location {
    flex: 1;
    min-width: 120px;
    justify-content: center;
    font-size: 12px;
    padding: 8px 12px;
  }

  .btn-capture {
    width: 100%;
    margin-bottom: 10px;
  }

  .camera-selector-dropdown {
    min-width: 280px;
  }

  .fallback-content {
    flex-direction: column;
    gap: 8px;
  }

  .fallback-actions {
    width: 100%;
  }

  .btn-retry,
  .btn-skip {
    flex: 1;
  }
}
</style>

<script setup lang="ts">
interface Step {
  id: number;
  title: string;
  description?: string;
  icon?: string;
  completed?: boolean;
}

interface Props {
  steps: Step[];
  currentStep: number;
  allowClickNavigation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  allowClickNavigation: false,
});

const emit = defineEmits<{
  stepClick: [stepId: number];
}>();

const handleStepClick = (stepId: number) => {
  if (props.allowClickNavigation) {
    emit("stepClick", stepId);
  }
};

const isStepActive = (stepId: number) => props.currentStep === stepId;
const isStepCompleted = (stepId: number) => {
  const step = props.steps.find((s) => s.id === stepId);
  return step?.completed || props.currentStep > stepId;
};
const isStepUpcoming = (stepId: number) => props.currentStep < stepId;

const getStepClasses = (stepId: number) => {
  if (isStepActive(stepId)) {
    return "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white ring-4 ring-indigo-500/30 scale-110";
  }
  if (isStepCompleted(stepId)) {
    return "bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:scale-105";
  }
  return "bg-gray-200 text-gray-500 hover:bg-gray-300";
};

const getConnectorClasses = (stepId: number) => {
  if (isStepCompleted(stepId)) {
    return "bg-gradient-to-r from-green-500 to-emerald-500";
  }
  return "bg-gray-200";
};
</script>

<template>
  <div class="w-full py-6">
    <!-- Desktop/Tablet View -->
    <div class="hidden sm:block">
      <div class="flex items-center justify-between">
        <template v-for="(step, index) in steps" :key="step.id">
          <!-- Step Circle -->
          <div class="flex flex-col items-center gap-3 flex-1">
            <button
              :disabled="!allowClickNavigation"
              :class="[
                'relative flex h-12 w-12 items-center justify-center rounded-full font-bold transition-all duration-300 shadow-md',
                getStepClasses(step.id),
                allowClickNavigation && !isStepActive(step.id)
                  ? 'cursor-pointer'
                  : 'cursor-default',
              ]"
              @click="handleStepClick(step.id)"
            >
              <!-- Completed Icon -->
              <svg
                v-if="isStepCompleted(step.id) && !isStepActive(step.id)"
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>

              <!-- Custom Icon or Number -->
              <template v-else>
                <span v-if="step.icon" v-html="step.icon"></span>
                <span v-else>{{ step.id }}</span>
              </template>

              <!-- Active Pulse Animation -->
              <span
                v-if="isStepActive(step.id)"
                class="absolute -inset-1 rounded-full bg-indigo-500/50 animate-ping"
              ></span>
            </button>

            <!-- Step Label -->
            <div class="text-center max-w-[120px]">
              <p
                :class="[
                  'text-sm font-semibold transition-colors',
                  isStepActive(step.id)
                    ? 'text-indigo-700'
                    : isStepCompleted(step.id)
                    ? 'text-green-700'
                    : 'text-gray-500',
                ]"
              >
                {{ step.title }}
              </p>
              <p v-if="step.description" class="text-xs text-gray-500 mt-0.5">
                {{ step.description }}
              </p>
            </div>
          </div>

          <!-- Connector Line -->
          <div
            v-if="index < steps.length - 1"
            :class="[
              'h-1 flex-1 mx-2 rounded-full transition-all duration-500',
              getConnectorClasses(step.id),
            ]"
          />
        </template>
      </div>
    </div>

    <!-- Mobile View -->
    <div class="block sm:hidden">
      <div class="flex items-center gap-2">
        <template v-for="(step, index) in steps" :key="step.id">
          <!-- Step Dot -->
          <button
            :disabled="!allowClickNavigation"
            :class="[
              'h-10 w-10 rounded-full font-bold text-sm transition-all duration-300 shadow-md flex-shrink-0',
              getStepClasses(step.id),
              allowClickNavigation && !isStepActive(step.id)
                ? 'cursor-pointer'
                : 'cursor-default',
            ]"
            @click="handleStepClick(step.id)"
          >
            <svg
              v-if="isStepCompleted(step.id) && !isStepActive(step.id)"
              class="h-5 w-5 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span v-else>{{ step.id }}</span>
          </button>

          <!-- Connector Line (Mobile) -->
          <div
            v-if="index < steps.length - 1"
            :class="[
              'h-1 flex-1 rounded-full transition-all duration-500',
              getConnectorClasses(step.id),
            ]"
          />
        </template>
      </div>

      <!-- Current Step Info (Mobile) -->
      <div class="mt-4 text-center">
        <p class="text-sm font-semibold text-indigo-700">
          {{ steps.find((s) => s.id === currentStep)?.title }}
        </p>
        <p
          v-if="steps.find((s) => s.id === currentStep)?.description"
          class="text-xs text-gray-500 mt-1"
        >
          {{ steps.find((s) => s.id === currentStep)?.description }}
        </p>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mt-6">
      <div class="progress-bar">
        <div
          class="progress-bar-fill"
          :style="{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }"
        />
      </div>
      <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Step {{ currentStep }} of {{ steps.length }}</span>
        <span
          >{{ Math.round(((currentStep - 1) / (steps.length - 1)) * 100) }}%
          Complete</span
        >
      </div>
    </div>
  </div>
</template>

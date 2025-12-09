<script setup lang="ts">
interface Props {
  modelValue: string | number;
  label?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  required: false,
  disabled: false,
  readonly: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
}>();

const inputId = computed(
  () => props.id || `input-${Math.random().toString(36).slice(2, 9)}`
);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit(
    "update:modelValue",
    props.type === "number" ? Number(target.value) : target.value
  );
};
</script>

<template>
  <div class="w-full">
    <label v-if="label" :for="inputId" class="label">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :class="['input', { 'input-error': error }]"
      @input="handleInput"
    />
    <p v-if="error" class="mt-1 text-sm text-red-500">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

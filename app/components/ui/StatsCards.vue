<script setup lang="ts">
interface StatItem {
  label: string;
  value: string | number;
  icon?: string;
  color?: "blue" | "green" | "indigo" | "purple" | "orange" | "red";
  sublabel?: string;
}

interface Props {
  stats: StatItem[];
  layout?: "grid" | "inline";
}

const props = withDefaults(defineProps<Props>(), {
  layout: "grid",
});

const getColorClasses = (color?: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-600 text-white";
    case "green":
      return "bg-green-600 text-white";
    case "indigo":
      return "bg-indigo-600 text-white";
    case "purple":
      return "bg-purple-600 text-white";
    case "orange":
      return "bg-orange-600 text-white";
    case "red":
      return "bg-red-600 text-white";
    default:
      return "bg-gradient-to-br from-indigo-600 to-indigo-500 text-white";
  }
};

const getBgColorClasses = (color?: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-50 border-blue-200";
    case "green":
      return "bg-green-50 border-green-200";
    case "indigo":
      return "bg-indigo-50 border-indigo-200";
    case "purple":
      return "bg-purple-50 border-purple-200";
    case "orange":
      return "bg-orange-50 border-orange-200";
    case "red":
      return "bg-red-50 border-red-200";
    default:
      return "bg-indigo-50 border-indigo-200";
  }
};
</script>

<template>
  <div
    :class="[
      layout === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
        : 'flex flex-wrap gap-4',
    ]"
  >
    <div
      v-for="(stat, index) in stats"
      :key="index"
      :class="[
        'rounded-xl p-6 border transition-all duration-300 hover:shadow-lg',
        getBgColorClasses(stat.color),
      ]"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p
            :class="[
              'text-sm font-medium',
              stat.color === 'blue'
                ? 'text-blue-700'
                : stat.color === 'green'
                ? 'text-green-700'
                : stat.color === 'purple'
                ? 'text-purple-700'
                : stat.color === 'orange'
                ? 'text-orange-700'
                : stat.color === 'red'
                ? 'text-red-700'
                : 'text-indigo-700',
            ]"
          >
            {{ stat.label }}
          </p>
          <p
            :class="[
              'mt-2 text-3xl font-bold',
              stat.color === 'blue'
                ? 'text-blue-900'
                : stat.color === 'green'
                ? 'text-green-900'
                : stat.color === 'purple'
                ? 'text-purple-900'
                : stat.color === 'orange'
                ? 'text-orange-900'
                : stat.color === 'red'
                ? 'text-red-900'
                : 'text-indigo-900',
            ]"
          >
            {{ stat.value }}
          </p>
          <p
            v-if="stat.sublabel"
            :class="[
              'mt-1 text-xs',
              stat.color === 'blue'
                ? 'text-blue-600'
                : stat.color === 'green'
                ? 'text-green-600'
                : stat.color === 'purple'
                ? 'text-purple-600'
                : stat.color === 'orange'
                ? 'text-orange-600'
                : stat.color === 'red'
                ? 'text-red-600'
                : 'text-indigo-600',
            ]"
          >
            {{ stat.sublabel }}
          </p>
        </div>
        <div
          v-if="stat.icon"
          :class="[
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-md',
            getColorClasses(stat.color),
          ]"
          v-html="stat.icon"
        />
      </div>
    </div>
  </div>
</template>

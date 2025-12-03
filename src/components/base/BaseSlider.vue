<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  showValue?: boolean
  disabled?: boolean
  marks?: Record<number, string>
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  showValue: true,
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const percentage = computed(() => {
  const range = props.max - props.min
  if (range === 0) return 0
  return ((props.modelValue - props.min) / range) * 100
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', parseFloat(target.value))
}

const marksList = computed(() => {
  if (!props.marks) return []
  const range = props.max - props.min
  return Object.entries(props.marks).map(([value, label]) => ({
    value: parseFloat(value),
    label,
    percentage: range === 0 ? 0 : ((parseFloat(value) - props.min) / range) * 100
  }))
})

// Use a counter for generating unique IDs to avoid accessibility issues with Math.random()
let sliderIdCounter = 0
const sliderId = `slider-${++sliderIdCounter}-${Date.now()}`
</script>

<template>
  <div class="w-full">
    <!-- Label and value display -->
    <div
      v-if="label || showValue"
      class="flex items-center justify-between mb-2"
    >
      <label
        v-if="label"
        :for="sliderId"
        class="text-sm font-medium text-gray-700"
      >
        {{ label }}
      </label>
      <span
        v-if="showValue"
        class="text-sm font-semibold text-primary-600"
      >
        {{ modelValue }}
      </span>
    </div>

    <!-- Slider container -->
    <div class="relative">
      <!-- Track background -->
      <div class="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-gray-200 rounded-full" />

      <!-- Filled track -->
      <div
        class="absolute top-1/2 left-0 h-2 -translate-y-1/2 bg-primary-500 rounded-full transition-all duration-100"
        :class="{ 'bg-gray-400': disabled }"
        :style="{ width: `${percentage}%` }"
      />

      <!-- Range input -->
      <input
        :id="sliderId"
        type="range"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        class="relative w-full h-6 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed z-10"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        @input="handleInput"
      />
    </div>

    <!-- Marks -->
    <div
      v-if="marks && marksList.length > 0"
      class="relative mt-2 h-6"
    >
      <div
        v-for="mark in marksList"
        :key="mark.value"
        class="absolute transform -translate-x-1/2 text-xs text-gray-500"
        :style="{ left: `${mark.percentage}%` }"
      >
        {{ mark.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom slider thumb styling */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: white;
  border: 2px solid theme('colors.primary.500');
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

input[type="range"]::-webkit-slider-thumb:active {
  transform: scale(1.05);
}

input[type="range"]:disabled::-webkit-slider-thumb {
  background: theme('colors.gray.300');
  border-color: theme('colors.gray.400');
  cursor: not-allowed;
}

/* Firefox */
input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: white;
  border: 2px solid theme('colors.primary.500');
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

input[type="range"]::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

input[type="range"]:disabled::-moz-range-thumb {
  background: theme('colors.gray.300');
  border-color: theme('colors.gray.400');
  cursor: not-allowed;
}

/* Remove default styling for the track */
input[type="range"]::-webkit-slider-runnable-track {
  height: 8px;
  background: transparent;
}

input[type="range"]::-moz-range-track {
  height: 8px;
  background: transparent;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Progress value 0-100 */
  progress: number
  /** Bar color: blue (in progress), green (complete), red (error) */
  color?: 'blue' | 'green' | 'red'
  /** Show animated stripes */
  animated?: boolean
  /** Bar height */
  height?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue',
  animated: true,
  height: 'md'
})

const clampedProgress = computed(() => Math.max(0, Math.min(100, props.progress)))

const heightClass = computed(() => {
  const heights: Record<string, string> = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }
  return heights[props.height]
})

const colorClass = computed(() => {
  const colors: Record<string, string> = {
    blue: 'bg-primary-600',
    green: 'bg-green-500',
    red: 'bg-red-500'
  }
  return colors[props.color]
})

const isComplete = computed(() => clampedProgress.value >= 100)
</script>

<template>
  <div class="w-full">
    <div
      class="w-full bg-gray-200 rounded-full overflow-hidden"
      :class="heightClass"
      role="progressbar"
      :aria-valuenow="clampedProgress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="rounded-full transition-all duration-300 ease-out"
        :class="[
          heightClass,
          colorClass,
          { 'progress-bar-animated': animated && !isComplete }
        ]"
        :style="{ width: `${clampedProgress}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.progress-bar-animated {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
}
</style>

<script setup lang="ts">
/**
 * StatusBadge - Status indicator component
 * Displays test run status with appropriate colors and icons
 */

import { computed } from 'vue'
import type { TestStatus } from '@/types/models'

interface Props {
  status: TestStatus
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeClasses = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }
  return sizes[props.size]
})

const iconSizeClasses = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  return sizes[props.size]
})

const statusConfig = computed(() => {
  const configs: Record<TestStatus, { label: string; icon: string; classes: string }> = {
    success: {
      label: 'Success',
      icon: 'pi-check-circle',
      classes: 'bg-green-100 text-green-800 border-green-200'
    },
    error: {
      label: 'Error',
      icon: 'pi-times-circle',
      classes: 'bg-red-100 text-red-800 border-red-200'
    },
    cancelled: {
      label: 'Cancelled',
      icon: 'pi-exclamation-triangle',
      classes: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }
  return configs[props.status]
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 font-medium rounded-full border',
      sizeClasses,
      statusConfig.classes
    ]"
    :title="statusConfig.label"
  >
    <i 
      :class="['pi', statusConfig.icon, iconSizeClasses]" 
      aria-hidden="true" 
    />
    <span>{{ statusConfig.label }}</span>
  </span>
</template>

<style scoped>
</style>

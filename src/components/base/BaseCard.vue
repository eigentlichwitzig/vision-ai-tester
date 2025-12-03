<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'md',
  shadow: 'sm',
  border: true
})

const paddingClasses: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
}

const shadowClasses: Record<string, string> = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg'
}
</script>

<template>
  <div
    :class="[
      'bg-white rounded-lg',
      shadowClasses[shadow],
      border ? 'border border-gray-200' : ''
    ]"
  >
    <!-- Header -->
    <div
      v-if="$slots.header || title || subtitle"
      :class="[
        'border-b border-gray-200',
        paddingClasses[padding]
      ]"
    >
      <slot name="header">
        <h3
          v-if="title"
          class="text-lg font-semibold text-gray-900"
        >
          {{ title }}
        </h3>
        <p
          v-if="subtitle"
          class="mt-1 text-sm text-gray-500"
        >
          {{ subtitle }}
        </p>
      </slot>
    </div>

    <!-- Main content -->
    <div :class="paddingClasses[padding]">
      <slot />
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer"
      :class="[
        'border-t border-gray-200',
        paddingClasses[padding]
      ]"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
</style>

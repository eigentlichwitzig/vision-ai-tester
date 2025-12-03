<script setup lang="ts">
/**
 * SplitPane Component
 * Resizable split-pane layout with configurable min/max constraints
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  /** Initial width of the left panel as percentage (0-100) */
  initialLeftWidth?: number
  /** Minimum width of the left panel as percentage */
  minLeftWidth?: number
  /** Maximum width of the left panel as percentage */
  maxLeftWidth?: number
  /** Direction of the split */
  direction?: 'horizontal' | 'vertical'
}

const props = withDefaults(defineProps<Props>(), {
  initialLeftWidth: 35,
  minLeftWidth: 25,
  maxLeftWidth: 50,
  direction: 'horizontal'
})

// State
const leftWidth = ref(props.initialLeftWidth)
const isDragging = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)

// Computed
const leftPanelStyle = computed(() => ({
  width: `${leftWidth.value}%`,
  minWidth: `${props.minLeftWidth}%`,
  maxWidth: `${props.maxLeftWidth}%`
}))

const rightPanelStyle = computed(() => ({
  width: `${100 - leftWidth.value}%`,
  minWidth: `${100 - props.maxLeftWidth}%`,
  maxWidth: `${100 - props.minLeftWidth}%`
}))

const dividerClasses = computed(() => [
  'split-divider',
  'flex-shrink-0',
  'w-1.5 cursor-col-resize',
  'bg-gray-200 hover:bg-blue-400',
  'transition-colors duration-150',
  isDragging.value ? 'bg-blue-500' : ''
])

// Methods
function handleMouseDown(event: MouseEvent): void {
  event.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleMouseMove(event: MouseEvent): void {
  if (!isDragging.value || !containerRef.value) return

  const containerRect = containerRef.value.getBoundingClientRect()
  const containerWidth = containerRect.width
  const mouseX = event.clientX - containerRect.left
  
  // Calculate new percentage
  let newLeftWidth = (mouseX / containerWidth) * 100
  
  // Clamp to min/max
  newLeftWidth = Math.max(props.minLeftWidth, Math.min(props.maxLeftWidth, newLeftWidth))
  
  leftWidth.value = newLeftWidth
}

function handleMouseUp(): void {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function handleKeyDown(event: KeyboardEvent): void {
  const step = 2 // 2% per key press
  
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    leftWidth.value = Math.max(props.minLeftWidth, leftWidth.value - step)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    leftWidth.value = Math.min(props.maxLeftWidth, leftWidth.value + step)
  }
}

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div 
    ref="containerRef"
    class="split-pane flex h-full w-full overflow-hidden"
    :class="{ 'select-none': isDragging }"
  >
    <!-- Left Panel -->
    <div 
      class="split-left overflow-y-auto"
      :style="leftPanelStyle"
    >
      <slot name="left" />
    </div>

    <!-- Divider -->
    <div
      :class="dividerClasses"
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
      aria-label="Resize panels"
      @mousedown="handleMouseDown"
      @keydown="handleKeyDown"
    >
      <div class="h-full w-full flex items-center justify-center">
        <div class="w-0.5 h-8 bg-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>

    <!-- Right Panel -->
    <div 
      class="split-right overflow-y-auto"
      :style="rightPanelStyle"
    >
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.split-pane {
  min-height: 0;
}

.split-left,
.split-right {
  min-height: 0;
}

.split-divider {
  position: relative;
}

.split-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 32px;
  background: currentColor;
  opacity: 0.3;
  border-radius: 2px;
}

.split-divider:hover::before,
.split-divider:focus::before {
  opacity: 0.6;
}
</style>

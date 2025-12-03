<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  disabled?: boolean
  rows?: number
  maxLength?: number
  showCharCount?: boolean
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'Enter prompt...',
  disabled: false,
  rows: 4,
  showCharCount: true,
  description: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Local value for debounced updates
const localValue = ref(props.modelValue)

// Sync local value with prop changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localValue.value) {
    localValue.value = newValue
  }
})

// Debounce timeout
let debounceTimeout: ReturnType<typeof setTimeout> | null = null

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  localValue.value = target.value

  // Debounce the emit for performance
  if (debounceTimeout) {
    clearTimeout(debounceTimeout)
  }
  debounceTimeout = setTimeout(() => {
    emit('update:modelValue', localValue.value)
  }, 150)
}

const charCount = computed(() => localValue.value.length)

const charCountClass = computed(() => {
  if (props.maxLength && charCount.value > props.maxLength) {
    return 'text-red-500'
  }
  return 'text-gray-400'
})

// Unique ID for accessibility using crypto API for uniqueness
const editorId = `prompt-editor-${crypto.randomUUID().slice(0, 8)}`

// Copy to clipboard
const copied = ref(false)
const copyFailed = ref(false)
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(localValue.value)
    copied.value = true
    copyFailed.value = false
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Clipboard API not available or failed - show error state
    copyFailed.value = true
    setTimeout(() => {
      copyFailed.value = false
    }, 2000)
  }
}
</script>

<template>
  <div class="w-full">
    <!-- Label and actions -->
    <div
      v-if="label || showCharCount"
      class="flex items-center justify-between mb-2"
    >
      <label
        v-if="label"
        :for="editorId"
        class="text-sm font-medium text-gray-700"
      >
        {{ label }}
      </label>
      <div class="flex items-center gap-3">
        <!-- Copy button -->
        <button
          type="button"
          class="text-xs text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded px-1"
          :title="copied ? 'Copied!' : copyFailed ? 'Copy failed' : 'Copy to clipboard'"
          @click="copyToClipboard"
        >
          <i
            :class="['pi', copied ? 'pi-check text-green-500' : copyFailed ? 'pi-times text-red-500' : 'pi-copy']"
            aria-hidden="true"
          />
        </button>
        <!-- Character count -->
        <span
          v-if="showCharCount"
          :class="['text-xs tabular-nums', charCountClass]"
        >
          {{ charCount }}{{ maxLength ? ` / ${maxLength}` : '' }} characters
        </span>
      </div>
    </div>

    <!-- Description -->
    <p
      v-if="description"
      class="text-xs text-gray-500 mb-2"
    >
      {{ description }}
    </p>

    <!-- Textarea -->
    <div class="relative">
      <textarea
        :id="editorId"
        ref="textareaRef"
        :value="localValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows"
        :maxlength="maxLength || undefined"
        :class="[
          'w-full px-3 py-2 text-sm rounded-lg border resize-y',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400',
          'placeholder:text-gray-400'
        ]"
        :aria-describedby="description ? `${editorId}-desc` : undefined"
        @input="handleInput"
      />
    </div>
  </div>
</template>

<style scoped>
/* Ensure textarea minimum height */
textarea {
  min-height: 80px;
}

/* Custom resize handle styling */
textarea::-webkit-resizer {
  background-color: theme('colors.gray.200');
  border-radius: 0 0 8px 0;
}
</style>

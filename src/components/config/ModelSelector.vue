<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useModelLoader, type ModelType } from '@/composables/useModelLoader'
import type { OllamaModelInfo } from '@/types/ollama'

interface Props {
  modelValue: string
  modelType: ModelType
  label?: string
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Model',
  placeholder: 'Select a model',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { models, isLoading, error, fetchModels, getModelsByType, formatModelSize } = useModelLoader()

const isOpen = ref(false)
const searchQuery = ref('')
const selectRef = ref<HTMLDivElement | null>(null)

// Fetch models on mount
onMounted(() => {
  fetchModels()
})

// Get filtered models by type
const filteredModels = computed((): OllamaModelInfo[] => {
  const typeFiltered = getModelsByType(props.modelType)
  if (!searchQuery.value) {
    return typeFiltered
  }
  const query = searchQuery.value.toLowerCase()
  return typeFiltered.filter(model => 
    model.name.toLowerCase().includes(query)
  )
})

// Get the currently selected model
const selectedModel = computed((): OllamaModelInfo | undefined => {
  return models.value.find(m => m.name === props.modelValue)
})

// Display text for the selected model
const displayText = computed((): string => {
  if (selectedModel.value) {
    return selectedModel.value.name
  }
  return props.placeholder
})

function toggleDropdown(): void {
  if (!props.disabled && !isLoading.value) {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      searchQuery.value = ''
    }
  }
}

function selectModel(model: OllamaModelInfo): void {
  emit('update:modelValue', model.name)
  isOpen.value = false
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isOpen.value = false
  } else if (event.key === 'Enter' || event.key === ' ') {
    if (!isOpen.value) {
      event.preventDefault()
      toggleDropdown()
    }
  }
}

function handleOptionKeyDown(event: KeyboardEvent, model: OllamaModelInfo): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectModel(model)
  }
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent): void {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

// Watch for clicks outside
watch(isOpen, (newValue) => {
  if (newValue) {
    document.addEventListener('click', handleClickOutside)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

function retryFetch(): void {
  fetchModels(true)
}
</script>

<template>
  <div class="relative" ref="selectRef">
    <!-- Label -->
    <label
      v-if="label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
    </label>

    <!-- Select button -->
    <button
      type="button"
      :disabled="disabled || isLoading"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :class="[
        'w-full flex items-center justify-between px-3 py-2 text-left',
        'border rounded-lg transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
        disabled || isLoading
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
          : error
            ? 'bg-white border-red-300 text-gray-900 hover:border-red-400'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
      ]"
      @click="toggleDropdown"
      @keydown="handleKeyDown"
    >
      <span class="flex items-center gap-2 truncate">
        <!-- Loading spinner -->
        <i
          v-if="isLoading"
          class="pi pi-spinner pi-spin text-gray-400"
          aria-hidden="true"
        />
        <!-- Selected value or placeholder -->
        <span :class="selectedModel ? 'text-gray-900' : 'text-gray-400'">
          {{ isLoading ? 'Loading models...' : displayText }}
        </span>
      </span>
      
      <!-- Dropdown arrow -->
      <i
        :class="[
          'pi transition-transform duration-200',
          isOpen ? 'pi-chevron-up' : 'pi-chevron-down',
          disabled || isLoading ? 'text-gray-300' : 'text-gray-400'
        ]"
        aria-hidden="true"
      />
    </button>

    <!-- Error message -->
    <div
      v-if="error && !isOpen"
      class="mt-1 flex items-center gap-2 text-sm text-red-600"
    >
      <i class="pi pi-exclamation-circle" aria-hidden="true" />
      <span>{{ error }}</span>
      <button
        type="button"
        class="text-red-600 hover:text-red-700 underline focus:outline-none focus:ring-2 focus:ring-red-500"
        @click="retryFetch"
      >
        Retry
      </button>
    </div>

    <!-- Dropdown menu -->
    <div
      v-show="isOpen"
      role="listbox"
      :class="[
        'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg',
        'max-h-60 overflow-hidden'
      ]"
    >
      <!-- Search input -->
      <div class="p-2 border-b border-gray-100">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search models..."
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @click.stop
        />
      </div>

      <!-- Model list -->
      <ul class="max-h-48 overflow-y-auto">
        <li
          v-if="filteredModels.length === 0"
          class="px-3 py-2 text-sm text-gray-500 text-center"
        >
          No models found
        </li>
        <li
          v-for="model in filteredModels"
          :key="model.name"
          role="option"
          :aria-selected="model.name === modelValue"
          :tabindex="0"
          :class="[
            'px-3 py-2 cursor-pointer transition-colors duration-150',
            'focus:outline-none focus:bg-primary-50',
            model.name === modelValue
              ? 'bg-primary-50 text-primary-700'
              : 'hover:bg-gray-50 text-gray-900'
          ]"
          @click="selectModel(model)"
          @keydown="handleOptionKeyDown($event, model)"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm truncate">{{ model.name }}</span>
            <span
              v-if="model.name === modelValue"
              class="text-primary-600"
            >
              <i class="pi pi-check text-sm" aria-hidden="true" />
            </span>
          </div>
          <div class="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <span>{{ formatModelSize(model.size) }}</span>
            <span v-if="model.details?.parameter_size">
              · {{ model.details.parameter_size }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
</style>

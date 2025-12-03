<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseSlider from '@/components/base/BaseSlider.vue'
import PipelineSelector from '@/components/config/PipelineSelector.vue'
import ModelSelector from '@/components/config/ModelSelector.vue'
import ParameterPanel from '@/components/config/ParameterPanel.vue'
import ValidationErrors from '@/components/results/ValidationErrors.vue'
import OllamaStatus from '@/components/layout/OllamaStatus.vue'
import { useConfigStore } from '@/stores/configStore'
import type { ValidationError } from '@/types/models'

// Demo state
const sliderValue = ref(50)
const temperatureValue = ref(0.7)
const isLoading = ref(false)

const configStore = useConfigStore()

// Demo validation errors
const demoValidationErrors = ref<ValidationError[]>([
  {
    field: 'lineItems[0].quantity',
    message: 'Must be a number',
    schemaPath: '#/properties/lineItems/items/properties/quantity/type',
    keyword: 'type',
    params: { type: 'number' }
  },
  {
    field: 'orderDate',
    message: 'Must match format "date"',
    schemaPath: '#/properties/orderDate/format',
    keyword: 'format',
    params: { format: 'date' }
  },
  {
    field: 'totalAmount',
    message: 'Required field "totalAmount" is missing',
    schemaPath: '#/required',
    keyword: 'required',
    params: { missingProperty: 'totalAmount' }
  }
])

const handleButtonClick = () => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header with title and status indicator -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Vision AI Tester</h1>
        <OllamaStatus />
      </div>

      <!-- Pipeline and Model Selection Demo -->
      <div class="space-y-6 mb-8">
        <PipelineSelector />

        <BaseCard title="Model Configuration" subtitle="Select models based on your chosen pipeline">
          <div class="grid gap-6 md:grid-cols-2">
            <!-- Direct Multimodal Pipeline Models -->
            <div v-if="configStore.selectedPipeline === 'direct-multimodal'">
              <ModelSelector
                v-model="configStore.selectedModel"
                model-type="vision"
                label="Vision Model"
                placeholder="Select a vision model"
              />
            </div>

            <!-- OCR → Parse Pipeline Models -->
            <template v-else>
              <ModelSelector
                v-model="configStore.selectedOcrModel"
                model-type="ocr"
                label="OCR Model"
                placeholder="Select an OCR model"
              />
              <ModelSelector
                v-model="configStore.selectedParseModel"
                model-type="parse"
                label="Parse Model"
                placeholder="Select a parse model"
              />
            </template>
          </div>
        </BaseCard>

        <!-- Parameter Panel -->
        <ParameterPanel :show-ocr-prompt="configStore.isOcrPipeline" />
      </div>

      <!-- Base Components Demo -->
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <!-- Button Demo Card -->
        <BaseCard title="BaseButton Component" subtitle="Various button variants and states">
          <div class="space-y-4">
            <div>
              <p class="text-sm text-gray-500 mb-2">Variants:</p>
              <div class="flex flex-wrap gap-2">
                <BaseButton variant="primary">Primary</BaseButton>
                <BaseButton variant="secondary">Secondary</BaseButton>
                <BaseButton variant="danger">Danger</BaseButton>
                <BaseButton variant="ghost">Ghost</BaseButton>
              </div>
            </div>

            <div>
              <p class="text-sm text-gray-500 mb-2">Sizes:</p>
              <div class="flex flex-wrap items-center gap-2">
                <BaseButton size="sm">Small</BaseButton>
                <BaseButton size="md">Medium</BaseButton>
                <BaseButton size="lg">Large</BaseButton>
              </div>
            </div>

            <div>
              <p class="text-sm text-gray-500 mb-2">Icons:</p>
              <div class="flex flex-wrap gap-2">
                <BaseButton icon="check">Save</BaseButton>
                <BaseButton icon="times" variant="danger">Delete</BaseButton>
                <BaseButton icon="arrow-right" icon-pos="right" variant="secondary">Next</BaseButton>
              </div>
            </div>

            <div>
              <p class="text-sm text-gray-500 mb-2">States:</p>
              <div class="flex flex-wrap gap-2">
                <BaseButton disabled>Disabled</BaseButton>
                <BaseButton :loading="isLoading" @click="handleButtonClick">
                  {{ isLoading ? 'Loading...' : 'Click me' }}
                </BaseButton>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Card Demo Card -->
        <BaseCard title="BaseCard Component" subtitle="Container with slots">
          <div class="space-y-4">
            <BaseCard padding="sm" shadow="none">
              <p class="text-sm text-gray-600">Card with small padding and no shadow</p>
            </BaseCard>

            <BaseCard title="Nested Card" shadow="md" padding="sm">
              <p class="text-sm text-gray-600">This is a nested card with medium shadow</p>
              <template #footer>
                <div class="flex justify-end">
                  <BaseButton size="sm" variant="ghost">Footer Action</BaseButton>
                </div>
              </template>
            </BaseCard>
          </div>
        </BaseCard>

        <!-- Slider Demo Card -->
        <BaseCard title="BaseSlider Component" subtitle="Range input with value display">
          <div class="space-y-6">
            <BaseSlider
              v-model="sliderValue"
              label="Basic Slider"
              :min="0"
              :max="100"
            />

            <BaseSlider
              v-model="temperatureValue"
              label="Temperature"
              :min="0"
              :max="2"
              :step="0.1"
              :marks="{ 0: 'Precise', 1: 'Balanced', 2: 'Creative' }"
            />

            <BaseSlider
              :model-value="75"
              label="Disabled Slider"
              disabled
            />
          </div>
        </BaseCard>
      </div>

      <!-- Validation Errors Demo -->
      <div class="mt-8">
        <BaseCard title="ValidationErrors Component Demo" subtitle="Display validation errors from JSON schema validation">
          <p class="text-gray-600 mb-4">This component displays validation errors when JSON output doesn't match the schema.</p>
          <ValidationErrors :errors="demoValidationErrors" />
        </BaseCard>
      </div>

      <!-- Original Welcome Message -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <p class="text-gray-600">
          Welcome to Vision AI Tester. This application is under development.
        </p>
        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 class="font-semibold text-blue-900 mb-2">Next Steps:</h2>
          <ul class="list-disc list-inside text-blue-800 space-y-1">
            <li>Install dependencies: <code class="bg-blue-100 px-2 py-1 rounded">npm install</code></li>
            <li>Start development server: <code class="bg-blue-100 px-2 py-1 rounded">npm run dev</code></li>
            <li>Configure Ollama with CORS enabled</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
code {
  font-family: 'Courier New', Courier, monospace;
}
</style>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseSlider from '@/components/base/BaseSlider.vue'
import ProgressBar from '@/components/base/ProgressBar.vue'
import LoadingIndicator from '@/components/base/LoadingIndicator.vue'
import PipelineSelector from '@/components/config/PipelineSelector.vue'
import ModelSelector from '@/components/config/ModelSelector.vue'
import ParameterPanel from '@/components/config/ParameterPanel.vue'
import ValidationErrors from '@/components/results/ValidationErrors.vue'
import ResultsPanel from '@/components/results/ResultsPanel.vue'
import OllamaStatus from '@/components/layout/OllamaStatus.vue'
import { useConfigStore } from '@/stores/configStore'
import { useTestRunner } from '@/composables/useTestRunner'
import type { ValidationError, TestRun } from '@/types/models'

// Demo state
const sliderValue = ref(50)
const temperatureValue = ref(0.7)
const isLoading = ref(false)

const configStore = useConfigStore()
const { isRunning, currentStep, progressPercent, canCancel, cancelExecution } = useTestRunner()

// Demo loading indicator state
const demoIsRunning = ref(false)
const demoCurrentStep = ref('')
const demoProgress = ref(0)
const demoElapsedTime = ref(0)
let demoTimer: number | null = null
let demoProgressTimer: number | null = null

// Demo progress simulation
function startDemoLoading() {
  demoIsRunning.value = true
  demoProgress.value = 0
  demoElapsedTime.value = 0
  demoCurrentStep.value = 'Sending request to model...'
  
  demoTimer = window.setInterval(() => {
    demoElapsedTime.value++
  }, 1000)
  
  // Simulate progress steps
  const steps = [
    { progress: 25, step: 'Processing image...', delay: 500 },
    { progress: 50, step: 'Generating structured output...', delay: 1500 },
    { progress: 75, step: 'Validating response...', delay: 2500 },
    { progress: 95, step: 'Saving results...', delay: 3500 },
    { progress: 100, step: 'Complete!', delay: 4000 }
  ]
  
  steps.forEach(({ progress, step, delay }) => {
    setTimeout(() => {
      if (demoIsRunning.value) {
        demoProgress.value = progress
        demoCurrentStep.value = step
        if (progress >= 100) {
          stopDemoLoading()
        }
      }
    }, delay)
  })
}

function stopDemoLoading() {
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
  demoIsRunning.value = false
}

function handleDemoCancel() {
  if (confirm('Are you sure you want to cancel this demo test?')) {
    demoCurrentStep.value = 'Cancelled by user'
    stopDemoLoading()
  }
}

// Elapsed time tracking for real test runs
const elapsedTime = ref(0)
let timer: number | null = null

watch(isRunning, (running) => {
  if (running) {
    elapsedTime.value = 0
    timer = window.setInterval(() => {
      elapsedTime.value++
    }, 1000)
  } else {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (demoTimer) clearInterval(demoTimer)
})

function handleCancel() {
  if (confirm('Are you sure you want to cancel this test?')) {
    cancelExecution()
  }
}

// Progress threshold after which cancel is disabled (during final save)
const CANCEL_DISABLED_THRESHOLD = 95

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

// Demo data for ResultsPanel - defined as constants outside reactive ref for performance
const DEMO_PARSED_DATA = {
  orderNumber: '12345',
  orderDate: '2024-12-03',
  customerName: 'ACME Corporation',
  lineItems: [
    {
      description: 'Construction Materials - Steel Beams',
      quantity: 5,
      unitPrice: 250.00,
      totalPrice: 1250.00
    },
    {
      description: 'Concrete Mix - Premium Grade',
      quantity: 10,
      unitPrice: 45.00,
      totalPrice: 450.00
    }
  ],
  subtotal: 1700.00,
  tax: 170.00,
  totalAmount: 1870.00
}

const DEMO_RAW_JSON = JSON.stringify(DEMO_PARSED_DATA, null, 2)

const DEMO_OCR_TEXT = `Order Number: 12345
Date: 2024-12-03
Customer: ACME Corporation

Line Items:
1. Construction Materials - Steel Beams
   Quantity: 5 units @ $250.00 = $1,250.00

2. Concrete Mix - Premium Grade
   Quantity: 10 units @ $45.00 = $450.00

Subtotal: $1,700.00
Tax (10%): $170.00
Total Amount: $1,870.00`

// Demo test run for ResultsPanel
const demoTestRun = ref<TestRun>({
  id: 'demo-test-run-1',
  timestamp: new Date(),
  modelName: 'qwen2.5vl:7b',
  pipeline: 'ocr-then-parse',
  ocrModel: 'deepseek-ocr',
  parameters: {
    temperature: 0,
    maxTokens: 4096,
    numCtx: 32768,
    systemPrompt: 'Extract structured data from the document.',
    userPrompt: 'Parse the following text into JSON format.'
  },
  input: {
    fileName: 'invoice-001.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    size: 245632,
    base64Content: ''
  },
  output: {
    raw: DEMO_RAW_JSON,
    parsed: DEMO_PARSED_DATA,
    ocrText: DEMO_OCR_TEXT,
    isValid: true,
    validationErrors: [],
    promptTokens: 1024,
    completionTokens: 512,
    totalDuration: 3500000000
  },
  duration: 4250,
  status: 'success'
})

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

      <!-- Loading Indicator and Progress Bar Demo -->
      <div class="mt-8 grid gap-6 md:grid-cols-2">
        <!-- Progress Bar Demo -->
        <BaseCard title="ProgressBar Component" subtitle="Progress bar with color variants and animations">
          <div class="space-y-6">
            <div>
              <p class="text-sm text-gray-500 mb-2">In Progress (animated):</p>
              <ProgressBar :progress="50" color="blue" :animated="true" />
            </div>
            
            <div>
              <p class="text-sm text-gray-500 mb-2">Complete (green):</p>
              <ProgressBar :progress="100" color="green" :animated="false" />
            </div>
            
            <div>
              <p class="text-sm text-gray-500 mb-2">Error (red):</p>
              <ProgressBar :progress="75" color="red" :animated="false" />
            </div>

            <div>
              <p class="text-sm text-gray-500 mb-2">Different Heights:</p>
              <div class="space-y-2">
                <ProgressBar :progress="60" height="sm" />
                <ProgressBar :progress="60" height="md" />
                <ProgressBar :progress="60" height="lg" />
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Loading Indicator Demo -->
        <BaseCard title="LoadingIndicator Component" subtitle="Full loading UI with progress and cancel">
          <div v-if="!demoIsRunning" class="text-center py-4">
            <p class="text-gray-600 mb-4">Click to see the loading indicator in action</p>
            <BaseButton @click="startDemoLoading" icon="play">
              Start Demo
            </BaseButton>
          </div>
          <LoadingIndicator
            v-else
            :current-step="demoCurrentStep"
            :progress="demoProgress"
            :elapsed-time="demoElapsedTime"
            :can-cancel="demoProgress < CANCEL_DISABLED_THRESHOLD"
            @cancel="handleDemoCancel"
          />
        </BaseCard>
      </div>

      <!-- Validation Errors Demo -->
      <div class="mt-8">
        <BaseCard title="ValidationErrors Component Demo" subtitle="Display validation errors from JSON schema validation">
          <p class="text-gray-600 mb-4">This component displays validation errors when JSON output doesn't match the schema.</p>
          <ValidationErrors :errors="demoValidationErrors" />
        </BaseCard>
      </div>

      <!-- Results Panel Demo -->
      <div class="mt-8">
        <BaseCard title="ResultsPanel Component Demo" subtitle="Tabbed interface for viewing test run results">
          <p class="text-gray-600 mb-4">
            This component displays test results with tabs for JSON output, raw response, and OCR text.
            Try switching between tabs and copying content.
          </p>
          <div class="h-96">
            <ResultsPanel :test-run="demoTestRun" />
          </div>
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

<script setup lang="ts">
/**
 * HistoryDetailsView - Detailed view for a single test run
 * Displays comprehensive information about the test execution
 */

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTestRun } from '@/db'
import { formatDuration, formatTimestamp, formatTokensDetailed, formatFileSize } from '@/utils/formatters'
import JsonViewer from '@/components/results/JsonViewer.vue'
import RawResponseViewer from '@/components/results/RawResponseViewer.vue'
import OcrTextViewer from '@/components/results/OcrTextViewer.vue'
import ValidationErrors from '@/components/results/ValidationErrors.vue'
import type { TestRun, ValidationError } from '@/types/models'

const route = useRoute()
const router = useRouter()

// State
const testRun = ref<TestRun | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Expandable sections state
const expandedSections = ref<Set<string>>(new Set(['results', 'prompts', 'parameters']))

// Active results tab
type ResultsTabType = 'json' | 'raw' | 'ocr' | 'thinking'
const activeResultsTab = ref<ResultsTabType>('json')

// Computed properties
const testRunId = computed(() => route.params.id as string)

const statusClass = computed(() => {
  if (!testRun.value) return ''
  switch (testRun.value.status) {
    case 'success': return 'bg-green-100 text-green-800'
    case 'error': return 'bg-red-100 text-red-800'
    case 'cancelled': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
})

const pipelineLabel = computed(() => {
  if (!testRun.value) return ''
  return testRun.value.pipeline === 'direct-multimodal' 
    ? 'Direct Multimodal' 
    : 'OCR → Parse'
})

const formattedDuration = computed(() => {
  if (!testRun.value?.duration) return '-'
  return formatDuration(testRun.value.duration)
})

const formattedTimestamp = computed(() => {
  if (!testRun.value?.timestamp) return '-'
  const ts = testRun.value.timestamp instanceof Date 
    ? testRun.value.timestamp 
    : new Date(testRun.value.timestamp)
  return formatTimestamp(ts)
})

const formattedTokens = computed(() => {
  const output = testRun.value?.output
  if (!output?.promptTokens || !output?.completionTokens) return null
  return formatTokensDetailed(output.promptTokens, output.completionTokens)
})

const hasOcrText = computed(() => !!testRun.value?.output?.ocrText)
const hasParsedData = computed(() => !!testRun.value?.output?.parsed)
const hasThinkingContent = computed(() => !!testRun.value?.output?.thinking)
const hasValidationErrors = computed(() => (testRun.value?.output?.validationErrors?.length ?? 0) > 0)

const validationErrors = computed((): ValidationError[] => {
  return testRun.value?.output?.validationErrors ?? []
})

// OCR Pipeline specific prompts
const hasOcrPipelineParams = computed(() => {
  return testRun.value?.pipeline === 'ocr-then-parse' && 
         testRun.value?.parameters?.ocrParameters
})

// Methods
async function loadTestRun(): Promise<void> {
  isLoading.value = true
  error.value = null
  
  try {
    const id = testRunId.value
    if (!id) {
      error.value = 'No test run ID provided'
      return
    }
    
    const run = await getTestRun(id)
    if (!run) {
      error.value = 'Test run not found'
      return
    }
    
    testRun.value = run
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load test run'
    console.error('Failed to load test run:', err)
  } finally {
    isLoading.value = false
  }
}

function toggleSection(section: string): void {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section)
  } else {
    expandedSections.value.add(section)
  }
  // Trigger reactivity
  expandedSections.value = new Set(expandedSections.value)
}

function isSectionExpanded(section: string): boolean {
  return expandedSections.value.has(section)
}

function navigateBack(): void {
  router.push({ name: 'history' })
}

function switchResultsTab(tab: ResultsTabType): void {
  activeResultsTab.value = tab
}

// Lifecycle
onMounted(async () => {
  await loadTestRun()
})
</script>

<template>
  <div class="history-details-view min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              @click="navigateBack"
              class="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Back to history"
            >
              <i class="pi pi-arrow-left text-lg" />
            </button>
            <div>
              <h1 class="text-xl font-bold text-gray-900">Test Run Details</h1>
              <p v-if="testRun" class="text-sm text-gray-500 mt-0.5">
                {{ testRun.input.fileName }}
              </p>
            </div>
          </div>
          
          <!-- Status badge -->
          <span 
            v-if="testRun"
            :class="['px-3 py-1 rounded-full text-sm font-medium capitalize', statusClass]"
          >
            {{ testRun.status }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3">
          <i class="pi pi-spin pi-spinner text-2xl text-primary-600" />
          <span class="text-gray-600">Loading test run...</span>
        </div>
      </div>

      <!-- Error state -->
      <div 
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
      >
        <i class="pi pi-exclamation-triangle text-3xl text-red-500 mb-3" />
        <p class="text-red-700 font-medium">{{ error }}</p>
        <button
          @click="navigateBack"
          class="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
        >
          Back to History
        </button>
      </div>

      <!-- Test run details -->
      <div v-else-if="testRun" class="space-y-6">
        <!-- Overview Card -->
        <section class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-gray-200 bg-gray-50">
            <h2 class="text-lg font-semibold text-gray-900">Overview</h2>
          </div>
          <div class="p-4">
            <dl class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Pipeline</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ pipelineLabel }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ testRun.modelName }}</dd>
              </div>
              <div v-if="testRun.ocrModel">
                <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">OCR Model</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ testRun.ocrModel }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ formattedDuration }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Timestamp</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ formattedTimestamp }}</dd>
              </div>
              <div v-if="formattedTokens">
                <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Tokens</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ formattedTokens }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">File Size</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900">{{ formatFileSize(testRun.input.size) }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">File Type</dt>
                <dd class="mt-1 text-sm font-medium text-gray-900 uppercase">{{ testRun.input.fileType }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <!-- Results Section -->
        <section class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <button
            @click="toggleSection('results')"
            class="w-full p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
          >
            <h2 class="text-lg font-semibold text-gray-900">Results & Output</h2>
            <i 
              :class="['pi transition-transform duration-200', isSectionExpanded('results') ? 'pi-chevron-up' : 'pi-chevron-down']" 
            />
          </button>
          
          <div v-if="isSectionExpanded('results')" class="p-4">
            <!-- Results tabs -->
            <div class="flex gap-1 mb-4 border-b border-gray-200">
              <button
                @click="switchResultsTab('json')"
                :class="[
                  'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeResultsTab === 'json' 
                    ? 'border-primary-600 text-primary-700' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                ]"
              >
                <i class="pi pi-code mr-1.5" />
                JSON Output
                <span v-if="!hasParsedData" class="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">N/A</span>
                <span v-else-if="hasValidationErrors" class="ml-1.5 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">!</span>
              </button>
              <button
                @click="switchResultsTab('raw')"
                :class="[
                  'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeResultsTab === 'raw' 
                    ? 'border-primary-600 text-primary-700' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                ]"
              >
                <i class="pi pi-file-o mr-1.5" />
                Raw Response
              </button>
              <button
                v-if="hasOcrText"
                @click="switchResultsTab('ocr')"
                :class="[
                  'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeResultsTab === 'ocr' 
                    ? 'border-primary-600 text-primary-700' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                ]"
              >
                <i class="pi pi-eye mr-1.5" />
                OCR Text
              </button>
              <button
                v-if="hasThinkingContent"
                @click="switchResultsTab('thinking')"
                :class="[
                  'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeResultsTab === 'thinking' 
                    ? 'border-primary-600 text-primary-700' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                ]"
              >
                <i class="pi pi-lightbulb mr-1.5" />
                Thinking
              </button>
            </div>

            <!-- Tab content -->
            <div class="min-h-[300px] max-h-[500px] overflow-auto border border-gray-200 rounded-lg">
              <JsonViewer 
                v-show="activeResultsTab === 'json'" 
                :data="testRun.output.parsed ?? null" 
              />
              <RawResponseViewer 
                v-show="activeResultsTab === 'raw'" 
                :content="testRun.output.raw ?? ''" 
              />
              <OcrTextViewer 
                v-show="activeResultsTab === 'ocr'" 
                :content="testRun.output.ocrText ?? ''" 
              />
              <div 
                v-show="activeResultsTab === 'thinking'" 
                class="p-4 font-mono text-sm whitespace-pre-wrap text-gray-700"
              >
                {{ testRun.output.thinking ?? '' }}
              </div>
            </div>

            <!-- Validation errors -->
            <div v-if="hasValidationErrors" class="mt-4">
              <ValidationErrors :errors="validationErrors" />
            </div>

            <!-- Error message if present -->
            <div 
              v-if="testRun.output.error" 
              class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <div class="flex items-start gap-2">
                <i class="pi pi-exclamation-triangle text-red-500 mt-0.5" />
                <div>
                  <p class="font-medium text-red-700">Error</p>
                  <p class="text-sm text-red-600 mt-1">{{ testRun.output.error }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Prompts Section -->
        <section class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <button
            @click="toggleSection('prompts')"
            class="w-full p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
          >
            <h2 class="text-lg font-semibold text-gray-900">Prompts Used</h2>
            <i 
              :class="['pi transition-transform duration-200', isSectionExpanded('prompts') ? 'pi-chevron-up' : 'pi-chevron-down']" 
            />
          </button>
          
          <div v-if="isSectionExpanded('prompts')" class="p-4 space-y-6">
            <!-- Direct pipeline prompts -->
            <template v-if="!hasOcrPipelineParams">
              <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-2">System Prompt</h3>
                <pre class="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-[200px]">{{ testRun.parameters.systemPrompt }}</pre>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-2">User Prompt</h3>
                <pre class="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-[200px]">{{ testRun.parameters.userPrompt }}</pre>
              </div>
            </template>

            <!-- OCR pipeline prompts -->
            <template v-else>
              <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 class="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs font-bold">1</span>
                  OCR Step Prompts
                </h3>
                <div class="space-y-3">
                  <div>
                    <h4 class="text-xs font-medium text-blue-700 mb-1">System Prompt</h4>
                    <pre class="p-2 bg-white border border-blue-200 rounded text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-[150px]">{{ testRun.parameters.ocrParameters?.systemPrompt ?? 'N/A' }}</pre>
                  </div>
                  <div>
                    <h4 class="text-xs font-medium text-blue-700 mb-1">User Prompt</h4>
                    <pre class="p-2 bg-white border border-blue-200 rounded text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-[150px]">{{ testRun.parameters.ocrParameters?.userPrompt ?? 'N/A' }}</pre>
                  </div>
                </div>
              </div>

              <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 class="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-200 text-green-700 text-xs font-bold">2</span>
                  Parse Step Prompts
                </h3>
                <div class="space-y-3">
                  <div>
                    <h4 class="text-xs font-medium text-green-700 mb-1">System Prompt</h4>
                    <pre class="p-2 bg-white border border-green-200 rounded text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-[150px]">{{ testRun.parameters.parseParameters?.systemPrompt ?? 'N/A' }}</pre>
                  </div>
                  <div>
                    <h4 class="text-xs font-medium text-green-700 mb-1">User Prompt</h4>
                    <pre class="p-2 bg-white border border-green-200 rounded text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-[150px]">{{ testRun.parameters.parseParameters?.userPrompt ?? 'N/A' }}</pre>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </section>

        <!-- Parameters Section -->
        <section class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <button
            @click="toggleSection('parameters')"
            class="w-full p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
          >
            <h2 class="text-lg font-semibold text-gray-900">Parameters</h2>
            <i 
              :class="['pi transition-transform duration-200', isSectionExpanded('parameters') ? 'pi-chevron-up' : 'pi-chevron-down']" 
            />
          </button>
          
          <div v-if="isSectionExpanded('parameters')" class="p-4">
            <!-- Direct pipeline parameters -->
            <template v-if="!hasOcrPipelineParams">
              <dl class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Temperature</dt>
                  <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.temperature }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Tokens</dt>
                  <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.maxTokens ?? 'Default' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Context Window</dt>
                  <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.numCtx ?? 'Default' }}</dd>
                </div>
                <div v-if="testRun.parameters.schemaId">
                  <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Schema ID</dt>
                  <dd class="mt-1 text-sm font-mono text-gray-900 truncate" :title="testRun.parameters.schemaId">
                    {{ testRun.parameters.schemaId }}
                  </dd>
                </div>
              </dl>
            </template>

            <!-- OCR pipeline parameters -->
            <template v-else>
              <div class="space-y-4">
                <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 class="text-sm font-semibold text-blue-800 mb-3">OCR Step Parameters</h3>
                  <dl class="grid grid-cols-3 gap-4">
                    <div>
                      <dt class="text-xs font-medium text-blue-700">Temperature</dt>
                      <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.ocrParameters?.temperature ?? 'N/A' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium text-blue-700">Max Tokens</dt>
                      <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.ocrParameters?.maxTokens ?? 'N/A' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium text-blue-700">Context Window</dt>
                      <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.ocrParameters?.numCtx ?? 'N/A' }}</dd>
                    </div>
                  </dl>
                </div>

                <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 class="text-sm font-semibold text-green-800 mb-3">Parse Step Parameters</h3>
                  <dl class="grid grid-cols-3 gap-4">
                    <div>
                      <dt class="text-xs font-medium text-green-700">Temperature</dt>
                      <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.parseParameters?.temperature ?? 'N/A' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium text-green-700">Max Tokens</dt>
                      <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.parseParameters?.maxTokens ?? 'N/A' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium text-green-700">Context Window</dt>
                      <dd class="mt-1 text-sm font-mono text-gray-900">{{ testRun.parameters.parseParameters?.numCtx ?? 'N/A' }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </template>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.history-details-view {
  min-height: 100vh;
}
</style>

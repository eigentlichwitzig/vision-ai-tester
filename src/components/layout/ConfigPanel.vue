<script setup lang="ts">
/**
 * ConfigPanel Component
 * Left panel containing numbered workflow steps for test configuration
 * Integrates: File upload, Pipeline selection, Model selection, Parameters, Run button
 */

import { ref, computed, watch } from 'vue'
import DropZone from '@/components/upload/DropZone.vue'
import FilePreview from '@/components/upload/FilePreview.vue'
import PipelineSelector from '@/components/config/PipelineSelector.vue'
import ModelSelector from '@/components/config/ModelSelector.vue'
import ParameterPanel from '@/components/config/ParameterPanel.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import { useConfigStore } from '@/stores/configStore'
import { useTestRunner } from '@/composables/useTestRunner'
import { useOllamaHealth } from '@/composables/useOllamaHealth'
import type { FileUploadData, FileUploadError } from '@/types/models'

const configStore = useConfigStore()
const { isRunning, error: runnerError, runDirectPipeline, runOcrPipeline, cancelExecution } = useTestRunner()
const { isOnline } = useOllamaHealth()

// Local state
const uploadError = ref<FileUploadError | null>(null)

// Computed
const hasFile = computed(() => configStore.currentFile !== null)

const canRunTest = computed(() => {
  if (!hasFile.value) return false
  if (!isOnline.value) return false
  if (isRunning.value) return false
  
  // Check if models are selected based on pipeline
  if (configStore.selectedPipeline === 'direct-multimodal') {
    return !!configStore.selectedModel
  } else {
    return !!configStore.selectedOcrModel && !!configStore.selectedParseModel
  }
})

const runButtonText = computed(() => {
  if (isRunning.value) return 'Running...'
  if (!hasFile.value) return 'Upload a file to start'
  if (!isOnline.value) return 'Ollama offline'
  return 'Run Test'
})

// Methods
function handleFileSelected(data: FileUploadData): void {
  configStore.setFile(data)
  uploadError.value = null
}

function handleFileError(error: FileUploadError): void {
  uploadError.value = error
  configStore.clearFile()
}

function handleFileClear(): void {
  configStore.clearFile()
  uploadError.value = null
}

async function handleRunTest(): Promise<void> {
  if (!canRunTest.value || !configStore.currentFile) return

  try {
    if (configStore.selectedPipeline === 'direct-multimodal') {
      await runDirectPipeline({
        file: configStore.currentFile,
        model: configStore.selectedModel,
        systemPrompt: configStore.systemPrompt,
        userPrompt: configStore.userPrompt,
        temperature: configStore.temperature,
        maxTokens: configStore.maxTokens,
        numCtx: configStore.numCtx
      })
    } else {
      await runOcrPipeline({
        file: configStore.currentFile,
        ocrModel: configStore.selectedOcrModel,
        parseModel: configStore.selectedParseModel,
        ocrPrompt: configStore.ocrPrompt,
        systemPrompt: configStore.systemPrompt,
        userPrompt: configStore.userPrompt,
        temperature: configStore.temperature,
        maxTokens: configStore.maxTokens,
        numCtx: configStore.numCtx
      })
    }
  } catch (err) {
    // Error is handled by useTestRunner
    console.error('Test execution failed:', err)
  }
}

function handleCancelTest(): void {
  cancelExecution()
}

// Watch for file changes to clear errors
watch(() => configStore.currentFile, () => {
  if (configStore.currentFile) {
    uploadError.value = null
  }
})
</script>

<template>
  <div class="config-panel p-4 space-y-6 h-full overflow-y-auto">
    <!-- Step 1: File Upload -->
    <section>
      <div class="flex items-center gap-2 mb-3">
        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
          1
        </span>
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Upload Document
        </h2>
      </div>

      <!-- DropZone when no file -->
      <div v-if="!hasFile">
        <DropZone
          @file-selected="handleFileSelected"
          @error="handleFileError"
        />
      </div>

      <!-- File Preview when file selected -->
      <div v-else class="space-y-3">
        <FilePreview
          v-if="configStore.currentFile"
          :file-data="configStore.currentFile"
          :max-width="400"
          :max-height="300"
        />
        <div class="flex justify-end">
          <BaseButton
            variant="secondary"
            size="sm"
            icon="times"
            @click="handleFileClear"
          >
            Remove file
          </BaseButton>
        </div>
      </div>

      <!-- Upload error -->
      <div v-if="uploadError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-700 text-sm flex items-center gap-2">
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          {{ uploadError.message }}
        </p>
      </div>
    </section>

    <!-- Step 2: Pipeline Selection -->
    <section>
      <div class="flex items-center gap-2 mb-3">
        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
          2
        </span>
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Select Pipeline
        </h2>
      </div>
      <PipelineSelector />
    </section>

    <!-- Step 3: Model Selection -->
    <section>
      <div class="flex items-center gap-2 mb-3">
        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
          3
        </span>
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Configure Model
        </h2>
      </div>
      
      <BaseCard padding="md">
        <div class="space-y-4">
          <!-- Direct Multimodal Pipeline -->
          <div v-if="configStore.selectedPipeline === 'direct-multimodal'">
            <ModelSelector
              v-model="configStore.selectedModel"
              model-type="vision"
              label="Vision Model"
              placeholder="Select a vision model"
            />
          </div>

          <!-- OCR → Parse Pipeline -->
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
    </section>

    <!-- Step 4: Parameters -->
    <section>
      <div class="flex items-center gap-2 mb-3">
        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
          4
        </span>
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Configure Parameters
        </h2>
      </div>
      <ParameterPanel 
        :show-ocr-prompt="configStore.isOcrPipeline"
        :disabled="isRunning"
      />
    </section>

    <!-- Step 5: Run Test -->
    <section class="execute-section sticky bottom-0 bg-gray-50 pt-4 pb-2 border-t border-gray-200">
      <div class="flex items-center gap-2 mb-3">
        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
          5
        </span>
        <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Execute Test
        </h2>
      </div>

      <!-- Runner error -->
      <div v-if="runnerError" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-700 text-sm flex items-center gap-2">
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          {{ runnerError }}
        </p>
      </div>

      <div class="flex gap-3">
        <BaseButton
          v-if="!isRunning"
          variant="primary"
          size="lg"
          icon="play"
          :disabled="!canRunTest"
          class="flex-1"
          @click="handleRunTest"
        >
          {{ runButtonText }}
        </BaseButton>

        <BaseButton
          v-else
          variant="danger"
          size="lg"
          icon="times"
          class="flex-1"
          @click="handleCancelTest"
        >
          Cancel Test
        </BaseButton>
      </div>

      <!-- Status hints -->
      <div class="mt-2 text-center">
        <p v-if="!hasFile" class="text-xs text-gray-500">
          Upload a document to get started
        </p>
        <p v-else-if="!isOnline" class="text-xs text-red-500">
          Ollama server is offline
        </p>
        <p v-else-if="isRunning" class="text-xs text-primary-600">
          Test in progress...
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.config-panel {
  background-color: #f9fafb;
}

/* Execute section extends to panel edges for full-width sticky footer */
.execute-section {
  margin-left: -1rem;
  margin-right: -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>

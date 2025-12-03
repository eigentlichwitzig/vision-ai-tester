<script setup lang="ts">
import { computed } from 'vue'
import type { PipelineType } from '@/types/models'
import { useConfigStore } from '@/stores/configStore'
import BaseCard from '@/components/base/BaseCard.vue'

const configStore = useConfigStore()

interface PipelineOption {
  id: PipelineType
  title: string
  description: string
  steps: string[]
}

const pipelines: PipelineOption[] = [
  {
    id: 'direct-multimodal',
    title: 'Direct Multimodal',
    description: 'Single vision model extracts JSON directly from the image',
    steps: ['Image', 'Vision Model', 'JSON']
  },
  {
    id: 'ocr-then-parse',
    title: 'OCR → Parse',
    description: 'Two-step process: OCR extracts text, then LLM parses to JSON',
    steps: ['Image', 'OCR', 'Text', 'LLM', 'JSON']
  }
]

const selectedPipeline = computed({
  get: () => configStore.selectedPipeline,
  set: (value: PipelineType) => configStore.setPipeline(value)
})

function selectPipeline(pipelineId: PipelineType): void {
  selectedPipeline.value = pipelineId
}

function handleKeyDown(event: KeyboardEvent, pipelineId: PipelineType): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectPipeline(pipelineId)
  }
}
</script>

<template>
  <BaseCard title="Pipeline Selection" subtitle="Choose how documents are processed">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="pipeline in pipelines"
        :key="pipeline.id"
        role="radio"
        :aria-checked="selectedPipeline === pipeline.id"
        :tabindex="0"
        :class="[
          'relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          selectedPipeline === pipeline.id
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        ]"
        @click="selectPipeline(pipeline.id)"
        @keydown="handleKeyDown($event, pipeline.id)"
      >
        <!-- Radio indicator -->
        <div class="absolute top-4 right-4">
          <div
            :class="[
              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
              selectedPipeline === pipeline.id
                ? 'border-primary-500 bg-primary-500'
                : 'border-gray-300'
            ]"
          >
            <div
              v-if="selectedPipeline === pipeline.id"
              class="w-2 h-2 rounded-full bg-white"
            />
          </div>
        </div>

        <!-- Pipeline info -->
        <div class="pr-8">
          <h4 class="text-base font-semibold text-gray-900">
            {{ pipeline.title }}
          </h4>
          <p class="mt-1 text-sm text-gray-500">
            {{ pipeline.description }}
          </p>
        </div>

        <!-- Workflow diagram -->
        <div class="mt-4 flex items-center flex-wrap gap-2">
          <template v-for="(step, index) in pipeline.steps" :key="step">
            <span
              :class="[
                'px-2 py-1 text-xs font-medium rounded',
                selectedPipeline === pipeline.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600'
              ]"
            >
              {{ step }}
            </span>
            <i
              v-if="index < pipeline.steps.length - 1"
              class="pi pi-arrow-right text-xs text-gray-400"
              aria-hidden="true"
            />
          </template>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
</style>

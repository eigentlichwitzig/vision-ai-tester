<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseSlider from '@/components/base/BaseSlider.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PromptEditor from '@/components/config/PromptEditor.vue'

interface Props {
  showOcrPrompt?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showOcrPrompt: false,
  disabled: false
})

const configStore = useConfigStore()

// Parameter constraints
const TEMPERATURE_MIN = 0
const TEMPERATURE_MAX = 1
const TEMPERATURE_STEP = 0.1

const MAX_TOKENS_MIN = 512
const MAX_TOKENS_MAX = 16000
const MAX_TOKENS_STEP = 256

const CONTEXT_WINDOW_MIN = 2048
const CONTEXT_WINDOW_MAX = 32768
const CONTEXT_WINDOW_STEP = 1024

// Local reactive refs bound to store - for direct multimodal pipeline
const temperature = computed({
  get: () => configStore.temperature,
  set: (value: number) => { configStore.temperature = value }
})

const maxTokens = computed({
  get: () => configStore.maxTokens,
  set: (value: number) => { configStore.maxTokens = value }
})

const numCtx = computed({
  get: () => configStore.numCtx,
  set: (value: number) => { configStore.numCtx = value }
})

const systemPrompt = computed({
  get: () => configStore.systemPrompt,
  set: (value: string) => { configStore.systemPrompt = value }
})

const userPrompt = computed({
  get: () => configStore.userPrompt,
  set: (value: string) => { configStore.userPrompt = value }
})

// OCR step configuration bindings
const ocrTemperature = computed({
  get: () => configStore.ocrConfig.temperature,
  set: (value: number) => { configStore.updateOcrConfig({ temperature: value }) }
})

const ocrMaxTokens = computed({
  get: () => configStore.ocrConfig.maxTokens,
  set: (value: number) => { configStore.updateOcrConfig({ maxTokens: value }) }
})

const ocrNumCtx = computed({
  get: () => configStore.ocrConfig.numCtx,
  set: (value: number) => { configStore.updateOcrConfig({ numCtx: value }) }
})

const ocrSystemPrompt = computed({
  get: () => configStore.ocrConfig.systemPrompt,
  set: (value: string) => { configStore.updateOcrConfig({ systemPrompt: value }) }
})

const ocrUserPrompt = computed({
  get: () => configStore.ocrConfig.userPrompt,
  set: (value: string) => { configStore.updateOcrConfig({ userPrompt: value }) }
})

// Parse step configuration bindings
const parseTemperature = computed({
  get: () => configStore.parseConfig.temperature,
  set: (value: number) => { configStore.updateParseConfig({ temperature: value }) }
})

const parseMaxTokens = computed({
  get: () => configStore.parseConfig.maxTokens,
  set: (value: number) => { configStore.updateParseConfig({ maxTokens: value }) }
})

const parseNumCtx = computed({
  get: () => configStore.parseConfig.numCtx,
  set: (value: number) => { configStore.updateParseConfig({ numCtx: value }) }
})

const parseSystemPrompt = computed({
  get: () => configStore.parseConfig.systemPrompt,
  set: (value: string) => { configStore.updateParseConfig({ systemPrompt: value }) }
})

const parseUserPrompt = computed({
  get: () => configStore.parseConfig.userPrompt,
  set: (value: string) => { configStore.updateParseConfig({ userPrompt: value }) }
})

// Accordion state for OCR pipeline sections
const ocrSectionExpanded = ref(true)
const parseSectionExpanded = ref(true)

// Advanced options toggle - use computed to stay in sync with store
const showAdvanced = computed({
  get: () => configStore.showAdvancedOptions,
  set: (value: boolean) => {
    if (value !== configStore.showAdvancedOptions) {
      configStore.toggleAdvancedOptions()
    }
  }
})

const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value
}

// Reset to defaults
const handleReset = () => {
  configStore.resetParameters()
}

// Temperature marks
const temperatureMarks = {
  0: '0.0',
  0.5: '0.5',
  1: '1.0'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Direct Multimodal Pipeline Configuration -->
    <template v-if="!configStore.isOcrPipeline">
      <!-- Model Parameters Section -->
      <BaseCard title="Model Parameters" subtitle="Configure inference settings">
        <div class="space-y-6">
          <!-- Temperature Slider -->
          <div>
            <BaseSlider
              v-model="temperature"
              :min="TEMPERATURE_MIN"
              :max="TEMPERATURE_MAX"
              :step="TEMPERATURE_STEP"
              :disabled="disabled"
              label="Temperature"
              :marks="temperatureMarks"
            />
            <p class="mt-1 text-xs text-gray-500">
              Higher = more creative, Lower = more deterministic
            </p>
          </div>

          <!-- Max Tokens Slider -->
          <div>
            <BaseSlider
              v-model="maxTokens"
              :min="MAX_TOKENS_MIN"
              :max="MAX_TOKENS_MAX"
              :step="MAX_TOKENS_STEP"
              :disabled="disabled"
              label="Max Tokens"
            />
            <p class="mt-1 text-xs text-gray-500">
              Maximum tokens in response
            </p>
          </div>

          <!-- Context Window Slider -->
          <div>
            <BaseSlider
              v-model="numCtx"
              :min="CONTEXT_WINDOW_MIN"
              :max="CONTEXT_WINDOW_MAX"
              :step="CONTEXT_WINDOW_STEP"
              :disabled="disabled"
              label="Context Window"
            />
            <p class="mt-1 text-xs text-gray-500">
              Context window size for model
            </p>
          </div>
        </div>
      </BaseCard>

      <!-- System Prompt Section -->
      <BaseCard title="System Prompt">
        <PromptEditor
          v-model="systemPrompt"
          placeholder="Enter system prompt..."
          :disabled="disabled"
          :rows="6"
          description="Instructions for the model's behavior and output format"
        />
      </BaseCard>

      <!-- User Prompt Section -->
      <BaseCard title="User Prompt">
        <PromptEditor
          v-model="userPrompt"
          placeholder="Enter user prompt..."
          :disabled="disabled"
          :rows="3"
          description="The task instruction sent with each document"
        />
      </BaseCard>
    </template>

    <!-- OCR Pipeline Configuration -->
    <template v-else>
      <!-- Vision Model (OCR Step) Section -->
      <BaseCard>
        <template #header>
          <button
            type="button"
            class="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
            :aria-expanded="ocrSectionExpanded"
            @click="ocrSectionExpanded = !ocrSectionExpanded"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  1
                </span>
                <h3 class="text-lg font-semibold text-gray-900">
                  Vision Model (OCR Step)
                </h3>
              </div>
              <p class="mt-1 text-sm text-gray-500 ml-8">
                Extracts text from document images
              </p>
            </div>
            <i
              :class="[
                'pi transition-transform duration-200 text-gray-500',
                ocrSectionExpanded ? 'pi-chevron-up' : 'pi-chevron-down'
              ]"
              aria-hidden="true"
            />
          </button>
        </template>

        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="ocrSectionExpanded" class="space-y-6">
            <!-- OCR Parameters -->
            <div class="space-y-4 p-4 bg-blue-50 rounded-lg">
              <h4 class="text-sm font-medium text-blue-800">OCR Model Parameters</h4>
              
              <!-- Temperature Slider -->
              <div>
                <BaseSlider
                  v-model="ocrTemperature"
                  :min="TEMPERATURE_MIN"
                  :max="TEMPERATURE_MAX"
                  :step="TEMPERATURE_STEP"
                  :disabled="disabled"
                  label="Temperature"
                  :marks="temperatureMarks"
                />
              </div>

              <!-- Max Tokens Slider -->
              <div>
                <BaseSlider
                  v-model="ocrMaxTokens"
                  :min="MAX_TOKENS_MIN"
                  :max="MAX_TOKENS_MAX"
                  :step="MAX_TOKENS_STEP"
                  :disabled="disabled"
                  label="Max Tokens"
                />
              </div>

              <!-- Context Window Slider -->
              <div>
                <BaseSlider
                  v-model="ocrNumCtx"
                  :min="CONTEXT_WINDOW_MIN"
                  :max="CONTEXT_WINDOW_MAX"
                  :step="CONTEXT_WINDOW_STEP"
                  :disabled="disabled"
                  label="Context Window"
                />
              </div>
            </div>

            <!-- OCR System Prompt -->
            <div>
              <PromptEditor
                v-model="ocrSystemPrompt"
                label="System Prompt"
                placeholder="Enter OCR system prompt..."
                :disabled="disabled"
                :rows="4"
                description="Instructions for the OCR model's behavior"
              />
            </div>

            <!-- OCR User Prompt -->
            <div>
              <PromptEditor
                v-model="ocrUserPrompt"
                label="User Prompt"
                placeholder="Enter OCR user prompt..."
                :disabled="disabled"
                :rows="2"
                description="Task instruction for text extraction"
              />
            </div>
          </div>
        </transition>
      </BaseCard>

      <!-- Parse Model (Parsing Step) Section -->
      <BaseCard>
        <template #header>
          <button
            type="button"
            class="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
            :aria-expanded="parseSectionExpanded"
            @click="parseSectionExpanded = !parseSectionExpanded"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  2
                </span>
                <h3 class="text-lg font-semibold text-gray-900">
                  Parse Model (Parsing Step)
                </h3>
              </div>
              <p class="mt-1 text-sm text-gray-500 ml-8">
                Converts extracted text into structured JSON
              </p>
            </div>
            <i
              :class="[
                'pi transition-transform duration-200 text-gray-500',
                parseSectionExpanded ? 'pi-chevron-up' : 'pi-chevron-down'
              ]"
              aria-hidden="true"
            />
          </button>
        </template>

        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="parseSectionExpanded" class="space-y-6">
            <!-- Parse Parameters -->
            <div class="space-y-4 p-4 bg-green-50 rounded-lg">
              <h4 class="text-sm font-medium text-green-800">Parse Model Parameters</h4>
              
              <!-- Temperature Slider -->
              <div>
                <BaseSlider
                  v-model="parseTemperature"
                  :min="TEMPERATURE_MIN"
                  :max="TEMPERATURE_MAX"
                  :step="TEMPERATURE_STEP"
                  :disabled="disabled"
                  label="Temperature"
                  :marks="temperatureMarks"
                />
              </div>

              <!-- Max Tokens Slider -->
              <div>
                <BaseSlider
                  v-model="parseMaxTokens"
                  :min="MAX_TOKENS_MIN"
                  :max="MAX_TOKENS_MAX"
                  :step="MAX_TOKENS_STEP"
                  :disabled="disabled"
                  label="Max Tokens"
                />
              </div>

              <!-- Context Window Slider -->
              <div>
                <BaseSlider
                  v-model="parseNumCtx"
                  :min="CONTEXT_WINDOW_MIN"
                  :max="CONTEXT_WINDOW_MAX"
                  :step="CONTEXT_WINDOW_STEP"
                  :disabled="disabled"
                  label="Context Window"
                />
              </div>
            </div>

            <!-- Parse System Prompt -->
            <div>
              <PromptEditor
                v-model="parseSystemPrompt"
                label="System Prompt"
                placeholder="Enter parse system prompt..."
                :disabled="disabled"
                :rows="6"
                description="Instructions for parsing text into structured JSON"
              />
            </div>

            <!-- Parse User Prompt -->
            <div>
              <PromptEditor
                v-model="parseUserPrompt"
                label="User Prompt"
                placeholder="Enter parse user prompt..."
                :disabled="disabled"
                :rows="2"
                description="Task instruction for JSON extraction"
              />
            </div>
          </div>
        </transition>
      </BaseCard>
    </template>

    <!-- Action Buttons -->
    <div class="flex items-center justify-between pt-2">
      <BaseButton
        variant="secondary"
        size="sm"
        icon="refresh"
        :disabled="disabled"
        @click="handleReset"
      >
        Reset to Defaults
      </BaseButton>

      <button
        type="button"
        :class="[
          'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          disabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        ]"
        :disabled="disabled"
        :aria-expanded="showAdvanced"
        @click="toggleAdvanced"
      >
        <span>Advanced</span>
        <i
          :class="[
            'pi transition-transform duration-200',
            showAdvanced ? 'pi-chevron-up' : 'pi-chevron-down'
          ]"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Advanced Options Section (collapsible) -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-96"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-96"
      leave-to-class="opacity-0 max-h-0"
    >
      <BaseCard
        v-if="showAdvanced"
        title="Advanced Options"
        subtitle="Additional configuration settings"
      >
        <div class="space-y-4">
          <!-- Thinking Mode toggle -->
          <div class="flex items-center justify-between">
            <div>
              <label
                for="thinking-mode-toggle"
                class="text-sm font-medium text-gray-700"
              >
                Thinking Mode
              </label>
              <p class="text-xs text-gray-500">
                Enable reasoning/thinking for supported models (e.g., DeepSeek-R1)
              </p>
            </div>
            <button
              id="thinking-mode-toggle"
              type="button"
              role="switch"
              :aria-checked="configStore.thinkingMode"
              :disabled="disabled"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                configStore.thinkingMode ? 'bg-primary-600' : 'bg-gray-200',
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              @click="configStore.thinkingMode = !configStore.thinkingMode"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
                  'transition duration-200 ease-in-out',
                  configStore.thinkingMode ? 'translate-x-5' : 'translate-x-0'
                ]"
              />
            </button>
          </div>

          <!-- Auto-save toggle -->
          <div class="flex items-center justify-between">
            <div>
              <label
                for="auto-save-toggle"
                class="text-sm font-medium text-gray-700"
              >
                Auto-save test runs
              </label>
              <p class="text-xs text-gray-500">
                Automatically save test runs to history
              </p>
            </div>
            <button
              id="auto-save-toggle"
              type="button"
              role="switch"
              :aria-checked="configStore.autoSaveTests"
              :disabled="disabled"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                configStore.autoSaveTests ? 'bg-primary-600' : 'bg-gray-200',
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              @click="configStore.autoSaveTests = !configStore.autoSaveTests"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
                  'transition duration-200 ease-in-out',
                  configStore.autoSaveTests ? 'translate-x-5' : 'translate-x-0'
                ]"
              />
            </button>
          </div>

          <!-- Theme selector placeholder -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-medium text-gray-700">
                Theme
              </span>
              <p class="text-xs text-gray-500">
                Application appearance
              </p>
            </div>
            <select
              v-model="configStore.theme"
              :disabled="disabled"
              class="block w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </BaseCard>
    </transition>
  </div>
</template>

<style scoped>
/* Smooth height transition for advanced options */
.max-h-0 {
  max-height: 0;
  overflow: hidden;
}

.max-h-96 {
  max-height: 24rem;
}
</style>

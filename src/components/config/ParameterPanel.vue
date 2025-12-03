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
const MAX_TOKENS_MAX = 8192
const MAX_TOKENS_STEP = 256

const CONTEXT_WINDOW_MIN = 2048
const CONTEXT_WINDOW_MAX = 32768
const CONTEXT_WINDOW_STEP = 1024

// Local reactive refs bound to store
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

const ocrPrompt = computed({
  get: () => configStore.ocrPrompt,
  set: (value: string) => { configStore.ocrPrompt = value }
})

// Advanced options toggle
const showAdvanced = ref(configStore.showAdvancedOptions)

const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value
  configStore.toggleAdvancedOptions()
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

    <!-- OCR Prompt Section (conditional) -->
    <BaseCard
      v-if="showOcrPrompt"
      title="OCR Prompt"
      subtitle="OCR Pipeline only"
    >
      <PromptEditor
        v-model="ocrPrompt"
        placeholder="Enter OCR prompt..."
        :disabled="disabled"
        :rows="3"
        description="Instructions for text extraction from documents"
      />
    </BaseCard>

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

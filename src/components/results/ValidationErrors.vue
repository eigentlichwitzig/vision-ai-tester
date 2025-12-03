<script setup lang="ts">
/**
 * ValidationErrors.vue - Component for displaying JSON validation errors
 * Shows validation errors in a collapsible panel with clear, actionable messages
 */

import { computed, ref } from 'vue'
import type { ValidationError } from '@/types/models'

const props = defineProps<{
  errors: ValidationError[]
}>()

// Panel expanded state
const isExpanded = ref(true)

// Computed properties
const errorCount = computed(() => props.errors.length)

const hasErrors = computed(() => props.errors.length > 0)

// Toggle panel expansion
function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value
}

// Get error severity icon
function getErrorIcon(keyword: string): string {
  // Additional properties are warnings, everything else is an error
  if (keyword === 'additionalProperties') {
    return 'pi-exclamation-triangle'
  }
  return 'pi-times-circle'
}

// Get error severity class
function getErrorClass(keyword: string): string {
  if (keyword === 'additionalProperties') {
    return 'warning'
  }
  return 'error'
}
</script>

<template>
  <div v-if="hasErrors" class="validation-errors">
    <!-- Header -->
    <div 
      class="validation-header"
      @click="toggleExpanded"
    >
      <div class="header-content">
        <i class="pi pi-exclamation-triangle warning-icon" />
        <span class="header-text">Validation Errors</span>
        <span class="error-badge">{{ errorCount }}</span>
      </div>
      <i 
        class="pi toggle-icon"
        :class="isExpanded ? 'pi-chevron-down' : 'pi-chevron-right'"
      />
    </div>
    
    <!-- Error list -->
    <div v-if="isExpanded" class="error-list">
      <div
        v-for="(error, index) in errors"
        :key="index"
        class="error-item"
        :class="getErrorClass(error.keyword)"
      >
        <div class="error-icon-wrapper">
          <i class="pi" :class="getErrorIcon(error.keyword)" />
        </div>
        <div class="error-content">
          <div class="field-path">{{ error.field }}</div>
          <div class="error-message">{{ error.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.validation-errors {
  background-color: var(--surface-50);
  border: 1px solid var(--red-200);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 1rem;
}

.validation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: var(--red-50);
  cursor: pointer;
  user-select: none;
}

.validation-header:hover {
  background-color: var(--red-100);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.warning-icon {
  color: var(--red-500);
}

.header-text {
  font-weight: 600;
  color: var(--red-700);
}

.error-badge {
  background-color: var(--red-500);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  min-width: 1.5rem;
  text-align: center;
}

.toggle-icon {
  color: var(--red-500);
  transition: transform 0.2s ease;
}

.error-list {
  padding: 0.5rem;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.error-item:last-child {
  margin-bottom: 0;
}

.error-item.error {
  background-color: var(--red-50);
}

.error-item.error .error-icon-wrapper i {
  color: var(--red-500);
}

.error-item.warning {
  background-color: var(--yellow-50);
}

.error-item.warning .error-icon-wrapper i {
  color: var(--yellow-600);
}

.error-icon-wrapper {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.field-path {
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
  word-break: break-all;
}

.error-message {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
}
</style>

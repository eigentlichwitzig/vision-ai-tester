<script setup lang="ts">
/**
 * TestSuiteView - Main application view
 * Production-ready split-pane layout integrating all components
 */

import AppHeader from '@/components/layout/AppHeader.vue'
import SplitPane from '@/components/layout/SplitPane.vue'
import ConfigPanel from '@/components/layout/ConfigPanel.vue'
import ResultsWrapper from '@/components/layout/ResultsWrapper.vue'
</script>

<template>
  <div class="test-suite-view h-screen flex flex-col bg-gray-50 overflow-hidden">
    <!-- Application Header -->
    <AppHeader />

    <!-- Main Content - Split Pane Layout -->
    <main class="flex-1 min-h-0">
      <SplitPane
        :initial-left-width="38"
        :min-left-width="28"
        :max-left-width="55"
      >
        <template #left>
          <ConfigPanel />
        </template>

        <template #right>
          <ResultsWrapper />
        </template>
      </SplitPane>
    </main>
  </div>
</template>

<style scoped>
.test-suite-view {
  min-height: 100vh;
}
</style>

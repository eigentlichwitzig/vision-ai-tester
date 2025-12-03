# Repository Reorganization Plan

This document describes the reorganization of the Vision AI Tester repository to match the target structure defined in `PROJECT-GUIDE.md`.

## Overview

The repository has been reorganized to follow a clear, modular structure that separates concerns and makes the codebase easier to navigate and maintain.

## Changes Made

### New Directory Structure

The following directories and files were created under `src/`:

```
src/
├── api/                          # ✅ NEW - API client layer
│   ├── index.ts                  # Unified API exports
│   ├── ollama.ts                 # Ollama API client
│   └── types.ts                  # API request/response types
├── components/                   # ✅ NEW - Component directories
│   ├── base/.gitkeep             # Reusable UI primitives
│   ├── upload/.gitkeep           # File handling components
│   ├── config/.gitkeep           # Configuration UI components
│   ├── results/.gitkeep          # Output display components
│   └── layout/.gitkeep           # Layout components
├── composables/                  # ✅ NEW - Vue composition functions
│   ├── useOllamaApi.ts           # Ollama API composable
│   ├── useFileUpload.ts          # File upload handling
│   ├── useTestRunner.ts          # Test execution logic
│   ├── useTestHistory.ts         # Test history management
│   └── useJsonDiff.ts            # JSON comparison
├── db/                           # ✅ NEW - Database layer
│   └── index.ts                  # Dexie.js schema and helpers
├── stores/                       # ✅ NEW - Pinia stores
│   ├── testStore.ts              # Test execution state
│   ├── configStore.ts            # User preferences
│   └── schemaStore.ts            # Schema management
├── types/                        # ✓ EXISTING - TypeScript definitions
│   ├── index.ts                  # Re-exports
│   ├── models.ts                 # Core data models
│   └── ollama.ts                 # Ollama API types
├── utils/                        # ✅ NEW - Utility functions
│   ├── base64.ts                 # Base64 encoding/decoding
│   ├── validators.ts             # Validation utilities
│   └── formatters.ts             # Formatting utilities
├── views/                        # ✓ EXISTING - Page components
│   ├── TestSuiteView.vue         # Main test suite
│   ├── HistoryView.vue           # Test history
│   └── CompareView.vue           # Run comparison
├── assets/                       # ✓ EXISTING - Static assets
│   └── main.css                  # Global styles
├── App.vue                       # ✓ EXISTING - Root component
├── main.ts                       # ✓ UPDATED - Entry point (fixed PrimeVue theming)
└── router.ts                     # ✓ EXISTING - Vue Router config
```

### Configuration Changes

1. **tsconfig.node.json** - Fixed extends path (was using non-existent `@vue/tsconfig/tsconfig.node.json`)
2. **package.json** - Fixed package versions:
   - `@tato30/vue-pdf`: `^1.12.4` → `^1.11.5` (version doesn't exist)
   - `json-editor-vue`: `^0.19.1` → `^0.18.1` (version doesn't exist)
3. **main.ts** - Updated PrimeVue 4 theming to use the new preset-based approach

### Dependencies Added

- `@vue/tsconfig` - TypeScript configuration for Vue
- `@primevue/themes` - PrimeVue 4 theme presets

## Preserved Files

The following items were preserved without modification:
- `.taskmaster/` - Task Master configuration (per requirements)
- `PROJECT-GUIDE.md` - Project documentation
- `README.md` - Repository documentation
- `CLAUDE.md` - AI assistant instructions
- All existing configuration files (tailwind, postcss, vite, etc.)

## Placeholder Notes

Several files contain TODO comments indicating future implementation needs:

- **Composables**: Basic structure with placeholder implementations
- **Stores**: Core state management with default values
- **API Client**: Functional Ollama client, OCR pipeline not yet implemented
- **Database**: Dexie schema defined, awaiting full integration

## Post-Migration Steps

For developers updating their local clones:

```bash
# Fetch the latest changes
git fetch origin

# Switch to the new branch
git checkout reorg/project-structure

# Install dependencies (required due to package changes)
npm install --legacy-peer-deps

# Verify the build works
npm run build

# Update IDE path mappings if necessary
# (tsconfig already has @/* → src/* mapping)
```

## Decisions Made

1. **Component Directories**: Created with `.gitkeep` files to establish structure while components are developed
2. **API Layer**: Created standalone module for better separation of concerns
3. **Composables**: Implemented with basic functionality that can be extended
4. **Stores**: Created with Pinia, using the composition API style consistent with Vue 3 best practices
5. **PrimeVue Theming**: Updated to use the new preset-based theming system for PrimeVue 4.x

## References

- [PROJECT-GUIDE.md](./PROJECT-GUIDE.md) - Target structure and development guidelines
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia State Management](https://pinia.vuejs.org/)
- [PrimeVue 4 Theming](https://primevue.org/theming/)

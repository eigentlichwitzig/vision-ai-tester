# Vision AI Tester - Project Guide

> **Quick Reference Guide for Development**
> Last Updated: 2025-12-03

---

## 📋 Project Overview

**Vision AI Tester** is a lightweight browser-based application for testing local Ollama multimodal models on construction documents. The system supports two pipelines and outputs deterministic structured JSON for comparison and quality evaluation.

### Core Objectives
- ✅ Reduce manual data extraction time from construction documents
- ✅ Achieve high accuracy for key fields on documents
- ✅ Ensure deterministic outputs (temperature=0) and high JSON validity
- ✅ Provide reproducible test runs with JSON diffing and metadata

---

## 🎯 Current Status

**Progress**: 0% (0/18 tasks completed)
- **Next Task**: #1 - Initialize Vue 3 + Vite + TypeScript Project
- **Priority Tasks**: 10 high-priority tasks
- **Blocking Tasks**: Task #1 blocks 17 other tasks

---

## 🏗️ Project Structure (Target)

```
vision-ai-tester/
├── src/
│   ├── api/                          # API client layer
│   │   ├── index.ts                 # Unified API client
│   │   ├── ollama.ts                # Ollama-specific endpoints
│   │   └── types.ts                 # API request/response types
│   ├── components/
│   │   ├── base/                    # Reusable UI primitives
│   │   │   ├── BaseButton.vue
│   │   │   ├── BaseCard.vue
│   │   │   └── BaseSlider.vue
│   │   ├── upload/                  # File handling components
│   │   │   ├── DropZone.vue
│   │   │   ├── FilePreview.vue
│   │   │   └── PdfRenderer.vue
│   │   ├── config/                  # Configuration UI
│   │   │   ├── ModelSelector.vue
│   │   │   ├── PipelineSelector.vue
│   │   │   ├── ParameterPanel.vue
│   │   │   └── SchemaEditor.vue
│   │   ├── results/                 # Output display
│   │   │   ├── JsonViewer.vue
│   │   │   ├── ResultCard.vue
│   │   │   └── ComparisonView.vue
│   │   └── layout/
│   │       ├── SplitPane.vue
│   │       └── AppHeader.vue
│   ├── composables/                 # Vue composition functions
│   │   ├── useOllamaApi.ts
│   │   ├── useFileUpload.ts
│   │   ├── useTestRunner.ts
│   │   ├── useTestHistory.ts
│   │   └── useJsonDiff.ts
│   ├── db/                          # IndexedDB configuration
│   │   └── index.ts                 # Dexie.js schema
│   ├── stores/                      # Pinia state management
│   │   ├── testStore.ts            # Test execution state
│   │   ├── configStore.ts          # User preferences
│   │   └── schemaStore.ts          # Schema management
│   ├── types/                       # TypeScript definitions
│   │   ├── models.ts               # TestRun, TestInput, etc.
│   │   ├── ollama.ts               # Ollama API types
│   │   └── index.ts                # Re-exports
│   ├── utils/                       # Helper functions
│   │   ├── base64.ts
│   │   ├── validators.ts
│   │   └── formatters.ts
│   ├── views/                       # Page components
│   │   ├── TestSuiteView.vue
│   │   ├── HistoryView.vue
│   │   └── CompareView.vue
│   ├── App.vue
│   ├── main.ts
│   └── router.ts
├── public/
│   └── schemas/                     # Predefined schemas
│       └── construction-order.json
├── .env.development
├── .env.production
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔧 Technology Stack

### Frontend Framework
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety

### State & Storage
- **Pinia** - State management with persistence
- **Dexie.js** - IndexedDB wrapper for local storage

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **PrimeVue** - Complex UI components (Splitter, FileUpload, TreeTable)

### External Dependencies
- **Ollama** - Local model inference server (localhost:11434)
- **jsondiffpatch** - JSON comparison and diff visualization
- **@tato30/vue-pdf** - PDF preview rendering
- **json-editor-vue** - Interactive JSON viewing

---

## 🚀 Two Pipeline Modes

### Pipeline 1: OCR → Parse (Two-Step)
1. **Step 1 (OCR)**: Vision model extracts plain text
   - Models: `deepseek-ocr`, `minicpm-v`
   - Output: Plain text representation of document
2. **Step 2 (Parse)**: LLM parses text into structured JSON
   - Models: `qwen2.5:7b` (text-only)
   - Output: Structured JSON matching schema

### Pipeline 2: Direct Multimodal (Single-Step)
1. **Single Step**: Multimodal vision model directly extracts structured data
   - Models: `qwen2.5vl:7b`, `llava:13b`
   - Output: Structured JSON matching schema

---

## 📊 Data Models

### TestRun Interface
```typescript
interface TestRun {
  id: string;                    // UUID
  timestamp: Date;
  modelName: string;             // e.g., "qwen2.5vl:7b"
  pipeline: 'ocr-then-parse' | 'direct-multimodal';
  ocrModel?: string;             // Only for ocr-then-parse pipeline
  parameters: TestParameters;
  input: TestInput;
  output: TestOutput;
  duration: number;              // milliseconds
  status: 'success' | 'error' | 'cancelled';
  tags?: string[];
}
```

### TestParameters Interface
```typescript
interface TestParameters {
  temperature: number;
  maxTokens?: number;
  numCtx?: number;
  systemPrompt: string;
  userPrompt: string;
  schemaId?: string;
}
```

### TestInput Interface
```typescript
interface TestInput {
  fileName: string;
  fileType: 'pdf' | 'image';
  mimeType: string;
  size: number;
  base64Content: string;         // Empty if stored separately
  fileRef?: string;              // ID reference for large files
  thumbnail?: string;
}
```

### TestOutput Interface
```typescript
interface TestOutput {
  raw: string;                   // Raw response from model
  parsed?: object;               // Validated JSON object
  ocrText?: string;              // Intermediate OCR output (if pipeline 1)
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalDuration?: number;
}
```

---

## 🎨 UI Layout

### Split-Pane Layout (Resizable)

**Left Panel (35%)**:
- File upload drop zone
- File preview (thumbnail/first page)
- Pipeline selector (OCR→Parse vs. Direct)
- Model selector(s)
- Parameter controls (temperature, tokens, context)
- System/user prompt editors
- Schema selector
- Run/Cancel buttons

**Right Panel (65%)**:
- **Tabs**:
  - JSON Output (interactive tree view)
  - Raw Response (plain text)
  - OCR Text (Pipeline 1 only)
  - Comparison (side-by-side diff)
- Test run metadata (duration, tokens, timestamp)
- Export buttons (JSON, CSV)

---

## 📝 Default Prompts

### System Prompt
```
You are a structured data extraction assistant. Your task is to extract information from documents and output valid JSON that strictly conforms to the provided schema.

Rules:
- Output ONLY valid JSON, no explanations or additional text
- Use null for missing or unclear fields
- Use ISO-8601 format for dates (YYYY-MM-DD)
- Use numbers (not strings) for all numeric values
- Preserve original text accuracy
```

### User Prompt
```
Extract all fields from this document according to the schema. Be precise and accurate.
```

### OCR Prompt (Pipeline 1, Step 1)
```
Extract all visible text from this document. Preserve the layout and structure. Output the text exactly as it appears.
```

---

## 🔑 Critical Implementation Details

### Ollama API Integration

**Base64 Image Encoding**:
- ⚠️ **CRITICAL**: Strip `data:image/jpeg;base64,` prefix before sending
- Send raw base64 string only

**API Request Format**:
```json
{
  "model": "qwen2.5vl:7b",
  "messages": [
    {
      "role": "system",
      "content": "You are a structured extraction assistant..."
    },
    {
      "role": "user",
      "content": "Extract all fields from this document...",
      "images": ["<base64-encoded-image-without-prefix>"]
    }
  ],
  "format": { /* JSON Schema */ },
  "stream": false,
  "options": {
    "temperature": 0,
    "num_predict": 4096,
    "num_ctx": 8192
  }
}
```

### CORS Configuration
- Development: Set `OLLAMA_ORIGINS="*"` environment variable
- Windows: Add environment variable, restart Ollama service
- Default Ollama URL: `http://localhost:11434`

### File Handling Rules
- **Max file size**: 20MB
- **Files >1MB**: Show warning message
- **Files >5MB**: Store separately in IndexedDB, lazy-load preview
- **PDFs**: Show first page as preview by default

---

## ✅ Acceptance Criteria

### Functional Requirements
- ✅ Upload PDF/image files up to 20MB
- ✅ Select between OCR→Parse and Direct pipelines
- ✅ Choose separate OCR and parsing models for OCR pipeline
- ✅ Display file preview immediately after upload
- ✅ Complete test runs with valid JSON output
- ✅ Auto-save test runs to IndexedDB
- ✅ View test history and load previous runs
- ✅ Compare two test runs with visual diff
- ✅ Show clear error messages when Ollama unreachable
- ✅ Validate JSON against schema

### Performance Requirements
- ⚡ Page load time: <2 seconds
- ⚡ Test run display: <500ms (excluding model inference)
- ⚡ File preview: <1s (images), <3s (PDFs)
- ⚡ History view: Load 100 runs in <1 second
- 🎯 JSON validity: 95%+ of successful runs
- 🎯 Schema conformance: 100% of valid JSON

---

## 📋 Task Master Integration

### Current Task Breakdown (18 Tasks)

**Foundation Tasks** (High Priority):
1. ✅ Initialize Vue 3 + Vite + TypeScript Project (Task #1) - **NEXT**
2. ⏳ Set Up Pinia State Management (Task #2)
3. ⏳ Configure Dexie.js for IndexedDB (Task #3)
4. ⏳ Implement Ollama API Client (Task #4)

**UI Components** (Medium Priority):
5. ⏳ Develop Base UI Components (Task #5)
6. ⏳ Implement File Upload with Drag-and-Drop (Task #6) - *5 subtasks*
7. ⏳ Generate PDF and Image Previews (Task #7)

**Configuration** (Medium Priority):
8. ⏳ Implement Pipeline Selection (Task #8)
9. ⏳ Build Parameter Configuration Panel (Task #9)

**Pipeline Execution** (High Priority):
10. ⏳ Implement Direct Multimodal Pipeline (Task #10) - *4 subtasks*
11. ⏳ Implement OCR→Parse Pipeline (Task #11) - *5 subtasks*
12. ⏳ Validate JSON Output Against Schema (Task #12)

**Storage & History** (High Priority):
13. ⏳ Save and Load Test Runs in IndexedDB (Task #13) - *4 subtasks*
14. ⏳ Develop JSON Viewer (Task #14)
15. ⏳ Implement JSON Diffing (Task #15)

**Polish & Error Handling** (High/Medium Priority):
16. ⏳ Implement Ollama Connectivity Check (Task #16)
17. ⏳ Implement Loading States & Progress (Task #17)
18. ⏳ Implement Test History Browser (Task #18)

### Task Master Commands Reference

```bash
# View next task
task-master next

# View task details
task-master show <id>

# Start working on task
task-master set-status --id=<id> --status=in-progress

# Complete task
task-master set-status --id=<id> --status=done

# Add implementation notes
task-master update-subtask --id=<id> --prompt="notes..."

# List all tasks
task-master list --with-subtasks
```

---

## ⚠️ Common Pitfalls & Reminders

### Base64 Encoding
- ❌ **DON'T**: Send `data:image/jpeg;base64,iVBORw0KG...`
- ✅ **DO**: Send `iVBORw0KG...` (raw base64 only)

### State Management Strategy
- **Local component state**: UI-only (dropdown open/closed)
- **Composables**: Reusable logic with reactivity (API calls, file processing)
- **Pinia stores**: Cross-component shared state (test runs, config)
- **IndexedDB**: Persistent storage (test history, large files)

### Error Handling Priority
1. Ollama connectivity (check on startup)
2. CORS misconfiguration (provide setup instructions)
3. Model not pulled (provide `ollama pull` commands)
4. File size limits (20MB max)
5. JSON validation failures (clear schema errors)

### TypeScript Strict Mode
- Maintain TypeScript strict mode throughout
- All types defined in `src/types/`
- No `any` types without justification

---

## 🎯 Success Metrics

### Development Metrics
- **Sprint velocity**: Complete 80% of planned tasks per sprint
- **Code quality**: TypeScript strict mode, <5 ESLint errors
- **Test coverage**: 70%+ on composables and utilities

### User Metrics (Post-Launch)
- **Accuracy**: 85%+ field extraction accuracy
- **Reliability**: 95%+ successful test runs
- **Usability**: Complete first test in <5 minutes
- **Performance**: Test run completes in <30s (excluding inference)

---

## 📚 Resources

### Documentation Links
- Vue 3: https://vuejs.org/
- Vite: https://vitejs.dev/
- Pinia: https://pinia.vuejs.org/
- Dexie.js: https://dexie.org/
- Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
- PrimeVue: https://primevue.org/

### Key Files
- **PRD**: `.taskmaster/docs/prd.txt`
- **Tasks**: `.taskmaster/tasks/tasks.json`
- **This Guide**: `PROJECT-GUIDE.md`

---

## 🚦 Next Steps

1. **Start Task #1**: Initialize Vue 3 + Vite + TypeScript project
2. **Set up development environment**: Install Node.js, npm/pnpm
3. **Install Ollama**: Download and configure local Ollama server
4. **Pull required models**: `ollama pull qwen2.5vl:7b`, `ollama pull deepseek-ocr`
5. **Configure CORS**: Set `OLLAMA_ORIGINS="*"` for development

---

## 💡 Development Philosophy

### Architectural Principles
- **Separation of Concerns**: Clear boundaries between API, state, UI
- **Single Responsibility**: Each component/composable has one job
- **Type Safety**: Leverage TypeScript for compile-time guarantees
- **Modularity**: Easy to swap implementations (e.g., API providers)

### Code Standards
- Use composition API (not options API)
- Prefer composables over mixins
- Keep components under 300 lines
- Extract complex logic into utilities
- Write JSDoc comments for public APIs

---

**Remember**: This is a reference guide. Update as needed throughout development. When in doubt, refer back to the PRD and Task Master tasks.

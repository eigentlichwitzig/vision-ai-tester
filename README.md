# Vision AI Tester

A lightweight browser-based application for testing local Ollama multimodal models on construction documents. The system supports two pipeline modes and outputs deterministic structured JSON for comparison and quality evaluation.

## Features

- **Dual Pipeline Support**:
  - **OCR → Parse**: Two-step process using vision models for OCR and LLMs for parsing
  - **Direct Multimodal**: Single-step extraction using vision-language models
- **Structured JSON Output**: Deterministic outputs (temperature=0) with schema validation
- **Test History**: Save and compare test runs with visual JSON diffing
- **Local Storage**: All data stored locally in IndexedDB
- **PDF & Image Support**: Upload and process construction documents up to 20MB

## Technology Stack

- **Frontend**: Vue 3 + Vite + TypeScript
- **State Management**: Pinia with persistence
- **Storage**: Dexie.js (IndexedDB wrapper)
- **UI Components**: Tailwind CSS + PrimeVue
- **AI Backend**: Ollama (local inference server)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **pnpm**
- **Ollama** (for running local AI models)

### Installing Ollama

1. Download and install Ollama from [ollama.com](https://ollama.com)
2. Pull required models:
   ```bash
   ollama pull qwen2.5vl:7b        # Vision-language model (direct pipeline)
   ollama pull deepseek-ocr         # OCR model (pipeline 1)
   ollama pull qwen2.5:7b           # Text parsing model (pipeline 1)
   ```

### Configuring CORS for Ollama

For local development, you need to enable CORS in Ollama:

**Windows**:
1. Open System Properties → Advanced → Environment Variables
2. Add new system variable: `OLLAMA_ORIGINS=*`
3. Restart the Ollama service

**macOS/Linux**:
```bash
export OLLAMA_ORIGINS="*"
```

Add this to your `.bashrc` or `.zshrc` for persistence.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vision-ai-tester
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.development
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

### Running a Test

1. **Upload a Document**: Drag and drop a PDF or image file (max 20MB)
2. **Select Pipeline**:
   - **OCR → Parse**: Choose separate OCR and parsing models
   - **Direct Multimodal**: Select a single vision-language model
3. **Configure Parameters**:
   - Temperature (default: 0 for deterministic output)
   - Max tokens, context window
   - System and user prompts
4. **Select Schema**: Choose a JSON schema for structured output
5. **Run Test**: Click "Run Test" and wait for results

### Viewing Results

- **JSON Output**: Interactive tree view of extracted data
- **Raw Response**: Plain text model output
- **OCR Text**: Intermediate OCR text (OCR→Parse pipeline only)
- **Comparison**: Compare two test runs side-by-side with diff highlighting

### Test History

All test runs are automatically saved to IndexedDB. Navigate to the History page to:
- Browse previous test runs
- Filter by model, date, or status
- Load and review past results
- Compare multiple runs

## Project Structure

```
vision-ai-tester/
├── src/
│   ├── api/              # Ollama API client
│   ├── components/       # Vue components
│   │   ├── base/        # Reusable UI components
│   │   ├── config/      # Configuration panels
│   │   ├── results/     # Result display components
│   │   └── upload/      # File upload components
│   ├── composables/     # Vue composition functions
│   ├── db/              # IndexedDB configuration
│   ├── stores/          # Pinia state stores
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Helper functions
│   └── views/           # Page components
├── public/
│   └── schemas/         # Predefined JSON schemas
└── .taskmaster/         # Task Master AI integration
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript type checking
npm run lint         # Lint and fix code
```

### Task Master Integration

This project uses [Task Master AI](https://github.com/cyanheads/task-master-ai) for task management:

```bash
# View next task
task-master next

# View task details
task-master show <id>

# Mark task complete
task-master set-status --id=<id> --status=done

# List all tasks
task-master list
```

See [.taskmaster/CLAUDE.md](.taskmaster/CLAUDE.md) for complete Task Master integration guide.

## Pipeline Modes

### Pipeline 1: OCR → Parse (Two-Step)

1. **OCR Step**: Vision model extracts plain text from document
   - Models: `deepseek-ocr`, `minicpm-v`
2. **Parse Step**: LLM converts text to structured JSON
   - Models: `qwen2.5:7b` (text-only)

**Best for**: Complex documents with mixed layouts, when you want to review OCR output separately

### Pipeline 2: Direct Multimodal (Single-Step)

1. **Single Step**: Vision-language model directly extracts structured data
   - Models: `qwen2.5vl:7b`, `llava:13b`

**Best for**: Simple documents, faster processing, when structure is straightforward

## Performance Guidelines

- **File Size**:
  - Up to 1MB: Optimal performance
  - 1-5MB: Warning shown, may be slower
  - 5-20MB: Stored separately, lazy-loaded preview
- **Model Selection**: Smaller models (7B) are faster but less accurate than larger models (13B+)
- **Temperature**: Use 0 for deterministic outputs, higher values for varied results

## Troubleshooting

### Ollama Connection Failed

**Error**: "Failed to connect to Ollama"

**Solutions**:
1. Verify Ollama is running: `ollama list`
2. Check CORS configuration: Ensure `OLLAMA_ORIGINS=*` is set
3. Test API directly: `curl http://localhost:11434/api/tags`

### Model Not Found

**Error**: "Model not found: qwen2.5vl:7b"

**Solution**: Pull the model:
```bash
ollama pull qwen2.5vl:7b
```

### Invalid JSON Output

**Issue**: Model returns invalid JSON or plain text

**Solutions**:
1. Ensure temperature is set to 0
2. Try a different model (some models handle structured output better)
3. Improve system prompt with more specific JSON format instructions

## Contributing

This project follows Task Master AI workflow. To contribute:

1. Review open tasks: `task-master list`
2. Pick a task: `task-master next`
3. Implement and test changes
4. Mark complete: `task-master set-status --id=<id> --status=done`

## License

MIT

## Acknowledgments

- Built with [Vue 3](https://vuejs.org/)
- Powered by [Ollama](https://ollama.com)
- Task management by [Task Master AI](https://github.com/cyanheads/task-master-ai)
- UI components from [PrimeVue](https://primevue.org/)

## Support

For issues and questions:
- Check [PROJECT-GUIDE.md](PROJECT-GUIDE.md) for detailed documentation
- Review Task Master tasks: `task-master list`
- Refer to Ollama API docs: [ollama.com/docs](https://ollama.com/docs)

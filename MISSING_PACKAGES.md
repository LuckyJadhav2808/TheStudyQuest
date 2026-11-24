# Missing packages

All requested packages installed. Intentional deviations:

- shadcn/ui CLI: not initialised (its default gray look conflicts with the Soft Bento Brutalism system). `src/components/ui` contains hand-built primitives on cva + tailwind-merge instead.
- pyodide (npm): loaded from the jsDelivr CDN inside a Web Worker instead (avoids bundling ~10MB wasm). Feature: /notebook, /code, /ml. Bridge: comlink.
- PPTX renderer: intentionally skipped (placeholder card in /reader).

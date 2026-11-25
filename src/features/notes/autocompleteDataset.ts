import type { Editor, Range } from "@tiptap/core";

export interface MathSymbolItem {
  label: string;
  latex: string;
  hint: string;
}

export const MATH_PALETTE: MathSymbolItem[] = [
  { label: "α", latex: "\\alpha", hint: "Alpha" },
  { label: "β", latex: "\\beta", hint: "Beta" },
  { label: "θ", latex: "\\theta", hint: "Theta" },
  { label: "λ", latex: "\\lambda", hint: "Lambda" },
  { label: "π", latex: "\\pi", hint: "Pi" },
  { label: "σ", latex: "\\sigma", hint: "Sigma" },
  { label: "Σ", latex: "\\sum_{i=1}^{n}", hint: "Summation" },
  { label: "∫", latex: "\\int_a^b", hint: "Integral" },
  { label: "a/b", latex: "\\frac{a}{b}", hint: "Fraction" },
  { label: "√x", latex: "\\sqrt{x}", hint: "Square root" },
  { label: "∂", latex: "\\partial", hint: "Partial derivative" },
  { label: "∇", latex: "\\nabla", hint: "Gradient" },
  { label: "∞", latex: "\\infty", hint: "Infinity" },
  { label: "≤", latex: "\\leq", hint: "Less or equal" },
  { label: "≥", latex: "\\geq", hint: "Greater or equal" },
  { label: "≠", latex: "\\neq", hint: "Not equal" },
  { label: "≈", latex: "\\approx", hint: "Approximately" },
  { label: "→", latex: "\\to", hint: "Maps to" },
  { label: "∀", latex: "\\forall", hint: "For all" },
  { label: "∃", latex: "\\exists", hint: "There exists" },
  { label: "⇒", latex: "\\implies", hint: "Implies" },
];

export type SlashCategory = "Block" | "Math" | "Formula";

export interface SlashItem {
  id: string;
  title: string;
  subtitle: string;
  category: SlashCategory;
  keywords: string[];
  command: (ctx: { editor: Editor; range: Range; openMermaid?: () => void }) => void;
}

const insertText = (editor: Editor, range: Range, text: string) => {
  editor.chain().focus().deleteRange(range).insertContent(text).run();
};

export const SLASH_ITEMS: SlashItem[] = [
  {
    id: "h1",
    title: "Heading 1",
    subtitle: "Large section title",
    category: "Block",
    keywords: ["h1", "heading", "title"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    id: "h2",
    title: "Heading 2",
    subtitle: "Sub-section heading",
    category: "Block",
    keywords: ["h2", "heading", "subtitle"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    id: "h3",
    title: "Heading 3",
    subtitle: "Compact topic heading",
    category: "Block",
    keywords: ["h3", "heading"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    id: "todo",
    title: "Task checklist",
    subtitle: "Interactive checkboxes",
    category: "Block",
    keywords: ["todo", "task", "check", "checklist"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: "bullet",
    title: "Bullet list",
    subtitle: "Unordered list",
    category: "Block",
    keywords: ["bullet", "list", "ul"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: "callout-note",
    title: "Callout (Note)",
    subtitle: "Highlighted study note box",
    category: "Block",
    keywords: ["callout", "note", "alert", "box"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent('<div class="callout callout-note" data-callout="note"><p>Key takeaway...</p></div><p></p>')
        .run();
    },
  },
  {
    id: "callout-tip",
    title: "Callout (Tip)",
    subtitle: "Highlighted pro-tip or formula box",
    category: "Block",
    keywords: ["tip", "callout", "hint", "box"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent('<div class="callout callout-tip" data-callout="tip"><p>Study tip...</p></div><p></p>')
        .run();
    },
  },
  {
    id: "quote",
    title: "Callout / Quote",
    subtitle: "Highlighted blockquote",
    category: "Block",
    keywords: ["quote", "callout", "note"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: "code",
    title: "Code block",
    subtitle: "Fenced code snippet",
    category: "Block",
    keywords: ["code", "snippet", "pre"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: "table",
    title: "Table (3×3)",
    subtitle: "Structured comparison table",
    category: "Block",
    keywords: ["table", "grid"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "comparison",
    title: "Comparison Table",
    subtitle: "Feature | Option A | Option B",
    category: "Block",
    keywords: ["comparison", "compare", "vs", "table", "matrix"],
    command: ({ editor, range }) =>
      insertText(
        editor,
        range,
        "\n| Feature / Criteria | Option A | Option B |\n| --- | --- | --- |\n| Core Strength | | |\n| Trade-off | | |\n| Best For | | |\n\n"
      ),
  },
  {
    id: "proscons",
    title: "Comparison Points",
    subtitle: "Structured Pros & Cons breakdown",
    category: "Block",
    keywords: ["comparison", "points", "pros", "cons", "versus"],
    command: ({ editor, range }) =>
      insertText(
        editor,
        range,
        "\n### Option A — Key Points\n- **Strength:** \n- **Limitation:** \n\n### Option B — Key Points\n- **Strength:** \n- **Limitation:** \n\n"
      ),
  },
  {
    id: "mermaid",
    title: "Mermaid diagram",
    subtitle: "Flowchart or sequence diagram",
    category: "Block",
    keywords: ["mermaid", "diagram", "chart", "flow"],
    command: ({ editor, range, openMermaid }) => {
      editor.chain().focus().deleteRange(range).run();
      openMermaid?.();
    },
  },
  {
    id: "bayes",
    title: "Bayes' Theorem",
    subtitle: "P(A|B) = P(B|A)P(A) / P(B)",
    category: "Formula",
    keywords: ["bayes", "probability", "formula", "ml"],
    command: ({ editor, range }) => insertText(editor, range, "$$P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$$ "),
  },
  {
    id: "mse",
    title: "Mean Squared Error",
    subtitle: "MSE regression loss",
    category: "Formula",
    keywords: ["mse", "loss", "regression", "ml", "formula"],
    command: ({ editor, range }) => insertText(editor, range, "$$\\text{MSE} = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2$$ "),
  },
  {
    id: "crossentropy",
    title: "Cross-Entropy Loss",
    subtitle: "Classification log loss",
    category: "Formula",
    keywords: ["cross", "entropy", "loss", "ml", "formula"],
    command: ({ editor, range }) => insertText(editor, range, "$$L = -\\sum y_i \\log(\\hat{y}_i)$$ "),
  },
  {
    id: "gradient",
    title: "Gradient Descent Update",
    subtitle: "θ := θ − α∇J(θ)",
    category: "Formula",
    keywords: ["gradient", "descent", "optimization", "ml", "formula"],
    command: ({ editor, range }) => insertText(editor, range, "$$\\theta := \\theta - \\alpha \\nabla_{\\theta} J(\\theta)$$ "),
  },
  {
    id: "cosine",
    title: "Cosine Similarity",
    subtitle: "Vector dot-product similarity",
    category: "Formula",
    keywords: ["cosine", "similarity", "vector", "nlp", "formula"],
    command: ({ editor, range }) => insertText(editor, range, "$$\\cos(\\theta) = \\frac{A \\cdot B}{\\|A\\|\\|B\\|}$$ "),
  },
  {
    id: "softmax",
    title: "Softmax Function",
    subtitle: "Normalized exponentials",
    category: "Formula",
    keywords: ["softmax", "activation", "ml", "formula"],
    command: ({ editor, range }) => insertText(editor, range, "$$\\sigma(z_i) = \\frac{e^{z_i}}{\\sum_j e^{z_j}}$$ "),
  },
  {
    id: "quadratic",
    title: "Quadratic Formula",
    subtitle: "x = (−b ± √(b² − 4ac)) / 2a",
    category: "Formula",
    keywords: ["quadratic", "algebra", "roots", "formula"],
    command: ({ editor, range }) => insertText(editor, range, "$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$ "),
  },
  {
    id: "euler",
    title: "Euler's Identity",
    subtitle: "e^(iπ) + 1 = 0",
    category: "Formula",
    keywords: ["euler", "complex", "math", "formula"],
    command: ({ editor, range }) => insertText(editor, range, "$$e^{i\\pi} + 1 = 0$$ "),
  },
  {
    id: "bigo",
    title: "Big-O Complexity",
    subtitle: "O(n log n) inline notation",
    category: "Math",
    keywords: ["bigo", "complexity", "dsa", "algorithm"],
    command: ({ editor, range }) => insertText(editor, range, "$O(n \\log n)$ "),
  },
  ...MATH_PALETTE.map((m) => ({
    id: `sym-${m.hint.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${m.label}  ${m.hint}`,
    subtitle: `$${m.latex}$`,
    category: "Math" as const,
    keywords: [m.hint.toLowerCase(), m.latex.replace("\\", "").toLowerCase(), "math", "symbol"],
    command: ({ editor, range }: { editor: Editor; range: Range }) => insertText(editor, range, `$${m.latex}$ `),
  })),
];

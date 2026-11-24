export interface MlLesson { id: string; title: string; md: string }
export interface MlQ { q: string; options: string[]; answer: number }
export interface MlTier { n: number; name: string; blurb: string; lessons: MlLesson[]; quiz: MlQ[]; formulas: string }
const py = (c: string) => "```python\n" + c + "\n```";
export const ML_TIERS: MlTier[] = [
  { n: 1, name: "Python and NumPy", blurb: "Vectors, broadcasting, vectorised thinking", lessons: [
    { id: "t1a", title: "Arrays and broadcasting", md: `NumPy arrays store typed values in contiguous memory, so operations run in C.\n\n${py("import numpy as np\na = np.arange(6).reshape(2, 3)\nprint(a * 10 + np.array([1, 2, 3]))")}\n\nBroadcasting stretches a smaller shape across a larger one without copying.` },
    { id: "t1b", title: "Vectorise, do not loop", md: `A Python loop over a million items is slow. A vector op is fast.\n\n${py("import numpy as np\nx = np.random.rand(1_000_000)\nprint(float((x ** 2).mean()))")}` } ],
    quiz: [{ q: "Why is NumPy fast?", options: ["It uses GPUs", "Contiguous typed arrays and C loops", "It skips checks", "It caches results"], answer: 1 }, { q: "Shape (2,3) + shape (3,) works through?", options: ["Casting", "Broadcasting", "Slicing", "Reshaping"], answer: 1 }, { q: "np.arange(6).reshape(2,3) has how many rows?", options: ["1", "2", "3", "6"], answer: 1 }],
    formulas: "Mean: $\\mu = \\frac{1}{n}\\sum_{i=1}^n x_i$\n\nVariance: $\\sigma^2 = \\frac{1}{n}\\sum (x_i-\\mu)^2$" },
  { n: 2, name: "Data wrangling", blurb: "pandas, cleaning, joins", lessons: [
    { id: "t2a", title: "DataFrames in five lines", md: `A DataFrame is a labelled table.\n\n${py("import pandas as pd\ndf = pd.DataFrame({'name': ['A','B','C'], 'score': [82, 91, 77]})\nprint(df.describe())\nprint(df[df.score > 80])")}` },
    { id: "t2b", title: "Missing data", md: `Decide: drop, fill or model. Always look before you fill.\n\n${py("import pandas as pd, numpy as np\ns = pd.Series([1, np.nan, 3])\nprint(s.fillna(s.mean()))")}` } ],
    quiz: [{ q: "df.describe() returns?", options: ["Types", "Summary statistics", "Plots", "Missing rows"], answer: 1 }, { q: "Best first step with NaNs?", options: ["Fill with 0", "Inspect why they exist", "Delete the column", "Ignore"], answer: 1 }, { q: "A boolean mask filters?", options: ["Columns only", "Rows", "Dtypes", "Index names"], answer: 1 }],
    formulas: "Z-score: $z = \\frac{x-\\mu}{\\sigma}$\n\nMin-max: $x' = \\frac{x-x_{min}}{x_{max}-x_{min}}$" },
  { n: 3, name: "Math for ML", blurb: "Linear algebra, calculus, probability", lessons: [
    { id: "t3a", title: "Dot products and projections", md: `The dot product measures alignment: $a\\cdot b = \\|a\\|\\|b\\|\\cos\\theta$.\n\n${py("import numpy as np\na, b = np.array([1, 2, 3]), np.array([4, 5, 6])\nprint(a @ b, np.linalg.norm(a))")}` },
    { id: "t3b", title: "Gradients", md: `The gradient points uphill. Gradient descent steps the opposite way: $\\theta \\leftarrow \\theta - \\eta \\nabla L(\\theta)$.\n\n${py("x = 5.0\nfor _ in range(50):\n    x -= 0.1 * 2 * x   # minimise x^2\nprint(round(x, 6))")}` } ],
    quiz: [{ q: "Gradient descent moves?", options: ["Along the gradient", "Against the gradient", "Randomly", "Perpendicular"], answer: 1 }, { q: "a·b is largest when the angle is?", options: ["0", "90", "180", "45"], answer: 0 }, { q: "Bayes: P(A|B) is proportional to?", options: ["P(B|A)P(A)", "P(A)+P(B)", "P(B)/P(A)", "1-P(A)"], answer: 0 }],
    formulas: "Bayes: $P(A|B)=\\frac{P(B|A)P(A)}{P(B)}$\n\nChain rule: $\\frac{dz}{dx}=\\frac{dz}{dy}\\frac{dy}{dx}$\n\nNormal: $f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$" },
  { n: 4, name: "Supervised learning", blurb: "Regression and classification", lessons: [
    { id: "t4a", title: "Linear regression by hand", md: `Fit $y = wx + b$ by minimising squared error.\n\n${py("import numpy as np\nx = np.array([1., 2., 3., 4.]); y = np.array([2.1, 3.9, 6.2, 7.8])\nw, b = np.polyfit(x, y, 1)\nprint(round(w, 3), round(b, 3))")}` },
    { id: "t4b", title: "Logistic regression", md: `Squash a linear score into a probability: $\\sigma(z)=\\frac{1}{1+e^{-z}}$.\n\n${py("import numpy as np\nz = np.array([-2, 0, 2])\nprint(1 / (1 + np.exp(-z)))")}` } ],
    quiz: [{ q: "Sigmoid outputs lie in?", options: ["(-1,1)", "(0,1)", "(0,inf)", "Any real"], answer: 1 }, { q: "Least squares minimises?", options: ["Sum of absolute errors", "Sum of squared errors", "Max error", "Bias only"], answer: 1 }, { q: "Classification predicts?", options: ["Categories", "Only numbers", "Clusters", "Weights"], answer: 0 }],
    formulas: "MSE: $\\frac1n\\sum (y_i-\\hat y_i)^2$\n\nCross-entropy: $-\\sum y\\log\\hat y$" },
  { n: 5, name: "Evaluation and features", blurb: "Metrics, splits, overfitting", lessons: [
    { id: "t5a", title: "Precision and recall", md: `Precision: of predicted positives, how many were right. Recall: of true positives, how many did we catch.\n\n${py("tp, fp, fn = 40, 10, 20\nprint('precision', tp/(tp+fp), 'recall', tp/(tp+fn))")}` },
    { id: "t5b", title: "Overfitting", md: `A model that memorises training data fails on new data. Use a validation set, regularise, and prefer simpler models.` } ],
    quiz: [{ q: "High variance usually means?", options: ["Underfitting", "Overfitting", "Perfect fit", "Bad data types"], answer: 1 }, { q: "Recall = ?", options: ["TP/(TP+FP)", "TP/(TP+FN)", "TN/(TN+FP)", "FP/(FP+TN)"], answer: 1 }, { q: "Test data should be used?", options: ["For tuning", "Once, at the end", "Every epoch", "Never"], answer: 1 }],
    formulas: "F1: $\\frac{2PR}{P+R}$\n\nL2: $\\lambda\\sum w_i^2$" },
  { n: 6, name: "Neural networks", blurb: "Layers, backprop, activations", lessons: [
    { id: "t6a", title: "A neuron", md: `A neuron computes $a=\\phi(w\\cdot x+b)$.\n\n${py("import numpy as np\nx = np.array([0.5, -1.0]); w = np.array([0.8, 0.2]); b = 0.1\nprint(max(0, w @ x + b))  # ReLU")}` },
    { id: "t6b", title: "Backpropagation", md: `Backprop applies the chain rule layer by layer to get $\\partial L/\\partial w$ for every weight, reusing intermediate results.` } ],
    quiz: [{ q: "ReLU(x) equals?", options: ["max(0,x)", "1/(1+e^-x)", "tanh(x)", "x^2"], answer: 0 }, { q: "Backprop relies on?", options: ["Chain rule", "Random search", "Clustering", "Bayes rule"], answer: 0 }, { q: "Vanishing gradients are common with?", options: ["ReLU", "Deep sigmoid stacks", "Dropout", "Batch norm"], answer: 1 }],
    formulas: "Softmax: $\\frac{e^{z_i}}{\\sum_j e^{z_j}}$\n\nSGD: $w\\leftarrow w-\\eta\\nabla L$" },
  { n: 7, name: "Modern ML", blurb: "Transformers, embeddings, MLOps", lessons: [
    { id: "t7a", title: "Attention", md: `Attention mixes values by how well queries match keys: $\\mathrm{softmax}(QK^T/\\sqrt{d})V$.\n\n${py("import numpy as np\nQ = np.random.rand(3, 4); K = np.random.rand(3, 4); V = np.random.rand(3, 4)\ns = Q @ K.T / np.sqrt(4)\nw = np.exp(s) / np.exp(s).sum(1, keepdims=True)\nprint((w @ V).shape)")}` },
    { id: "t7b", title: "Shipping models", md: `Version data and models, monitor drift, keep a rollback path, and measure the business metric, not just accuracy.` } ],
    quiz: [{ q: "Attention scales scores by?", options: ["1/d", "1/sqrt(d)", "d", "log d"], answer: 1 }, { q: "Data drift means?", options: ["Inputs change over time", "Weights overflow", "Labels are clean", "GPU heats up"], answer: 0 }, { q: "Embeddings map items to?", options: ["Dense vectors", "Files", "Graphs only", "Hashes"], answer: 0 }],
    formulas: "Attention: $\\mathrm{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$\n\nCosine: $\\frac{a\\cdot b}{\\|a\\|\\|b\\|}$" },
];

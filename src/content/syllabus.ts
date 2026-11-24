import type { Subject } from "@/core/types";
import { uid } from "@/lib/utils";

type Spec = Record<string, { w: number; units: Record<string, string[]> }>;
const GATE: Spec = {
  "Engineering Mathematics": { w: 13, units: { "Linear Algebra": ["Matrices", "Eigenvalues", "Systems of equations"], "Calculus": ["Limits", "Integration", "Maxima and minima"], "Probability": ["Random variables", "Distributions", "Bayes theorem"] } },
  "Discrete Mathematics": { w: 8, units: { "Logic": ["Propositional logic", "Predicate logic"], "Combinatorics": ["Counting", "Recurrence relations"], "Graph Theory": ["Connectivity", "Coloring", "Matching"] } },
  "Digital Logic": { w: 6, units: { "Combinational": ["Boolean algebra", "K-maps", "Adders and MUX"], "Sequential": ["Flip-flops", "Counters", "State machines"] } },
  "Computer Organization": { w: 8, units: { "Architecture": ["Instruction formats", "Addressing modes", "Pipelining"], "Memory": ["Cache", "Virtual memory", "I/O interface"] } },
  "Programming and Data Structures": { w: 10, units: { "C Programming": ["Pointers", "Recursion", "Storage classes"], "Data Structures": ["Stacks and queues", "Trees", "Heaps", "Hashing"] } },
  "Algorithms": { w: 9, units: { "Analysis": ["Asymptotics", "Recurrences"], "Paradigms": ["Greedy", "Dynamic programming", "Divide and conquer"], "Graph algorithms": ["BFS and DFS", "Shortest paths", "MST"] } },
  "Theory of Computation": { w: 7, units: { "Automata": ["Regular languages", "Context-free languages", "Turing machines", "Decidability"] } },
  "Compiler Design": { w: 6, units: { "Phases": ["Lexical analysis", "Parsing", "Syntax-directed translation", "Code optimisation"] } },
  "Operating Systems": { w: 9, units: { "Processes": ["Scheduling", "Synchronization", "Deadlocks"], "Memory": ["Paging", "Page replacement", "File systems"] } },
  "Databases": { w: 9, units: { "Design": ["ER model", "Normalization"], "Query": ["Relational algebra", "SQL"], "Transactions": ["Concurrency control", "Indexing"] } },
  "Computer Networks": { w: 9, units: { "Layers": ["Data link", "Network layer", "Transport layer", "Application layer"] } },
  "General Aptitude": { w: 15, units: { "Verbal": ["Grammar", "Comprehension"], "Quantitative": ["Number series", "Data interpretation", "Probability puzzles"] } },
};
const SEM: Spec = {
  "Subject 1": { w: 20, units: { "Unit 1": ["Topic 1", "Topic 2"], "Unit 2": ["Topic 3", "Topic 4"] } },
  "Subject 2": { w: 20, units: { "Unit 1": ["Topic 1", "Topic 2"], "Unit 2": ["Topic 3", "Topic 4"] } },
  "Subject 3": { w: 20, units: { "Unit 1": ["Topic 1", "Topic 2"], "Unit 2": ["Topic 3", "Topic 4"] } },
};
function build(spec: Spec): Subject[] {
  return Object.entries(spec).map(([name, s]) => ({
    id: uid(), name, weight: s.w,
    units: Object.entries(s.units).map(([un, topics]) => ({ id: uid(), name: un, topics: topics.map((t) => ({ id: uid(), name: t, weight: 1, confidence: 3, revisions: 0, status: "pending" as const })) })),
  }));
}
export const PRESETS: { id: string; label: string; hours: number; build: () => Subject[] }[] = [
  { id: "gate", label: "GATE CSE", hours: 30, build: () => build(GATE) },
  { id: "sem", label: "Semester template", hours: 20, build: () => build(SEM) },
];

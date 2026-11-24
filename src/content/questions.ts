export interface Question { q: string; options: string[]; answer: number; topic: string }
export const QUESTIONS: Question[] = [
  { q: "Time complexity of binary search on a sorted array of n items?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], answer: 1, topic: "Algorithms" },
  { q: "Which data structure uses FIFO ordering?", options: ["Stack", "Queue", "Heap", "Tree"], answer: 1, topic: "Data Structures" },
  { q: "Which scheduling algorithm can cause starvation?", options: ["Round robin", "FCFS", "Priority scheduling", "None of these"], answer: 2, topic: "Operating Systems" },
  { q: "Normal form that removes transitive dependencies?", options: ["1NF", "2NF", "3NF", "BCNF only"], answer: 2, topic: "Databases" },
  { q: "Which layer of the OSI model handles routing?", options: ["Data link", "Network", "Transport", "Session"], answer: 1, topic: "Networks" },
  { q: "Worst-case time of quicksort?", options: ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"], answer: 2, topic: "Algorithms" },
  { q: "A deadlock needs which condition?", options: ["Preemption", "Circular wait", "Spooling", "Paging"], answer: 1, topic: "Operating Systems" },
  { q: "Number of edges in a tree with n nodes?", options: ["n", "n+1", "n-1", "2n"], answer: 2, topic: "Graph Theory" },
  { q: "Which traversal of a BST yields sorted order?", options: ["Preorder", "Inorder", "Postorder", "Level order"], answer: 1, topic: "Data Structures" },
  { q: "What does ACID's 'I' stand for?", options: ["Integrity", "Isolation", "Indexing", "Inheritance"], answer: 1, topic: "Databases" },
  { q: "Which is NOT a stable sort?", options: ["Merge sort", "Insertion sort", "Heap sort", "Bubble sort"], answer: 2, topic: "Algorithms" },
  { q: "TCP is a ... protocol.", options: ["Connectionless", "Connection-oriented", "Broadcast only", "Physical"], answer: 1, topic: "Networks" },
  { q: "Space complexity of BFS on a graph with V vertices?", options: ["O(1)", "O(V)", "O(V^2)", "O(log V)"], answer: 1, topic: "Algorithms" },
  { q: "The binary of decimal 10 is?", options: ["1001", "1010", "1100", "1110"], answer: 1, topic: "Digital Logic" },
  { q: "A language accepted by a DFA is?", options: ["Regular", "Context-free only", "Recursive only", "Undecidable"], answer: 0, topic: "TOC" },
  { q: "Which page replacement shows Belady's anomaly?", options: ["LRU", "Optimal", "FIFO", "None"], answer: 2, topic: "Operating Systems" },
];

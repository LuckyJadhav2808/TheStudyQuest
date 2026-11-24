export type Diff = "easy" | "medium" | "hard";
export interface SheetProblem { key: string; title: string; topic: string; difficulty: Diff; url: string; sheet: string }
// Compact format: "Title|E;Title|M" per topic. Datasets are curated subsets of each public sheet.
const D: Record<string, Diff> = { E: "easy", M: "medium", H: "hard" };
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function parse(sheet: string, data: Record<string, string>): SheetProblem[] {
  return Object.entries(data).flatMap(([topic, s]) => s.split(";").map((p) => { const [title, d] = p.split("|"); return { key: `${sheet}:${slug(title)}`, title, topic, difficulty: D[d], url: `https://leetcode.com/problems/${slug(title)}/`, sheet }; }));
}
const BLIND: Record<string, string> = {
  Arrays: "Two Sum|E;Best Time to Buy and Sell Stock|E;Contains Duplicate|E;Product of Array Except Self|M;Maximum Subarray|M;Maximum Product Subarray|M;Find Minimum in Rotated Sorted Array|M;Search in Rotated Sorted Array|M;3Sum|M;Container With Most Water|M",
  Binary: "Sum of Two Integers|M;Number of 1 Bits|E;Counting Bits|E;Missing Number|E;Reverse Bits|E",
  "Dynamic Programming": "Climbing Stairs|E;Coin Change|M;Longest Increasing Subsequence|M;Longest Common Subsequence|M;Word Break|M;Combination Sum IV|M;House Robber|M;House Robber II|M;Decode Ways|M;Unique Paths|M;Jump Game|M",
  Graphs: "Clone Graph|M;Course Schedule|M;Pacific Atlantic Water Flow|M;Number of Islands|M;Longest Consecutive Sequence|M;Alien Dictionary|H;Graph Valid Tree|M;Number of Connected Components in an Undirected Graph|M",
  Intervals: "Insert Interval|M;Merge Intervals|M;Non-overlapping Intervals|M;Meeting Rooms|E;Meeting Rooms II|M",
  "Linked List": "Reverse Linked List|E;Linked List Cycle|E;Merge Two Sorted Lists|E;Merge k Sorted Lists|H;Remove Nth Node From End of List|M;Reorder List|M",
  Matrix: "Set Matrix Zeroes|M;Spiral Matrix|M;Rotate Image|M;Word Search|M",
  Strings: "Longest Substring Without Repeating Characters|M;Longest Repeating Character Replacement|M;Minimum Window Substring|H;Valid Anagram|E;Group Anagrams|M;Valid Parentheses|E;Valid Palindrome|E;Longest Palindromic Substring|M;Palindromic Substrings|M;Encode and Decode Strings|M",
  Trees: "Maximum Depth of Binary Tree|E;Same Tree|E;Invert Binary Tree|E;Binary Tree Maximum Path Sum|H;Binary Tree Level Order Traversal|M;Serialize and Deserialize Binary Tree|H;Subtree of Another Tree|E;Construct Binary Tree from Preorder and Inorder Traversal|M;Validate Binary Search Tree|M;Kth Smallest Element in a BST|M;Lowest Common Ancestor of a Binary Search Tree|M;Implement Trie Prefix Tree|M;Design Add and Search Words Data Structure|M;Word Search II|H",
  Heap: "Top K Frequent Elements|M;Find Median from Data Stream|H",
};
const NEET_EXTRA: Record<string, string> = {
  Arrays: "Valid Sudoku|M;Two Sum II Input Array Is Sorted|M;Trapping Rain Water|H;Longest Consecutive Sequence|M;Sort Colors|M;Majority Element|E;Rotate Array|M;Single Number|E;Plus One|E",
  Stack: "Min Stack|M;Evaluate Reverse Polish Notation|M;Generate Parentheses|M;Daily Temperatures|M;Car Fleet|M;Largest Rectangle in Histogram|H",
  "Binary Search": "Binary Search|E;Search a 2D Matrix|M;Koko Eating Bananas|M;Time Based Key-Value Store|M;Median of Two Sorted Arrays|H",
  "Sliding Window": "Permutation in String|M;Sliding Window Maximum|H",
  "Linked List": "LRU Cache|M;Add Two Numbers|M;Find the Duplicate Number|M;Copy List with Random Pointer|M",
  Backtracking: "Subsets|M;Combination Sum|M;Permutations|M;Subsets II|M;Palindrome Partitioning|M;Letter Combinations of a Phone Number|M;N-Queens|H",
  Heap: "Kth Largest Element in an Array|M;Task Scheduler|M;Design Twitter|M;Last Stone Weight|E;K Closest Points to Origin|M",
  Graphs: "Rotting Oranges|M;Walls and Gates|M;Surrounded Regions|M;Redundant Connection|M;Word Ladder|H;Network Delay Time|M;Cheapest Flights Within K Stops|M;Min Cost to Connect All Points|M;Reconstruct Itinerary|H;Swim in Rising Water|H",
  "Dynamic Programming": "Min Cost Climbing Stairs|E;Partition Equal Subset Sum|M;Edit Distance|H;Burst Balloons|H;Regular Expression Matching|H;Target Sum|M;Interleaving String|M;Distinct Subsequences|H",
  Greedy: "Gas Station|M;Hand of Straights|M;Merge Triplets to Form Target Triplet|M;Partition Labels|M;Valid Parenthesis String|M",
  Math: "Happy Number|E;Pow x n|M;Multiply Strings|M;Reverse Integer|M",
};
const STRIVER: Record<string, string> = {
  Arrays: "Set Matrix Zeroes|M;Pascal's Triangle|E;Next Permutation|M;Maximum Subarray|M;Sort Colors|M;Best Time to Buy and Sell Stock|E;Rotate Image|M;Merge Intervals|M;Merge Sorted Array|E;Find the Duplicate Number|M;Reverse Pairs|H;Search a 2D Matrix|M;Pow x n|M;Majority Element|E;Majority Element II|M;Unique Paths|M;Two Sum|E;4Sum|M;Longest Consecutive Sequence|M;Trapping Rain Water|H;3Sum|M",
  "Linked List": "Reverse Linked List|E;Middle of the Linked List|E;Merge Two Sorted Lists|E;Remove Nth Node From End of List|M;Add Two Numbers|M;Delete Node in a Linked List|M;Intersection of Two Linked Lists|E;Linked List Cycle|E;Reverse Nodes in k-Group|H;Palindrome Linked List|E;Linked List Cycle II|M;Flatten a Linked List|M;Copy List with Random Pointer|M",
  Recursion: "Subsets II|M;Combination Sum|M;Combination Sum II|M;Palindrome Partitioning|M;Permutation Sequence|H;N-Queens|H;Sudoku Solver|H;Word Break|M",
  Greedy: "Assign Cookies|E;Jump Game|M;Jump Game II|M;Non-overlapping Intervals|M;Insert Interval|M",
  Trees: "Binary Tree Inorder Traversal|E;Maximum Depth of Binary Tree|E;Diameter of Binary Tree|E;Balanced Binary Tree|E;Symmetric Tree|E;Binary Tree Zigzag Level Order Traversal|M;Lowest Common Ancestor of a Binary Tree|M;Validate Binary Search Tree|M;Binary Tree Maximum Path Sum|H",
  Graphs: "Number of Islands|M;Rotting Oranges|M;Course Schedule|M;Course Schedule II|M;Word Ladder|H;Number of Provinces|M;Is Graph Bipartite|M",
  "Dynamic Programming": "Climbing Stairs|E;House Robber|M;Coin Change|M;Longest Common Subsequence|M;Edit Distance|H;Longest Increasing Subsequence|M;Partition Equal Subset Sum|M",
};
const BABBAR: Record<string, string> = {
  Arrays: "Kth Smallest Element in a Sorted Matrix|M;Sort Colors|M;Move Zeroes|E;Rotate Array|M;Maximum Subarray|M;Jump Game II|M;Find the Duplicate Number|M;Merge Sorted Array|E;Next Permutation|M;Best Time to Buy and Sell Stock|E;Two Sum|E;Rearrange Array Elements by Sign|M;Subarray Sum Equals K|M",
  Strings: "Reverse String|E;Valid Palindrome|E;Valid Anagram|E;Longest Common Prefix|E;Find the Index of the First Occurrence in a String|E;Reverse Words in a String|M;Roman to Integer|E;Longest Palindromic Substring|M;Group Anagrams|M;Count and Say|M",
  "Linked List": "Reverse Linked List|E;Linked List Cycle|E;Middle of the Linked List|E;Merge Two Sorted Lists|E;Remove Nth Node From End of List|M;Palindrome Linked List|E;Sort List|M",
  "Stacks and Queues": "Valid Parentheses|E;Min Stack|M;Implement Queue using Stacks|E;Next Greater Element I|E;Largest Rectangle in Histogram|H;Sliding Window Maximum|H",
  Trees: "Maximum Depth of Binary Tree|E;Invert Binary Tree|E;Symmetric Tree|E;Binary Tree Level Order Traversal|M;Lowest Common Ancestor of a Binary Tree|M;Validate Binary Search Tree|M;Kth Smallest Element in a BST|M",
  "Dynamic Programming": "Climbing Stairs|E;House Robber|M;Coin Change|M;Longest Increasing Subsequence|M;Unique Paths|M;Word Break|M;Edit Distance|H",
};
export const SHEETS: { id: string; label: string; blurb: string; problems: SheetProblem[] }[] = (() => {
  const neet = parse("neetcode", { ...Object.fromEntries(Object.entries(BLIND).map(([k, v]) => [k, v + (NEET_EXTRA[k] ? ";" + NEET_EXTRA[k] : "")])), ...Object.fromEntries(Object.entries(NEET_EXTRA).filter(([k]) => !(k in BLIND))) });
  return [
    { id: "blind75", label: "Blind 75", blurb: "The classic 75", problems: parse("blind75", BLIND) },
    { id: "neetcode", label: "NeetCode 150", blurb: "Curated extension", problems: neet },
    { id: "striver", label: "Striver SDE", blurb: "Curated subset", problems: parse("striver", STRIVER) },
    { id: "babbar", label: "Love Babbar", blurb: "Curated subset", problems: parse("babbar", BABBAR) },
  ];
})();
export const TOPIC_ORDER = ["Arrays", "Strings", "Binary", "Math", "Stack", "Binary Search", "Sliding Window", "Linked List", "Stacks and Queues", "Recursion", "Backtracking", "Trees", "Heap", "Greedy", "Intervals", "Matrix", "Graphs", "Dynamic Programming"];

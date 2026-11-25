"use client";
import type { Icon } from "@phosphor-icons/react";
import { BookOpen, BookmarkSimple, BracketsCurly, Brain, CalendarBlank, CalendarCheck, ChartBar, ChartLineUp, ChatCircleDots, CheckCircle, Code, Exam, Flask, GameController, GearSix, GraduationCap, House, Joystick, ListChecks, NotePencil, Notebook, PawPrint, PencilLine, Sparkle, Storefront, Target, TerminalWindow, Timer, Toolbox, TreeStructure, UsersThree } from "@phosphor-icons/react";
import type { FlagName } from "@/core/flags";

export interface NavItem { href: string; label: string; desc: string; icon: Icon; flag?: FlagName }
export interface NavGroup { id: string; label: string; icon: Icon; href?: string; items: NavItem[]; color: string }

export const GROUPS: NavGroup[] = [
  { id: "home", label: "Home", icon: House, href: "/", items: [], color: "var(--domain-focus-fill)" },
  { id: "focus", label: "Focus", icon: Timer, href: "/timer", items: [], color: "var(--domain-focus-fill)" },
  { id: "notes", label: "Notes", icon: NotePencil, href: "/notes", items: [], color: "var(--domain-notes-fill)" },
  { id: "learn", label: "Learn", icon: GraduationCap, color: "var(--domain-notes-fill)", items: [
    { href: "/dsa", label: "DSA Sheets", desc: "Blind 75, NeetCode, Striver, Babbar", icon: TreeStructure, flag: "dsa" },
    { href: "/ml", label: "ML Path", desc: "Seven-tier curriculum with runnable code", icon: Brain, flag: "ml" },
    { href: "/notebook", label: "Notebook", desc: "Jupyter-style cells with Python", icon: Notebook, flag: "notebook" },
    { href: "/code", label: "Code Arena", desc: "Multi-tab editor and live preview", icon: Code, flag: "code" },
    { href: "/ide", label: "IDE", desc: "Multi-file project workspace", icon: TerminalWindow, flag: "ide" },
  ] },
  { id: "plan", label: "Plan", icon: CalendarCheck, color: "var(--domain-quests-fill)", items: [
    { href: "/tasks", label: "Quests", desc: "Kanban board for tasks", icon: ListChecks },
    { href: "/habits", label: "Habits", desc: "Streaks and heatmaps", icon: CheckCircle },
    { href: "/tracker", label: "Tracker", desc: "Syllabus, slots and test logs", icon: Target, flag: "tracker" },
    { href: "/timetable", label: "Timetable", desc: "Weekly class grid with .ics export", icon: CalendarBlank },
    { href: "/exams", label: "Exams", desc: "Countdown radar and mock tests", icon: Exam },
  ] },
  { id: "play", label: "Play", icon: GameController, color: "var(--domain-play-fill)", items: [
    { href: "/pets", label: "Pets", desc: "Hatch and evolve companions", icon: PawPrint, flag: "pets" },
    { href: "/shop", label: "Shop", desc: "Gear, food and gacha chests", icon: Storefront, flag: "shop" },
    { href: "/alchemy", label: "Alchemy", desc: "Brew buffs from ingredients", icon: Flask, flag: "alchemy" },
    { href: "/skills", label: "Skills", desc: "Focus, Combat and Beast trees", icon: Sparkle, flag: "skills" },
    { href: "/arcade", label: "Arcade", desc: "Trivia Dungeon and Pet Catch", icon: Joystick, flag: "arcade" },
  ] },
  { id: "tools", label: "Tools", icon: Toolbox, color: "var(--domain-tools-fill)", items: [
    { href: "/reader", label: "Reader", desc: "PDF, DOCX, sheets and doc studio", icon: BookOpen },
    { href: "/whiteboard", label: "Whiteboard", desc: "Excalidraw boards", icon: PencilLine, flag: "whiteboard" },
    { href: "/chat", label: "AI Chat", desc: "Five tutoring personas", icon: ChatCircleDots },
    { href: "/resources", label: "Resources", desc: "Bookmark vault", icon: BookmarkSimple },
    { href: "/snippets", label: "Snippets", desc: "Reusable code cards", icon: BracketsCurly },
  ] },
  { id: "insights", label: "Insights", icon: ChartLineUp, color: "var(--domain-stats-fill)", items: [
    { href: "/analytics", label: "Analytics", desc: "Heatmap, focus split, reports", icon: ChartBar },
    { href: "/groups", label: "Guilds", desc: "Study groups and shared quests", icon: UsersThree, flag: "groups" },
  ] },
  { id: "settings", label: "Settings", icon: GearSix, href: "/settings", items: [], color: "var(--domain-notes-fill)" },
];
export const ALL_PAGES: (NavItem & { group: string })[] = [
  { href: "/", label: "Home", desc: "Dashboard", icon: House, group: "home" },
  { href: "/timer", label: "Focus Timer", desc: "Pomodoro, binaural beats, ambient mixer", icon: Timer, group: "focus" },
  { href: "/notes", label: "Notes", desc: "Rich editor and markdown", icon: NotePencil, group: "notes" },
  ...GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.id }))),
  { href: "/settings", label: "Settings", desc: "Profile, theme, data", icon: GearSix, group: "settings" },
];
export function groupForPath(path: string): string {
  if (path === "/") return "home";
  const hit = ALL_PAGES.filter((p) => p.href !== "/").find((p) => path === p.href || path.startsWith(p.href + "/"));
  return hit?.group ?? "home";
}

"use client";
import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

let initialized = false;

function record(metric: Metric) {
  try {
    const raw = sessionStorage.getItem("sq-vitals");
    const cur = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    cur[metric.name] = Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value);
    sessionStorage.setItem("sq-vitals", JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

export function initWebVitals() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  onCLS(record);
  onINP(record);
  onLCP(record);
}

"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CodeCharacteristics } from "../types";

interface CodeCharacteristicsRadarProps {
  characteristics: CodeCharacteristics;
  className?: string;
}

// Core metric keys (excluding confidence metrics)
type CoreMetricKey =
  | "avg_lines_per_function"
  | "functional_vs_oop_ratio"
  | "recursion_vs_loop_ratio"
  | "dependency_coupling_index"
  | "modularity_index_score"
  | "avg_nesting_depth"
  | "abstraction_layer_count"
  | "immutability_score"
  | "error_handling_centralization_score"
  | "test_structure_modularity_ratio";

const CORE_METRIC_KEYS: CoreMetricKey[] = [
  "avg_lines_per_function",
  "functional_vs_oop_ratio",
  "recursion_vs_loop_ratio",
  "dependency_coupling_index",
  "modularity_index_score",
  "avg_nesting_depth",
  "abstraction_layer_count",
  "immutability_score",
  "error_handling_centralization_score",
  "test_structure_modularity_ratio",
];

const CHARACTERISTIC_LABELS: Record<CoreMetricKey, string> = {
  avg_lines_per_function: "Function Size",
  functional_vs_oop_ratio: "Functional vs OOP",
  recursion_vs_loop_ratio: "Recursion vs Loops",
  dependency_coupling_index: "Loose Coupling",
  modularity_index_score: "Modularity",
  avg_nesting_depth: "Shallow Nesting",
  abstraction_layer_count: "Abstraction",
  immutability_score: "Immutability",
  error_handling_centralization_score: "Error Handling",
  test_structure_modularity_ratio: "Test Structure",
};

const CHARACTERISTIC_DESCRIPTIONS: Record<CoreMetricKey, string> = {
  avg_lines_per_function: "Average lines per function (inverted: lower is better)",
  functional_vs_oop_ratio: "Balance between functional and OOP paradigms",
  recursion_vs_loop_ratio: "Preference for recursion over loops",
  dependency_coupling_index: "How loosely coupled the code is",
  modularity_index_score: "Code modularity and separation of concerns",
  avg_nesting_depth: "Shallow nesting depth (inverted: lower is better)",
  abstraction_layer_count: "Number of abstraction layers",
  immutability_score: "Preference for immutable data structures",
  error_handling_centralization_score: "Centralized error handling patterns",
  test_structure_modularity_ratio: "Test code organization and structure",
};

// Normalize values to 0-100 scale for display
function normalizeValue(key: CoreMetricKey, value: number): number {
  // Some metrics need to be inverted (e.g., lower lines per function is better)
  switch (key) {
    case "avg_lines_per_function":
      // Invert and cap: 5 lines = 100, 50+ lines = 0
      return Math.max(0, Math.min(100, 100 - ((value - 5) / 45) * 100));
    case "avg_nesting_depth":
      // Invert: 1 depth = 100, 5+ depth = 0
      return Math.max(0, Math.min(100, 100 - ((value - 1) / 4) * 100));
    case "abstraction_layer_count":
      // Normalize: 0 = 0, 5 = 100
      return Math.max(0, Math.min(100, (value / 5) * 100));
    default:
      // Most metrics are already 0-1, convert to 0-100
      return Math.max(0, Math.min(100, value * 100));
  }
}

export function CodeCharacteristicsRadar({
  characteristics,
  className = "",
}: CodeCharacteristicsRadarProps) {
  // Only map core metrics (exclude confidence fields)
  const data = CORE_METRIC_KEYS.map((key) => ({
    characteristic: CHARACTERISTIC_LABELS[key],
    value: normalizeValue(key, characteristics[key]),
    rawValue: characteristics[key],
    description: CHARACTERISTIC_DESCRIPTIONS[key],
  }));

  return (
    <div className={`${className}`}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="characteristic"
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 9 }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name="Code Style"
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                    <p className="font-medium text-slate-900">{item.characteristic}</p>
                    <p className="text-sm text-slate-500">{item.description}</p>
                    <p className="mt-1 text-sm">
                      <span className="font-medium text-indigo-600">
                        Score: {Math.round(item.value)}
                      </span>
                      <span className="text-slate-400 ml-2">
                        (raw: {typeof item.rawValue === "number" ? item.rawValue.toFixed(2) : item.rawValue})
                      </span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Compact version for inline display
export function CodeCharacteristicsCompact({
  characteristics,
}: {
  characteristics: CodeCharacteristics;
}) {
  const topMetrics = [
    { key: "modularity_index_score" as const, label: "Modularity" },
    { key: "immutability_score" as const, label: "Immutability" },
    { key: "error_handling_centralization_score" as const, label: "Error Handling" },
  ];

  return (
    <div className="flex gap-3">
      {topMetrics.map(({ key, label }) => {
        const value = normalizeValue(key, characteristics[key]);
        return (
          <div key={key} className="text-center">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-sm font-semibold text-indigo-600">{Math.round(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

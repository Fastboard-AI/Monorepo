"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ScoreBreakdown as ScoreBreakdownType } from "../types";
import { Target, Briefcase, Users, Sparkles } from "lucide-react";

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
  showChart?: boolean;
}

export function ScoreBreakdown({ breakdown, showChart = true }: ScoreBreakdownProps) {
  const chartData = [
    { category: "Skills", value: breakdown.skillsMatch, fullMark: 100 },
    { category: "Experience", value: breakdown.experienceMatch, fullMark: 100 },
    { category: "Work Style", value: breakdown.workStyleAlignment, fullMark: 100 },
    { category: "Team Fit", value: breakdown.teamFit, fullMark: 100 },
  ];

  const metrics = [
    {
      label: "Skills Match",
      value: breakdown.skillsMatch,
      icon: Target,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Experience",
      value: breakdown.experienceMatch,
      icon: Briefcase,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
    {
      label: "Work Style",
      value: breakdown.workStyleAlignment,
      icon: Sparkles,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Team Fit",
      value: breakdown.teamFit,
      icon: Users,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-4">
      {showChart && (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: "#64748B", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "#94A3B8", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px -2px rgba(79, 70, 229, 0.1)",
                }}
                formatter={(value: number) => [`${value}%`, "Score"]}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#4F46E5"
                fill="url(#radarGradient)"
                fillOpacity={0.5}
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <span className="text-xs font-medium text-slate-600">
                {metric.label}
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900">
                  {metric.value}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

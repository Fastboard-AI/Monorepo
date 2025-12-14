"use client";

import { Bot, Shield, Sparkles, Info } from "lucide-react";

interface AIAnalysisCardProps {
  aiDetectionScore?: number;
  aiProficiencyScore?: number;
  codeAuthenticityScore?: number;
  aiAnalysisDetails?: {
    patterns_detected: string[];
    confidence: number;
    reasoning: string;
  };
}

function getScoreLabel(score: number, type: "detection" | "proficiency" | "authenticity"): string {
  if (type === "detection") {
    if (score >= 80) return "Likely AI-Generated";
    if (score >= 60) return "AI-Assisted";
    if (score >= 40) return "Mixed";
    return "Mostly Human";
  }
  if (type === "proficiency") {
    if (score >= 80) return "Expert";
    if (score >= 60) return "Proficient";
    if (score >= 40) return "Intermediate";
    return "Learning";
  }
  // authenticity
  if (score >= 80) return "Very Personal";
  if (score >= 60) return "Personal";
  if (score >= 40) return "Mixed Style";
  return "Generic";
}

function getScoreColor(score: number, type: "detection" | "proficiency" | "authenticity"): string {
  if (type === "detection") {
    // Higher detection = more AI, shown in purple
    if (score >= 60) return "bg-violet-500";
    if (score >= 40) return "bg-blue-500";
    return "bg-emerald-500";
  }
  if (type === "proficiency") {
    // Higher proficiency = better, shown in green
    if (score >= 60) return "bg-emerald-500";
    if (score >= 40) return "bg-blue-500";
    return "bg-amber-500";
  }
  // authenticity - higher = more personal, shown in teal
  if (score >= 60) return "bg-teal-500";
  if (score >= 40) return "bg-blue-500";
  return "bg-slate-400";
}

export function AIAnalysisCard({
  aiDetectionScore,
  aiProficiencyScore,
  codeAuthenticityScore,
  aiAnalysisDetails,
}: AIAnalysisCardProps) {
  const hasScores = aiDetectionScore !== undefined ||
                    aiProficiencyScore !== undefined ||
                    codeAuthenticityScore !== undefined;

  if (!hasScores) return null;

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Bot className="h-4 w-4 text-violet-500" />
        AI Analysis
      </h3>

      <div className="space-y-3">
        {/* AI Detection Score */}
        {aiDetectionScore !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Sparkles className="h-3 w-3" />
                AI Detection
              </span>
              <span className="font-medium text-slate-700">
                {Math.round(aiDetectionScore)}% - {getScoreLabel(aiDetectionScore, "detection")}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${getScoreColor(aiDetectionScore, "detection")}`}
                style={{ width: `${aiDetectionScore}%` }}
              />
            </div>
          </div>
        )}

        {/* AI Proficiency Score */}
        {aiProficiencyScore !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Bot className="h-3 w-3" />
                AI Proficiency
              </span>
              <span className="font-medium text-slate-700">
                {Math.round(aiProficiencyScore)}% - {getScoreLabel(aiProficiencyScore, "proficiency")}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${getScoreColor(aiProficiencyScore, "proficiency")}`}
                style={{ width: `${aiProficiencyScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Code Authenticity Score */}
        {codeAuthenticityScore !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Shield className="h-3 w-3" />
                Code Authenticity
              </span>
              <span className="font-medium text-slate-700">
                {Math.round(codeAuthenticityScore)}% - {getScoreLabel(codeAuthenticityScore, "authenticity")}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${getScoreColor(codeAuthenticityScore, "authenticity")}`}
                style={{ width: `${codeAuthenticityScore}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Analysis Details */}
      {aiAnalysisDetails && (
        <div className="mt-3 border-t border-violet-100 pt-3">
          <div className="flex items-start gap-2 text-xs text-slate-600">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <p className="line-clamp-3">{aiAnalysisDetails.reasoning}</p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

export function ScoreRing({ score, size = "md", showLabel = true, label }: ScoreRingProps) {
  const dimensions = {
    sm: { width: 48, stroke: 4, fontSize: "text-xs" },
    md: { width: 72, stroke: 5, fontSize: "text-base" },
    lg: { width: 120, stroke: 8, fontSize: "text-2xl" },
  };

  const { width, stroke, fontSize } = dimensions[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return { stroke: "#10B981", bg: "#D1FAE5" };
    if (score >= 60) return { stroke: "#4F46E5", bg: "#E0E7FF" };
    if (score >= 40) return { stroke: "#F59E0B", bg: "#FEF3C7" };
    return { stroke: "#EF4444", bg: "#FEE2E2" };
  };

  const colors = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width, height: width }}>
        <svg
          className="transform -rotate-90"
          width={width}
          height={width}
          viewBox={`0 0 ${width} ${width}`}
        >
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={stroke}
          />
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center font-bold ${fontSize}`}
          style={{ color: colors.stroke }}
        >
          {score}
        </div>
      </div>
      {showLabel && label && (
        <span className="text-xs font-medium text-slate-500">{label}</span>
      )}
    </div>
  );
}

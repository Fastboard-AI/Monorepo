"use client";

import { Search, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { useState } from "react";
import type { SortOption, SortDirection, FilterState } from "../types";

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sortBy: SortOption, direction: SortDirection) => void;
  availableSkills: string[];
  totalCandidates: number;
  filteredCount: number;
}

export function FilterBar({
  filters,
  onFiltersChange,
  sortBy,
  sortDirection,
  onSortChange,
  availableSkills,
  totalCandidates,
  filteredCount,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "score", label: "TalentFit Score" },
    { value: "name", label: "Name" },
    { value: "experience", label: "Experience" },
    { value: "uploadDate", label: "Upload Date" },
  ];

  const handleSkillToggle = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter((s) => s !== skill)
      : [...filters.skills, skill];
    onFiltersChange({ ...filters, skills: newSkills });
  };

  const clearFilters = () => {
    onFiltersChange({
      skills: [],
      minScore: 0,
      searchQuery: "",
    });
  };

  const hasActiveFilters =
    filters.skills.length > 0 || filters.minScore > 0 || filters.searchQuery;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFiltersChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all
              ${showFilters
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }
            `}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                {filters.skills.length + (filters.minScore > 0 ? 1 : 0)}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              onClick={() =>
                onSortChange(
                  sortBy,
                  sortDirection === "asc" ? "desc" : "asc"
                )
              }
            >
              <ArrowUpDown className="h-4 w-4" />
              Sort
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption, sortDirection)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Filter Candidates</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Minimum Score: {filters.minScore}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minScore}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minScore: parseInt(e.target.value),
                  })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSkills.slice(0, 12).map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleSkillToggle(skill)}
                    className={`
                      rounded-full border px-3 py-1.5 text-sm font-medium transition-all
                      ${filters.skills.includes(skill)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }
                    `}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {filteredCount} of {totalCandidates} candidates
        </span>
        {hasActiveFilters && (
          <span className="text-indigo-600">
            {totalCandidates - filteredCount} filtered out
          </span>
        )}
      </div>
    </div>
  );
}

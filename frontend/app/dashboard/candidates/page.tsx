"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { FileText, Users, Target, GitCompare } from "lucide-react";

import { Header } from "../../components/Header";
import { FilterBar } from "../../components/FilterBar";
import { SelectableCandidateCard } from "../../components/SelectableCandidateCard";
import { BulkActionBar } from "../../components/BulkActionBar";
import { ExportDropdown } from "../../components/ExportDropdown";
import { CandidateComparisonPanel } from "../../components/CandidateComparisonPanel";
import { CandidateDetailModal } from "../../components/CandidateDetailModal";
import { mockCandidates, getAllSkills } from "../../data/mockCandidates";
import type {
  Candidate,
  SortOption,
  SortDirection,
  FilterState,
} from "../../types";

export default function CandidatesPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparisonCandidates, setComparisonCandidates] = useState<Candidate[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    skills: [],
    minScore: 0,
    searchQuery: "",
  });
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const availableSkills = useMemo(() => getAllSkills(candidates), [candidates]);

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.title.toLowerCase().includes(query) ||
          c.skills.some((s) => s.name.toLowerCase().includes(query))
      );
    }

    if (filters.skills.length > 0) {
      result = result.filter((c) =>
        filters.skills.some((skill) => c.skills.some((s) => s.name === skill))
      );
    }

    if (filters.minScore > 0) {
      result = result.filter((c) => c.talentFitScore >= filters.minScore);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "score":
          comparison = a.talentFitScore - b.talentFitScore;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "experience":
          comparison = a.experience.length - b.experience.length;
          break;
        case "uploadDate":
          comparison =
            new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [candidates, filters, sortBy, sortDirection]);

  // Selection handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredCandidates.map((c) => c.id)));
  }, [filteredCandidates]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Comparison handlers
  const handleAddToComparison = useCallback((candidate: Candidate) => {
    setComparisonCandidates((prev) => {
      if (prev.some((c) => c.id === candidate.id)) {
        return prev.filter((c) => c.id !== candidate.id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, candidate];
    });
  }, []);

  const handleRemoveFromComparison = useCallback((id: string) => {
    setComparisonCandidates((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleOpenComparison = useCallback(() => {
    if (comparisonCandidates.length >= 2) {
      setIsComparisonOpen(true);
    }
  }, [comparisonCandidates.length]);

  // Bulk action handlers
  const handleBulkDelete = useCallback(() => {
    setCandidates((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setComparisonCandidates((prev) =>
      prev.filter((c) => !selectedIds.has(c.id))
    );
  }, [selectedIds]);

  const handleBulkAddToTeam = useCallback(() => {
    // Placeholder - would integrate with team state
    const selected = candidates.filter((c) => selectedIds.has(c.id));
    console.log("Adding to team:", selected);
    setSelectedIds(new Set());
  }, [candidates, selectedIds]);

  // Detail modal handlers
  const handleCandidateClick = useCallback((candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  }, []);

  // Stats
  const avgScore = useMemo(() => {
    if (candidates.length === 0) return 0;
    return Math.round(
      candidates.reduce((sum, c) => sum + c.talentFitScore, 0) / candidates.length
    );
  }, [candidates]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              All <span className="gradient-text">Candidates</span>
            </h1>
            <p className="mt-2 text-slate-600">
              Browse, compare, and manage your candidate pool.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {comparisonCandidates.length >= 2 && (
              <button
                onClick={handleOpenComparison}
                className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100"
              >
                <GitCompare className="h-4 w-4" />
                Compare ({comparisonCandidates.length})
              </button>
            )}
            <ExportDropdown candidates={filteredCandidates} selectedIds={selectedIds} />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {candidates.length}
                </p>
                <p className="text-sm text-slate-500">Total Candidates</p>
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedIds.size}
                </p>
                <p className="text-sm text-slate-500">Selected</p>
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{avgScore}</p>
                <p className="text-sm text-slate-500">Avg Score</p>
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <GitCompare className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {comparisonCandidates.length}/3
                </p>
                <p className="text-sm text-slate-500">Comparing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar with Select All */}
        <div className="mb-6 space-y-4">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={(newSortBy, newDirection) => {
              setSortBy(newSortBy);
              setSortDirection(newDirection);
            }}
            availableSkills={availableSkills}
            totalCandidates={candidates.length}
            filteredCount={filteredCandidates.length}
          />

          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Select all ({filteredCandidates.length})
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Candidate List */}
        <div className="space-y-4 pb-24">
          {filteredCandidates.map((candidate) => (
            <SelectableCandidateCard
              key={candidate.id}
              candidate={candidate}
              isSelected={selectedIds.has(candidate.id)}
              onToggleSelect={handleToggleSelect}
              onCompare={handleAddToComparison}
              onClick={() => handleCandidateClick(candidate)}
              isInComparison={comparisonCandidates.some(
                (c) => c.id === candidate.id
              )}
              comparisonDisabled={comparisonCandidates.length >= 3}
            />
          ))}

          {filteredCandidates.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
              <p className="text-lg font-medium text-slate-600">
                No candidates match your filters
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onDelete={handleBulkDelete}
          onAddToTeam={handleBulkAddToTeam}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Comparison Panel */}
      <CandidateComparisonPanel
        candidates={comparisonCandidates}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        onRemoveCandidate={handleRemoveFromComparison}
      />

      {/* Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCandidate(null);
        }}
      />
    </div>
  );
}

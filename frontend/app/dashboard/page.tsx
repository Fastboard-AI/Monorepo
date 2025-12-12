"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Users, TrendingUp, FileText, Target } from "lucide-react";

import {
  Header,
  FileUpload,
  CandidateCard,
  CandidateDetailModal,
  TeamPanel,
  FilterBar,
  ScoreBreakdown,
} from "../components";
import {
  mockCandidates,
  getAllSkills,
  calculateTeamCompatibility,
} from "../data/mockCandidates";
import type {
  Candidate,
  SortOption,
  SortDirection,
  FilterState,
} from "../types";

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [teamCandidates, setTeamCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    skills: [],
    minScore: 0,
    searchQuery: "",
  });
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const availableSkills = useMemo(() => getAllSkills(candidates), [candidates]);

  const filteredCandidates = useMemo(() => {
    let result = candidates.filter(
      (c) => !teamCandidates.some((tc) => tc.id === c.id)
    );

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
        filters.skills.some((skill) =>
          c.skills.some((s) => s.name === skill)
        )
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
  }, [candidates, teamCandidates, filters, sortBy, sortDirection]);

  const teamCompatibilityScore = useMemo(
    () => calculateTeamCompatibility(teamCandidates),
    [teamCandidates]
  );

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  }, []);

  const handleCandidateClick = useCallback((candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  }, []);

  const handleAddToTeam = useCallback((candidate: Candidate) => {
    if (!teamCandidates.some((c) => c.id === candidate.id)) {
      setTeamCandidates((prev) => [...prev, candidate]);
    }
  }, [teamCandidates]);

  const handleRemoveFromTeam = useCallback((candidateId: string) => {
    setTeamCandidates((prev) => prev.filter((c) => c.id !== candidateId));
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;

      if (!over) return;

      if (over.id === "team-panel") {
        const candidate = candidates.find((c) => c.id === active.id);
        if (candidate && !teamCandidates.some((c) => c.id === candidate.id)) {
          setTeamCandidates((prev) => [...prev, candidate]);
        }
      }
    },
    [candidates, teamCandidates]
  );

  const activeCandidate = activeId
    ? candidates.find((c) => c.id === activeId)
    : null;

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-slate-50">
        <Header />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Team <span className="gradient-text">Matching</span>
            </h1>
            <p className="mt-2 text-slate-600">
              Upload resumes and build your perfect team with AI-powered insights.
            </p>
          </div>

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
                  <p className="text-sm text-slate-500">Candidates</p>
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
                    {teamCandidates.length}
                  </p>
                  <p className="text-sm text-slate-500">Team Members</p>
                </div>
              </div>
            </div>

            <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Target className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {teamCompatibilityScore}%
                  </p>
                  <p className="text-sm text-slate-500">Team Score</p>
                </div>
              </div>
            </div>

            <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {availableSkills.length}
                  </p>
                  <p className="text-sm text-slate-500">Unique Skills</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              isProcessing={isProcessing}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
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
                totalCandidates={candidates.length - teamCandidates.length}
                filteredCount={filteredCandidates.length}
              />

              <SortableContext
                items={filteredCandidates.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {filteredCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      onClick={() => handleCandidateClick(candidate)}
                      className="cursor-pointer"
                    >
                      <CandidateCard
                        candidate={candidate}
                        isDraggable={true}
                        onSelect={handleAddToTeam}
                        isSelected={teamCandidates.some(
                          (c) => c.id === candidate.id
                        )}
                      />
                    </div>
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
              </SortableContext>
            </div>

            <div className="space-y-6">
              <TeamPanel
                candidates={teamCandidates}
                compatibilityScore={teamCompatibilityScore}
                onRemoveCandidate={handleRemoveFromTeam}
                targetRole="Full-Stack Team"
              />

              {teamCandidates.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <h3 className="mb-4 font-semibold text-slate-900">
                    Team Score Breakdown
                  </h3>
                  <ScoreBreakdown
                    breakdown={{
                      skillsMatch: Math.round(
                        teamCandidates.reduce(
                          (sum, c) => sum + c.scoreBreakdown.skillsMatch,
                          0
                        ) / teamCandidates.length
                      ),
                      experienceMatch: Math.round(
                        teamCandidates.reduce(
                          (sum, c) => sum + c.scoreBreakdown.experienceMatch,
                          0
                        ) / teamCandidates.length
                      ),
                      workStyleAlignment: Math.round(
                        teamCandidates.reduce(
                          (sum, c) => sum + c.scoreBreakdown.workStyleAlignment,
                          0
                        ) / teamCandidates.length
                      ),
                      teamFit: Math.round(
                        teamCandidates.reduce(
                          (sum, c) => sum + c.scoreBreakdown.teamFit,
                          0
                        ) / teamCandidates.length
                      ),
                    }}
                    showChart={true}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        <CandidateDetailModal
          candidate={selectedCandidate}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCandidate(null);
          }}
          onAddToTeam={handleAddToTeam}
          isInTeam={
            selectedCandidate
              ? teamCandidates.some((c) => c.id === selectedCandidate.id)
              : false
          }
        />

        <DragOverlay>
          {activeCandidate && (
            <div className="opacity-80">
              <CandidateCard
                candidate={activeCandidate}
                isDraggable={false}
                isCompact={true}
              />
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

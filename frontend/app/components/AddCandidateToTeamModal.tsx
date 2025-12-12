"use client";

import { useState, useMemo } from "react";
import { X, Search, UserPlus, Users } from "lucide-react";
import type { Team, Candidate } from "../types";
import { ScoreRing } from "./ScoreRing";

interface AddCandidateToTeamModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  availableCandidates: Candidate[];
  onAddCandidates: (teamId: string, candidateIds: string[]) => void;
}

export function AddCandidateToTeamModal({
  team,
  isOpen,
  onClose,
  availableCandidates,
  onAddCandidates,
}: AddCandidateToTeamModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // All hooks must be called before any early return
  const filteredCandidates = useMemo(() => {
    if (!searchQuery) return availableCandidates;
    const query = searchQuery.toLowerCase();
    return availableCandidates.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.skills.some((s) => s.name.toLowerCase().includes(query))
    );
  }, [availableCandidates, searchQuery]);

  if (!isOpen || !team) return null;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    if (selectedIds.size === 0) return;
    onAddCandidates(team.id, Array.from(selectedIds));
    setSelectedIds(new Set());
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <UserPlus className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Add Members to {team.name}
              </h2>
              <p className="text-sm text-slate-500">
                {availableCandidates.length} candidates available
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Candidate List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-slate-300" />
              <p className="mt-3 font-medium text-slate-600">
                No candidates available
              </p>
              <p className="text-sm text-slate-400">
                {searchQuery
                  ? "Try a different search term"
                  : "All candidates are already in this team"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  onClick={() => handleToggleSelect(candidate.id)}
                  className={`
                    flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all
                    ${selectedIds.has(candidate.id)
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(candidate.id)}
                      onChange={() => {}}
                      className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-400 text-sm font-medium text-white">
                      {candidate.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {candidate.name}
                      </p>
                      <p className="text-sm text-slate-500">{candidate.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
                      {candidate.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill.name}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                    <ScoreRing score={candidate.talentFitScore} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4">
          <span className="text-sm text-slate-500">
            {selectedIds.size} candidate{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0}
              className="btn-lift flex items-center gap-2 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

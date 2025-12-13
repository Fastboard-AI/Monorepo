"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Users, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Team } from "../types";

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string | null;
  onSelect: (team: Team | null) => void;
  isLoading?: boolean;
}

export function TeamSelector({
  teams,
  selectedTeamId,
  onSelect,
  isLoading = false,
}: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left transition-all ${
          isOpen
            ? "border-violet-300 ring-2 ring-violet-100"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              selectedTeam
                ? "bg-gradient-to-br from-violet-500 to-indigo-500"
                : "bg-slate-100"
            }`}
          >
            <Users
              className={`h-5 w-5 ${
                selectedTeam ? "text-white" : "text-slate-400"
              }`}
            />
          </div>
          <div>
            {selectedTeam ? (
              <>
                <div className="font-medium text-slate-900">
                  {selectedTeam.name}
                </div>
                <div className="text-sm text-slate-500">
                  {selectedTeam.members.length} member
                  {selectedTeam.members.length !== 1 ? "s" : ""} •{" "}
                  {selectedTeam.compatibilityScore}% compatibility
                </div>
              </>
            ) : (
              <>
                <div className="font-medium text-slate-500">Select a team</div>
                <div className="text-sm text-slate-400">
                  Choose an existing team for compatibility matching
                </div>
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {teams.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">
              <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="font-medium">No teams yet</p>
              <p className="mt-1 text-sm">
                Create a team first to enable compatibility matching
              </p>
              <Link
                href="/dashboard/teams"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Go to Teams
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="py-1">
              {/* Clear selection option */}
              {selectedTeamId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(null);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-500 transition-colors hover:bg-slate-50"
                >
                  Clear selection
                </button>
              )}

              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    onSelect(team);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedTeamId === team.id
                      ? "bg-violet-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                      selectedTeamId === team.id
                        ? "bg-gradient-to-br from-violet-500 to-indigo-500"
                        : "bg-slate-100"
                    }`}
                  >
                    {selectedTeamId === team.id ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Users className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-medium ${
                        selectedTeamId === team.id
                          ? "text-violet-700"
                          : "text-slate-900"
                      }`}
                    >
                      {team.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>
                        {team.members.length} member
                        {team.members.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{team.compatibilityScore}% score</span>
                      {team.targetRole && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="truncate">{team.targetRole}</span>
                        </>
                      )}
                    </div>
                    {team.members.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {team.members.slice(0, 3).map((member) => (
                          <span
                            key={member.id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {member.name.split(" ")[0]}
                          </span>
                        ))}
                        {team.members.length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            +{team.members.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

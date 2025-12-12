"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { Plus, Users, Target, TrendingUp, Search, Layers } from "lucide-react";

import { Header } from "../../components/Header";
import { TeamCard } from "../../components/TeamCard";
import { CreateTeamModal } from "../../components/CreateTeamModal";
import { EditTeamModal } from "../../components/EditTeamModal";
import { TeamDetailModal } from "../../components/TeamDetailModal";
import { DeleteConfirmModal } from "../../components/DeleteConfirmModal";
import { AddTeamMemberModal } from "../../components/AddTeamMemberModal";
import { useTeamsStorage } from "../../hooks/useTeamsStorage";
import type { Team, TeamMember } from "../../types";

export default function TeamsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const {
    teams,
    isLoading,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
  } = useTeamsStorage();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // Selected team for operations
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered teams
  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.targetRole?.toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  // Stats
  const totalMembers = useMemo(
    () => teams.reduce((sum, t) => sum + t.members.length, 0),
    [teams]
  );

  const avgTeamScore = useMemo(() => {
    if (teams.length === 0) return 0;
    return Math.round(
      teams.reduce((sum, t) => sum + t.compatibilityScore, 0) / teams.length
    );
  }, [teams]);

  const activeRoles = useMemo(() => {
    const roles = teams.filter((t) => t.targetRole).map((t) => t.targetRole);
    return new Set(roles).size;
  }, [teams]);

  // Handlers
  const handleCreateTeam = useCallback(
    (data: { name: string; targetRole?: string }) => {
      createTeam(data);
    },
    [createTeam]
  );

  const handleEditTeam = useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveTeam = useCallback(
    (teamId: string, updates: { name: string; targetRole?: string }) => {
      updateTeam(teamId, updates);
      setIsEditModalOpen(false);
      setSelectedTeam(null);
    },
    [updateTeam]
  );

  const handleDeleteClick = useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedTeam) {
      deleteTeam(selectedTeam.id);
      setIsDeleteModalOpen(false);
      setSelectedTeam(null);
    }
  }, [deleteTeam, selectedTeam]);

  const handleViewDetails = useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsDetailModalOpen(true);
  }, []);

  const handleAddMemberClick = useCallback((team: Team) => {
    setSelectedTeam(team);
    setIsAddMemberModalOpen(true);
  }, []);

  const handleAddMember = useCallback(
    (memberData: Omit<TeamMember, "id">) => {
      if (selectedTeam) {
        addTeamMember(selectedTeam.id, memberData);
      }
      setIsAddMemberModalOpen(false);
    },
    [addTeamMember, selectedTeam]
  );

  const handleRemoveMember = useCallback(
    (teamId: string, memberId: string) => {
      removeTeamMember(teamId, memberId);
    },
    [removeTeamMember]
  );

  if (!isLoaded || isLoading) {
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
              Team <span className="gradient-text">Management</span>
            </h1>
            <p className="mt-2 text-slate-600">
              Create and manage your teams for different roles and projects.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-lift flex items-center gap-2 rounded-lg gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-button"
          >
            <Plus className="h-5 w-5" />
            Create Team
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Layers className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {teams.length}
                </p>
                <p className="text-sm text-slate-500">Total Teams</p>
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
                  {totalMembers}
                </p>
                <p className="text-sm text-slate-500">Total Members</p>
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {avgTeamScore}%
                </p>
                <p className="text-sm text-slate-500">Avg Score</p>
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeRoles}</p>
                <p className="text-sm text-slate-500">Active Roles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              {searchQuery ? "No teams match your search" : "No teams yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? "Try a different search term"
                : "Create your first team to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-lift mt-6 inline-flex items-center gap-2 rounded-lg gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-button"
              >
                <Plus className="h-5 w-5" />
                Create Team
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onEdit={handleEditTeam}
                onDelete={handleDeleteClick}
                onViewDetails={handleViewDetails}
                onAddMember={handleAddMemberClick}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTeam={handleCreateTeam}
      />

      <EditTeamModal
        team={selectedTeam}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTeam(null);
        }}
        onSaveTeam={handleSaveTeam}
      />

      <TeamDetailModal
        team={selectedTeam}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTeam(null);
        }}
        onRemoveMember={handleRemoveMember}
        onAddMember={handleAddMemberClick}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Team"
        message={`Are you sure you want to delete "${selectedTeam?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Team"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedTeam(null);
        }}
      />

      <AddTeamMemberModal
        team={selectedTeam}
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          // Don't clear selectedTeam here so TeamDetailModal still works
        }}
        onAddMember={handleAddMember}
      />
    </div>
  );
}

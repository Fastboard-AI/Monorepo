"use client";

import { useState, useEffect, useCallback } from "react";
import type { Team, TeamMember, Skill, ExperienceLevel, WorkStyle } from "../types";

const STORAGE_KEY = "fastboard_teams_v2";

interface StoredTeam {
  id: string;
  name: string;
  members: TeamMember[];
  targetRole?: string;
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// Calculate team compatibility score based on member diversity and skill coverage
function calculateTeamScore(members: TeamMember[]): number {
  if (members.length === 0) return 0;
  if (members.length === 1) return 75;

  // Score based on skill diversity
  const allSkills = members.flatMap((m) => m.skills.map((s) => s.name));
  const uniqueSkills = new Set(allSkills);
  const skillDiversity = Math.min(uniqueSkills.size / (members.length * 2), 1);

  // Score based on experience level mix
  const expLevels = new Set(members.map((m) => m.experienceLevel));
  const expDiversity = expLevels.size / 4;

  // Score based on work style compatibility
  const commStyles = members.map((m) => m.workStyle.communication);
  const collabStyles = members.map((m) => m.workStyle.collaboration);
  const hasStyleVariety = new Set(commStyles).size > 1 || new Set(collabStyles).size > 1;

  const baseScore = 70;
  const diversityBonus = skillDiversity * 15 + expDiversity * 10;
  const styleBonus = hasStyleVariety ? 5 : 0;

  return Math.round(Math.min(baseScore + diversityBonus + styleBonus, 100));
}

function resolveTeam(stored: StoredTeam): Team {
  return {
    id: stored.id,
    name: stored.name,
    members: stored.members,
    compatibilityScore: calculateTeamScore(stored.members),
    targetRole: stored.targetRole,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

function toStoredTeam(team: Team): StoredTeam {
  return {
    id: team.id,
    name: team.name,
    members: team.members,
    targetRole: team.targetRole,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

export function useTeamsStorage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load teams from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const storedTeams: StoredTeam[] = JSON.parse(stored);
        const resolvedTeams = storedTeams.map(resolveTeam);
        setTeams(resolvedTeams);
      }
    } catch (error) {
      console.error("Failed to load teams from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist teams to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        const storedTeams = teams.map(toStoredTeam);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedTeams));
      } catch (error) {
        console.error("Failed to save teams to localStorage:", error);
      }
    }
  }, [teams, isLoading]);

  const createTeam = useCallback(
    (data: { name: string; targetRole?: string; members?: TeamMember[] }): Team => {
      const members = data.members || [];
      const now = new Date();

      const newTeam: Team = {
        id: generateId(),
        name: data.name,
        members,
        compatibilityScore: calculateTeamScore(members),
        targetRole: data.targetRole,
        createdAt: now,
        updatedAt: now,
      };

      setTeams((prev) => [...prev, newTeam]);
      return newTeam;
    },
    []
  );

  const updateTeam = useCallback(
    (teamId: string, updates: { name?: string; targetRole?: string }) => {
      setTeams((prev) =>
        prev.map((team) =>
          team.id === teamId
            ? { ...team, ...updates, updatedAt: new Date() }
            : team
        )
      );
    },
    []
  );

  const deleteTeam = useCallback((teamId: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== teamId));
  }, []);

  const addTeamMember = useCallback(
    (teamId: string, memberData: Omit<TeamMember, "id">): TeamMember | null => {
      const newMember: TeamMember = {
        id: generateId(),
        ...memberData,
      };

      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== teamId) return team;

          const updatedMembers = [...team.members, newMember];
          return {
            ...team,
            members: updatedMembers,
            compatibilityScore: calculateTeamScore(updatedMembers),
            updatedAt: new Date(),
          };
        })
      );

      return newMember;
    },
    []
  );

  const removeTeamMember = useCallback(
    (teamId: string, memberId: string) => {
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== teamId) return team;

          const updatedMembers = team.members.filter((m) => m.id !== memberId);
          return {
            ...team,
            members: updatedMembers,
            compatibilityScore: calculateTeamScore(updatedMembers),
            updatedAt: new Date(),
          };
        })
      );
    },
    []
  );

  const updateTeamMember = useCallback(
    (teamId: string, memberId: string, updates: Partial<Omit<TeamMember, "id">>) => {
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== teamId) return team;

          const updatedMembers = team.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          );
          return {
            ...team,
            members: updatedMembers,
            compatibilityScore: calculateTeamScore(updatedMembers),
            updatedAt: new Date(),
          };
        })
      );
    },
    []
  );

  const getTeamById = useCallback(
    (teamId: string): Team | undefined => {
      return teams.find((team) => team.id === teamId);
    },
    [teams]
  );

  return {
    teams,
    isLoading,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    updateTeamMember,
    getTeamById,
  };
}

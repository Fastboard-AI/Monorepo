"use client";

import { useState, useEffect, useCallback } from "react";
import type { Team, TeamMember, Skill, ExperienceLevel, WorkStyle } from "../types";
import { api, ApiTeam, ApiTeamMember } from "../lib/api";

// Convert API team member to frontend type
function apiToTeamMember(apiMember: ApiTeamMember): TeamMember {
  return {
    id: apiMember.id,
    name: apiMember.name,
    role: apiMember.role,
    skills: apiMember.skills.map((s) => ({
      name: s.name,
      level: s.level as Skill["level"],
    })),
    experienceLevel: apiMember.experience_level as ExperienceLevel,
    workStyle: {
      communication: apiMember.work_style.communication as WorkStyle["communication"],
      collaboration: apiMember.work_style.collaboration as WorkStyle["collaboration"],
      pace: apiMember.work_style.pace as WorkStyle["pace"],
    },
  };
}

// Convert API team to frontend type
function apiToTeam(apiTeam: ApiTeam): Team {
  return {
    id: apiTeam.id,
    name: apiTeam.name,
    members: apiTeam.members.map(apiToTeamMember),
    compatibilityScore: apiTeam.compatibility_score,
    targetRole: apiTeam.target_role || undefined,
    createdAt: new Date(apiTeam.created_at),
    updatedAt: new Date(apiTeam.updated_at),
  };
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load teams from API on mount
  useEffect(() => {
    api.getTeams()
      .then((data) => {
        setTeams(data.map(apiToTeam));
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load teams:", err);
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const createTeam = useCallback(
    async (data: { name: string; targetRole?: string; members?: TeamMember[] }): Promise<Team> => {
      const apiTeam = await api.createTeam({
        name: data.name,
        target_role: data.targetRole,
      });

      const newTeam = apiToTeam(apiTeam);

      // If members were provided, add them one by one
      if (data.members && data.members.length > 0) {
        for (const member of data.members) {
          await api.addTeamMember(newTeam.id, {
            name: member.name,
            role: member.role,
            skills: member.skills.map((s) => ({ name: s.name, level: s.level })),
            experience_level: member.experienceLevel,
            work_style: {
              communication: member.workStyle.communication,
              collaboration: member.workStyle.collaboration,
              pace: member.workStyle.pace,
            },
          });
        }
        // Refresh the team to get members
        const refreshedTeam = await api.getTeam(newTeam.id);
        const finalTeam = apiToTeam(refreshedTeam);
        setTeams((prev) => [...prev, finalTeam]);
        return finalTeam;
      }

      setTeams((prev) => [...prev, newTeam]);
      return newTeam;
    },
    []
  );

  const updateTeam = useCallback(
    async (teamId: string, updates: { name?: string; targetRole?: string }) => {
      await api.updateTeam(teamId, {
        name: updates.name,
        target_role: updates.targetRole,
      });

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

  const deleteTeam = useCallback(async (teamId: string) => {
    await api.deleteTeam(teamId);
    setTeams((prev) => prev.filter((team) => team.id !== teamId));
  }, []);

  const addTeamMember = useCallback(
    async (teamId: string, memberData: Omit<TeamMember, "id">): Promise<TeamMember | null> => {
      const apiMember = await api.addTeamMember(teamId, {
        name: memberData.name,
        role: memberData.role,
        skills: memberData.skills.map((s) => ({ name: s.name, level: s.level })),
        experience_level: memberData.experienceLevel,
        work_style: {
          communication: memberData.workStyle.communication,
          collaboration: memberData.workStyle.collaboration,
          pace: memberData.workStyle.pace,
        },
      });

      const newMember = apiToTeamMember(apiMember);

      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== teamId) return team;

          const updatedMembers = [...team.members, newMember];
          return {
            ...team,
            members: updatedMembers,
            updatedAt: new Date(),
          };
        })
      );

      return newMember;
    },
    []
  );

  const removeTeamMember = useCallback(
    async (teamId: string, memberId: string) => {
      await api.removeTeamMember(teamId, memberId);

      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== teamId) return team;

          const updatedMembers = team.members.filter((m) => m.id !== memberId);
          return {
            ...team,
            members: updatedMembers,
            updatedAt: new Date(),
          };
        })
      );
    },
    []
  );

  const updateTeamMember = useCallback(
    (teamId: string, memberId: string, updates: Partial<Omit<TeamMember, "id">>) => {
      // Note: This is currently client-side only
      // TODO: Add backend endpoint for updating team members
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== teamId) return team;

          const updatedMembers = team.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          );
          return {
            ...team,
            members: updatedMembers,
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
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    updateTeamMember,
    getTeamById,
  };
}

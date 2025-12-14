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
    github: apiMember.github,
    linkedin: apiMember.linkedin,
    website: apiMember.website,
    codeCharacteristics: apiMember.code_characteristics,
    // AI Analysis fields
    aiDetectionScore: apiMember.ai_detection_score,
    aiProficiencyScore: apiMember.ai_proficiency_score,
    codeAuthenticityScore: apiMember.code_authenticity_score,
    aiAnalysisDetails: apiMember.ai_analysis_details,
    developerProfile: apiMember.developer_profile,
    analysisMetadata: apiMember.analysis_metadata,
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
            github: member.github,
            linkedin: member.linkedin,
            website: member.website,
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
        github: memberData.github,
        linkedin: memberData.linkedin,
        website: memberData.website,
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
    async (teamId: string, memberId: string, updates: Partial<Omit<TeamMember, "id">>): Promise<TeamMember> => {
      const apiMember = await api.updateTeamMember(teamId, memberId, {
        name: updates.name,
        role: updates.role,
        skills: updates.skills?.map((s) => ({ name: s.name, level: s.level })),
        experience_level: updates.experienceLevel,
        work_style: updates.workStyle ? {
          communication: updates.workStyle.communication,
          collaboration: updates.workStyle.collaboration,
          pace: updates.workStyle.pace,
        } : undefined,
        github: updates.github,
        linkedin: updates.linkedin,
        website: updates.website,
      });

      const updatedMember = apiToTeamMember(apiMember);

      setTeams((prev) =>
        prev.map((team) => {
          if (team.id !== teamId) return team;

          const updatedMembers = team.members.map((m) =>
            m.id === memberId ? updatedMember : m
          );
          return {
            ...team,
            members: updatedMembers,
            updatedAt: new Date(),
          };
        })
      );

      return updatedMember;
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

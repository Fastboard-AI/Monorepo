"use client";

import { useState, useEffect } from "react";
import { X, UserCog, Plus, RefreshCw } from "lucide-react";
import type { Team, TeamMember, Skill, ExperienceLevel, WorkStyle } from "../types";

interface EditTeamMemberModalProps {
  team: Team | null;
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMember: (memberId: string, updates: Partial<Omit<TeamMember, "id">>) => Promise<void>;
}

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Principal" },
];

const SKILL_LEVELS: Skill["level"][] = ["beginner", "intermediate", "advanced", "expert"];

export function EditTeamMemberModal({
  team,
  member,
  isOpen,
  onClose,
  onUpdateMember,
}: EditTeamMemberModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("mid");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<Skill["level"]>("intermediate");
  const [workStyle, setWorkStyle] = useState<WorkStyle>({
    communication: "mixed",
    collaboration: "balanced",
    pace: "flexible",
  });
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when member changes
  useEffect(() => {
    if (member) {
      setName(member.name);
      setRole(member.role);
      setExperienceLevel(member.experienceLevel);
      setSkills([...member.skills]);
      setWorkStyle({ ...member.workStyle });
      setGithub(member.github || "");
      setLinkedin(member.linkedin || "");
      setWebsite(member.website || "");
    }
  }, [member]);

  if (!isOpen || !team || !member) return null;

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    if (skills.some((s) => s.name.toLowerCase() === newSkillName.toLowerCase())) return;

    setSkills((prev) => [
      ...prev,
      { name: newSkillName.trim(), level: newSkillLevel },
    ]);
    setNewSkillName("");
    setNewSkillLevel("intermediate");
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkills((prev) => prev.filter((s) => s.name !== skillName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;

    setIsSaving(true);
    try {
      await onUpdateMember(member.id, {
        name: name.trim(),
        role: role.trim(),
        skills,
        experienceLevel,
        workStyle,
        github: github.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        website: website.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update member:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const githubChanged = (member.github || "") !== github.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
              <UserCog className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Team Member
              </h2>
              <p className="text-sm text-slate-500">
                Update {member.name}&apos;s details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sarah Chen"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="member-role" className="block text-sm font-medium text-slate-700">
              Current Role <span className="text-red-500">*</span>
            </label>
            <input
              id="member-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Senior Frontend Developer"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Experience Level */}
          <div>
            <label htmlFor="experience-level" className="block text-sm font-medium text-slate-700">
              Experience Level
            </label>
            <select
              id="experience-level"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Skills</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Skill name"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value as Skill["level"])}
                className="rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddSkill}
                className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="group flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                  >
                    {skill.name}
                    <span className="text-indigo-400">({skill.level})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.name)}
                      className="rounded-full p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Work Style */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Work Style Preferences</h3>

            {/* Communication */}
            <div>
              <label htmlFor="communication" className="block text-xs font-medium text-slate-600">
                Communication Style
              </label>
              <select
                id="communication"
                value={workStyle.communication}
                onChange={(e) =>
                  setWorkStyle((prev) => ({
                    ...prev,
                    communication: e.target.value as WorkStyle["communication"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="async">Async (email, messages)</option>
                <option value="sync">Sync (calls, meetings)</option>
                <option value="mixed">Mixed (flexible)</option>
              </select>
            </div>

            {/* Collaboration */}
            <div>
              <label htmlFor="collaboration" className="block text-xs font-medium text-slate-600">
                Collaboration Style
              </label>
              <select
                id="collaboration"
                value={workStyle.collaboration}
                onChange={(e) =>
                  setWorkStyle((prev) => ({
                    ...prev,
                    collaboration: e.target.value as WorkStyle["collaboration"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="independent">Independent (solo work)</option>
                <option value="collaborative">Collaborative (pair/team work)</option>
                <option value="balanced">Balanced (mix of both)</option>
              </select>
            </div>

            {/* Pace */}
            <div>
              <label htmlFor="pace" className="block text-xs font-medium text-slate-600">
                Work Pace
              </label>
              <select
                id="pace"
                value={workStyle.pace}
                onChange={(e) =>
                  setWorkStyle((prev) => ({
                    ...prev,
                    pace: e.target.value as WorkStyle["pace"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="fast">Fast-paced (sprints, deadlines)</option>
                <option value="steady">Steady (consistent rhythm)</option>
                <option value="flexible">Flexible (adapts as needed)</option>
              </select>
            </div>
          </div>

          {/* Developer Links */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Developer Links</h3>
              <p className="text-xs text-slate-500 mt-0.5">Code style will be re-analyzed if GitHub changes</p>
            </div>

            {/* GitHub */}
            <div>
              <label htmlFor="github" className="block text-xs font-medium text-slate-600">
                GitHub Username
                {githubChanged && github.trim() && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                    <RefreshCw className="h-3 w-3" />
                    Will re-analyze
                  </span>
                )}
              </label>
              <input
                id="github"
                type="text"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="e.g., octocat"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedin" className="block text-xs font-medium text-slate-600">
                LinkedIn URL
              </label>
              <input
                id="linkedin"
                type="text"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-xs font-medium text-slate-600">
                Personal Website
              </label>
              <input
                id="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !role.trim() || isSaving}
              className="btn-lift flex items-center gap-2 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserCog className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

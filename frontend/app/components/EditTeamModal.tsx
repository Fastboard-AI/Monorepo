"use client";

import { useState, useEffect } from "react";
import { X, Pencil } from "lucide-react";
import type { Team } from "../types";

interface EditTeamModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTeam: (teamId: string, updates: { name: string; targetRole?: string }) => void;
}

export function EditTeamModal({
  team,
  isOpen,
  onClose,
  onSaveTeam,
}: EditTeamModalProps) {
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");

  useEffect(() => {
    if (team) {
      setName(team.name);
      setTargetRole(team.targetRole || "");
    }
  }, [team]);

  if (!isOpen || !team) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveTeam(team.id, {
      name: name.trim(),
      targetRole: targetRole.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Pencil className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Edit Team</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="edit-team-name"
                className="block text-sm font-medium text-slate-700"
              >
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-team-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Frontend Team"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="edit-target-role"
                className="block text-sm font-medium text-slate-700"
              >
                Target Role{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="edit-target-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Full-Stack Development"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-lift rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

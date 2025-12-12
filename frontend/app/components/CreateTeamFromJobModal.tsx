"use client";

import { useState } from "react";
import { X, Users } from "lucide-react";
import type { Job } from "../types";

interface CreateTeamFromJobModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: (data: {
    name: string;
    targetRole?: string;
  }) => void;
}

export function CreateTeamFromJobModal({
  job,
  isOpen,
  onClose,
  onCreateTeam,
}: CreateTeamFromJobModalProps) {
  const [name, setName] = useState(job.title);
  const [targetRole, setTargetRole] = useState(job.title);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateTeam({
      name: name.trim(),
      targetRole: targetRole.trim() || undefined,
    });

    handleClose();
  };

  const handleClose = () => {
    setName(job.title);
    setTargetRole(job.title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Create Team
              </h2>
              <p className="text-sm text-slate-500">
                For: {job.title}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Team Name */}
          <div>
            <label
              htmlFor="team-name"
              className="block text-sm font-medium text-slate-700"
            >
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Frontend Squad"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
          </div>

          {/* Target Role */}
          <div>
            <label
              htmlFor="target-role"
              className="block text-sm font-medium text-slate-700"
            >
              Target Role{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="target-role"
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., Full-Stack Developer"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Info about team members */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              After creating the team, you can add existing employees who will work with the new hire.
              Candidates will be evaluated for compatibility with these team members.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-lift rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

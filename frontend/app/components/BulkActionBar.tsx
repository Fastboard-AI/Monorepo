"use client";

import { Trash2, UserPlus, X } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onAddToTeam: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  onDelete,
  onAddToTeam,
  onClearSelection,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-lg">
      {/* Gradient accent line */}
      <div className="h-1 gradient-bg" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {selectedCount}
            </span>
            <span className="font-medium text-slate-700">
              candidate{selectedCount !== 1 ? "s" : ""} selected
            </span>
          </span>

          <button
            onClick={onClearSelection}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>

          <button
            onClick={onAddToTeam}
            className="btn-lift flex items-center gap-2 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button"
          >
            <UserPlus className="h-4 w-4" />
            Add to Team
          </button>
        </div>
      </div>
    </div>
  );
}

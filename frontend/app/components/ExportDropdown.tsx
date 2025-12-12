"use client";

import { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileJson, FileSpreadsheet } from "lucide-react";
import { exportToCSV, exportToJSON } from "../utils/exportCandidates";
import type { Candidate } from "../types";

interface ExportDropdownProps {
  candidates: Candidate[];
  selectedIds?: Set<string>;
}

export function ExportDropdown({ candidates, selectedIds }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCandidates = selectedIds
    ? candidates.filter((c) => selectedIds.has(c.id))
    : [];

  const handleExportAllCSV = () => {
    exportToCSV(candidates);
    setIsOpen(false);
  };

  const handleExportAllJSON = () => {
    exportToJSON(candidates);
    setIsOpen(false);
  };

  const handleExportSelectedCSV = () => {
    exportToCSV(selectedCandidates);
    setIsOpen(false);
  };

  const handleExportSelectedJSON = () => {
    exportToJSON(selectedCandidates);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover z-20">
          <div className="py-1">
            <button
              onClick={handleExportAllCSV}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export All as CSV
            </button>
            <button
              onClick={handleExportAllJSON}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileJson className="h-4 w-4 text-indigo-600" />
              Export All as JSON
            </button>

            {selectedCandidates.length > 0 && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={handleExportSelectedCSV}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Export Selected ({selectedCandidates.length}) as CSV
                </button>
                <button
                  onClick={handleExportSelectedJSON}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FileJson className="h-4 w-4 text-indigo-600" />
                  Export Selected ({selectedCandidates.length}) as JSON
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

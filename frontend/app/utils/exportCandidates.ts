import type { Candidate } from "../types";

export function exportToCSV(candidates: Candidate[]): void {
  const headers = [
    "Name",
    "Title",
    "Email",
    "Phone",
    "Location",
    "TalentFit Score",
    "Skills Match",
    "Experience Match",
    "Work Style",
    "Team Fit",
    "Skills",
    "Experience Count",
    "Education",
    "GitHub",
    "LinkedIn",
    "Portfolio",
  ];

  const rows = candidates.map((c) => [
    c.name,
    c.title,
    c.email || "",
    c.phone || "",
    c.location || "",
    c.talentFitScore.toString(),
    c.scoreBreakdown.skillsMatch.toString(),
    c.scoreBreakdown.experienceMatch.toString(),
    c.scoreBreakdown.workStyleAlignment.toString(),
    c.scoreBreakdown.teamFit.toString(),
    c.skills.map((s) => s.name).join("; "),
    c.experience.length.toString(),
    c.education.map((e) => `${e.degree} - ${e.institution}`).join("; "),
    c.links.github || "",
    c.links.linkedin || "",
    c.links.portfolio || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  downloadFile(csvContent, "candidates.csv", "text/csv");
}

export function exportToJSON(candidates: Candidate[]): void {
  const jsonContent = JSON.stringify(candidates, null, 2);
  downloadFile(jsonContent, "candidates.json", "application/json");
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

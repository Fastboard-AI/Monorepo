"use client";

import { useState, useCallback } from "react";
import {
  Briefcase,
  Users,
  Sparkles,
  ChevronRight,
  Loader2,
  ExternalLink,
  GitCompare,
  Github,
  Globe,
  Linkedin,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { api, ParsedResume } from "../../lib/api";
import {
  Header,
  JobSelector,
  TeamSelector,
  FileUpload,
  MatchedCandidateCard,
  TeamMemberCard,
  CandidateDetailModal,
} from "../../components";
import { useJobs } from "../../hooks/useJobs";
import { useTeams } from "../../hooks/useTeams";
import type { Job, Team, TeamMember, Candidate, Skill } from "../../types";
import { getSkillName } from "../../types";

interface ParsedResult {
  candidate: Candidate;
  jobScore: number;
  teamScore: number;
  parsed: ParsedResume;
  fileName: string;
}

function calculateScores(
  parsed: ParsedResume,
  job: Job,
  teamMembers: TeamMember[]
): { jobScore: number; teamScore: number } {
  // Calculate job match score based on skill overlap
  const candidateSkillNames = parsed.skills.map((s) => s.name.toLowerCase());
  const jobSkillNames = job.requiredSkills.map((s) => getSkillName(s).toLowerCase());

  const matchingSkills = jobSkillNames.filter((s) =>
    candidateSkillNames.some((cs) => cs.includes(s) || s.includes(cs))
  );

  const jobScore = jobSkillNames.length > 0
    ? Math.min(95, Math.round(50 + (matchingSkills.length / jobSkillNames.length) * 45))
    : 70;

  // Calculate team compatibility score
  let teamScore = 75;
  if (teamMembers.length > 0) {
    const teamSkills = new Set(
      teamMembers.flatMap((m) => m.skills.map((s) => s.name.toLowerCase()))
    );
    const complementarySkills = candidateSkillNames.filter((s) => !teamSkills.has(s));
    const overlapSkills = candidateSkillNames.filter((s) => teamSkills.has(s));
    teamScore = Math.min(98, Math.round(65 + complementarySkills.length * 2 + overlapSkills.length * 3));
  }

  return { jobScore, teamScore };
}

function parsedToCandidate(parsed: ParsedResume, fileName: string, jobScore: number, teamScore: number): Candidate {
  const skills: Skill[] = parsed.skills.map((s) => ({
    name: s.name,
    level: s.level as Skill["level"],
  }));

  return {
    id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    name: parsed.name || "Unknown",
    email: parsed.email || undefined,
    phone: parsed.phone || undefined,
    location: parsed.location || undefined,
    title: parsed.title || "Professional",
    summary: parsed.summary || undefined,
    skills,
    experience: parsed.experience.map((e) => ({
      title: e.title,
      company: e.company,
      duration: e.duration,
      description: e.description || undefined,
    })),
    education: parsed.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      year: e.year,
      field: e.field || undefined,
    })),
    links: {
      github: parsed.github_url || undefined,
      linkedin: parsed.linkedin_url || undefined,
      portfolio: parsed.website_url || undefined,
    },
    talentFitScore: Math.round((jobScore + teamScore) / 2),
    scoreBreakdown: {
      skillsMatch: jobScore,
      experienceMatch: Math.min(95, 60 + parsed.experience.length * 5),
      workStyleAlignment: teamScore,
      teamFit: teamScore,
    },
    resumeFileName: fileName,
    uploadedAt: new Date(),
  };
}

export default function ResumeMatcherPage() {
  const { jobs, isLoading: isLoadingJobs } = useJobs();
  const { teams, isLoading: isLoadingTeams } = useTeams();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [matchedResults, setMatchedResults] = useState<ParsedResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setMatchedResults([]);
    setErrors([]);
  }, []);

  const handleMatchResumes = useCallback(async () => {
    if (!selectedJob || selectedFiles.length === 0) return;

    setIsProcessing(true);
    setMatchedResults([]);
    setErrors([]);

    const teamMembers = selectedTeam?.members || [];
    const results: ParsedResult[] = [];
    const errorMessages: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setProcessingStatus(`Parsing ${file.name} (${i + 1}/${selectedFiles.length})...`);

      try {
        const parsed = await api.parseResume(file);

        if (parsed.error) {
          errorMessages.push(`${file.name}: ${parsed.error}`);
          continue;
        }

        const { jobScore, teamScore } = calculateScores(parsed, selectedJob, teamMembers);
        const candidate = parsedToCandidate(parsed, file.name, jobScore, teamScore);

        results.push({ candidate, jobScore, teamScore, parsed, fileName: file.name });
      } catch (error) {
        errorMessages.push(`${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Sort by overall score
    results.sort((a, b) => {
      const overallA = (a.jobScore + a.teamScore) / 2;
      const overallB = (b.jobScore + b.teamScore) / 2;
      return overallB - overallA;
    });

    // Save all candidates to database
    setProcessingStatus("Saving candidates to database...");
    for (const { candidate, jobScore, teamScore } of results) {
      try {
        const createdCandidate = await api.createCandidate({
          name: candidate.name,
          email: candidate.email || undefined,
          phone: candidate.phone || undefined,
          location: candidate.location || undefined,
          title: candidate.title,
          skills: candidate.skills.map((s) => ({ name: s.name, level: s.level })),
          experience: candidate.experience.map((e) => ({
            title: e.title,
            company: e.company,
            duration: e.duration,
            description: e.description,
          })),
          education: candidate.education.map((e) => ({
            degree: e.degree,
            institution: e.institution,
            year: e.year,
          })),
          links: candidate.links || {},
          talent_fit_score: candidate.talentFitScore,
          score_breakdown: {
            skillsMatch: candidate.scoreBreakdown.skillsMatch,
            experienceMatch: candidate.scoreBreakdown.experienceMatch,
            workStyleAlignment: candidate.scoreBreakdown.workStyleAlignment,
            teamFit: candidate.scoreBreakdown.teamFit,
          },
          resume_file_name: candidate.resumeFileName,
          source: "resume_matcher",
        });

        await api.addCandidateToJob(selectedJob.id, {
          candidate_id: createdCandidate.id,
          job_match_score: jobScore,
          team_compatibility_score: teamScore,
        });
      } catch (error) {
        console.error("Failed to save candidate:", error);
      }
    }

    setMatchedResults(results);
    setErrors(errorMessages);
    setProcessingStatus("");
    setIsProcessing(false);
  }, [selectedJob, selectedFiles, selectedTeam]);

  const canMatch = selectedJob && selectedFiles.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600">
              <GitCompare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Resume Matcher</h1>
              <p className="text-sm text-slate-500">
                Parse resumes with AI and match against job requirements
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Select Job */}
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-600">
                1
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Select Job</h2>
            </div>
            <JobSelector
              jobs={jobs}
              selectedJobId={selectedJob?.id || null}
              onSelect={(job) => {
                setSelectedJob(job);
                setMatchedResults([]);
              }}
              isLoading={isLoadingJobs}
            />

            {selectedJob && selectedJob.requiredSkills.length > 0 && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.requiredSkills.map((skill, index) => {
                    const skillName = getSkillName(skill);
                    return (
                      <span
                        key={`${skillName}-${index}`}
                        className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                      >
                        {skillName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Step 2: Select Team */}
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-semibold text-violet-600">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Select Team</h2>
                  <p className="text-sm text-slate-500">Optional - for team compatibility scoring</p>
                </div>
              </div>
              <Link
                href="/dashboard/teams"
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Manage Teams
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            <TeamSelector
              teams={teams}
              selectedTeamId={selectedTeam?.id || null}
              onSelect={(team) => {
                setSelectedTeam(team);
                setMatchedResults([]);
              }}
              isLoading={isLoadingTeams}
            />

            {selectedTeam && selectedTeam.members.length > 0 && (
              <div className="mt-4">
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Team Members ({selectedTeam.members.length})
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedTeam.members.map((member) => (
                    <TeamMemberCard key={member.id} member={member} compact />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Step 3: Upload Resumes */}
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-600">
                3
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Upload Resumes</h2>
            </div>

            <FileUpload onFilesSelected={handleFilesSelected} isProcessing={isProcessing} />

            {selectedFiles.length > 0 && !isProcessing && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleMatchResumes}
                  disabled={!canMatch}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Parse & Match {selectedFiles.length} Resume{selectedFiles.length !== 1 ? "s" : ""}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Some files could not be parsed:</span>
              </div>
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Results */}
          {(matchedResults.length > 0 || isProcessing) && (
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">Parsed Candidates</h2>
                </div>
                {matchedResults.length > 0 && (
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                    {matchedResults.length} candidate{matchedResults.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {isProcessing ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
                  <p className="mt-4 font-medium text-slate-700">Processing resumes...</p>
                  <p className="mt-1 text-sm text-slate-500">{processingStatus}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchedResults.map(({ candidate, jobScore, teamScore, parsed }) => (
                    <div key={candidate.id} className="rounded-xl border border-slate-200 p-4">
                      <MatchedCandidateCard
                        candidate={candidate}
                        jobMatchScore={jobScore}
                        teamCompatibilityScore={teamScore}
                        onViewDetails={() => setSelectedCandidate(candidate)}
                      />

                      {/* Extracted Links */}
                      {(parsed.github_url || parsed.linkedin_url || parsed.website_url) && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-500 mb-2">Extracted Links</p>
                          <div className="flex flex-wrap gap-2">
                            {parsed.github_url && (
                              <a
                                href={parsed.github_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                              >
                                <Github className="h-3.5 w-3.5" />
                                GitHub
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {parsed.linkedin_url && (
                              <a
                                href={parsed.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                <Linkedin className="h-3.5 w-3.5" />
                                LinkedIn
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {parsed.website_url && (
                              <a
                                href={parsed.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                Portfolio
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}

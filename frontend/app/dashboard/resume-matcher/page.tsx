"use client";

import { useState, useCallback } from "react";
import {
  Briefcase,
  Users,
  Sparkles,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  Header,
  JobSelector,
  TeamSelector,
  FileUpload,
  MatchedCandidateCard,
  TeamMemberCard,
  CandidateDetailModal,
} from "../../components";
import { useJobsStorage } from "../../hooks/useJobsStorage";
import { useTeamsStorage } from "../../hooks/useTeamsStorage";
import type { Job, Team, TeamMember, Candidate, Skill } from "../../types";

// Mock candidate generation for demonstration
function generateMockCandidate(
  fileName: string,
  job: Job,
  teamMembers: TeamMember[]
): { candidate: Candidate; jobScore: number; teamScore: number } {
  const firstNames = [
    "Alex",
    "Jordan",
    "Taylor",
    "Morgan",
    "Casey",
    "Riley",
    "Avery",
    "Quinn",
  ];
  const lastNames = [
    "Chen",
    "Smith",
    "Johnson",
    "Williams",
    "Davis",
    "Martinez",
    "Anderson",
    "Wilson",
  ];

  const randomFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
  const randomLast = lastNames[Math.floor(Math.random() * lastNames.length)];

  const titles = [
    "Senior Software Engineer",
    "Full-Stack Developer",
    "Frontend Developer",
    "Backend Engineer",
    "Tech Lead",
    "Software Architect",
  ];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];

  // Generate skills based on job requirements with some variation
  const baseSkills = job.requiredSkills.slice(0, 4);
  const extraSkills = ["Git", "Agile", "CI/CD", "Testing", "Docker", "AWS"];
  const candidateSkillNames = [
    ...baseSkills.slice(0, Math.floor(Math.random() * baseSkills.length + 2)),
    ...extraSkills.slice(0, Math.floor(Math.random() * 3)),
  ];

  const skillLevels: Skill["level"][] = [
    "beginner",
    "intermediate",
    "advanced",
    "expert",
  ];
  const skills: Skill[] = candidateSkillNames.map((name) => ({
    name,
    level: skillLevels[Math.floor(Math.random() * skillLevels.length)],
  }));

  // Calculate job match score based on skill overlap
  const matchingSkills = job.requiredSkills.filter((s) =>
    candidateSkillNames.includes(s)
  );
  const jobScore = Math.min(
    95,
    Math.round(60 + (matchingSkills.length / job.requiredSkills.length) * 35)
  );

  // Calculate team compatibility score
  let teamScore = 75;
  if (teamMembers.length > 0) {
    const teamSkills = new Set(
      teamMembers.flatMap((m) => m.skills.map((s) => s.name))
    );
    const complementarySkills = candidateSkillNames.filter(
      (s) => !teamSkills.has(s)
    );
    const overlapSkills = candidateSkillNames.filter((s) => teamSkills.has(s));
    teamScore = Math.min(
      98,
      Math.round(70 + complementarySkills.length * 3 + overlapSkills.length * 2)
    );
  }

  const candidate: Candidate = {
    id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    name: `${randomFirst} ${randomLast}`,
    email: `${randomFirst.toLowerCase()}.${randomLast.toLowerCase()}@email.com`,
    title: randomTitle,
    skills,
    experience: [
      {
        title: randomTitle,
        company: "Tech Corp",
        duration: `${Math.floor(Math.random() * 5 + 1)} years`,
      },
    ],
    education: [
      {
        degree: "B.S. Computer Science",
        institution: "University",
        year: "2020",
      },
    ],
    links: {},
    talentFitScore: Math.round((jobScore + teamScore) / 2),
    scoreBreakdown: {
      skillsMatch: jobScore,
      experienceMatch: Math.round(70 + Math.random() * 25),
      workStyleAlignment: teamScore,
      teamFit: teamScore,
    },
    resumeFileName: fileName,
    uploadedAt: new Date(),
  };

  return { candidate, jobScore, teamScore };
}

export default function ResumeMatcherPage() {
  const { jobs, isLoading: isLoadingJobs } = useJobsStorage();
  const { teams, isLoading: isLoadingTeams } = useTeamsStorage();

  // Step state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedResults, setMatchedResults] = useState<
    { candidate: Candidate; jobScore: number; teamScore: number }[]
  >([]);

  // Modal states
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setMatchedResults([]); // Clear previous results when files change
  }, []);

  const handleMatchResumes = useCallback(async () => {
    if (!selectedJob || selectedFiles.length === 0) return;

    setIsProcessing(true);
    setMatchedResults([]);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate mock candidates for each file
    const teamMembers = selectedTeam?.members || [];
    const results = selectedFiles.map((file) =>
      generateMockCandidate(file.name, selectedJob, teamMembers)
    );

    // Sort by overall score (average of job and team)
    results.sort((a, b) => {
      const overallA = (a.jobScore + a.teamScore) / 2;
      const overallB = (b.jobScore + b.teamScore) / 2;
      return overallB - overallA;
    });

    setMatchedResults(results);
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
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Resume Matcher
              </h1>
              <p className="text-sm text-slate-500">
                Match candidates against job requirements and team compatibility
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1: Select Job */}
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-600">
                1
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Select Job
              </h2>
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
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Required Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      {skill}
                    </span>
                  ))}
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
                  <h2 className="text-lg font-semibold text-slate-900">
                    Select Team
                  </h2>
                  <p className="text-sm text-slate-500">
                    Which team will this person join? (Optional)
                  </p>
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

            {/* Show selected team members */}
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
              <h2 className="text-lg font-semibold text-slate-900">
                Upload Resumes
              </h2>
            </div>

            <FileUpload
              onFilesSelected={handleFilesSelected}
              isProcessing={isProcessing}
            />

            {selectedFiles.length > 0 && !isProcessing && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleMatchResumes}
                  disabled={!canMatch}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Match {selectedFiles.length} Resume
                  {selectedFiles.length !== 1 ? "s" : ""}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          {/* Results */}
          {(matchedResults.length > 0 || isProcessing) && (
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Matched Candidates
                  </h2>
                </div>
                {matchedResults.length > 0 && (
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                    {matchedResults.length} candidate
                    {matchedResults.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {isProcessing ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
                  <p className="mt-4 font-medium text-slate-700">
                    Analyzing resumes...
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Extracting skills and calculating match scores
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchedResults.map(({ candidate, jobScore, teamScore }) => (
                    <MatchedCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      jobMatchScore={jobScore}
                      teamCompatibilityScore={teamScore}
                      onViewDetails={() => setSelectedCandidate(candidate)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}

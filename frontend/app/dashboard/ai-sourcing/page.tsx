"use client";

import { useState, useCallback } from "react";
import {
  Briefcase,
  Users,
  Sparkles,
  Radar,
  Loader2,
  ExternalLink,
  Linkedin,
  Github,
  Globe,
  Check,
} from "lucide-react";
import { api } from "../../lib/api";
import Link from "next/link";
import {
  Header,
  JobSelector,
  TeamSelector,
  MatchedCandidateCard,
  TeamMemberCard,
  CandidateDetailModal,
} from "../../components";
import { useJobs } from "../../hooks/useJobs";
import { useTeams } from "../../hooks/useTeams";
import type { Job, Team, TeamMember, Candidate, Skill } from "../../types";
import { getSkillName } from "../../types";

type SourceType = "linkedin" | "github" | "portfolio";

const sourceConfig: Record<SourceType, { label: string; icon: typeof Linkedin; color: string }> = {
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-blue-600 bg-blue-50" },
  github: { label: "GitHub", icon: Github, color: "text-slate-800 bg-slate-100" },
  portfolio: { label: "Portfolio", icon: Globe, color: "text-emerald-600 bg-emerald-50" },
};

// Names by source type for more realistic profiles
const namesBySource: Record<SourceType, { first: string[]; last: string[] }> = {
  linkedin: {
    first: ["Michael", "Sarah", "David", "Jennifer", "Robert", "Emily", "James", "Amanda"],
    last: ["Thompson", "Martinez", "Anderson", "Williams", "Johnson", "Brown", "Davis", "Wilson"],
  },
  github: {
    first: ["Alex", "Jordan", "Sam", "Chris", "Taylor", "Morgan", "Casey", "Riley"],
    last: ["Chen", "Kumar", "Nakamura", "Schmidt", "Petrov", "Santos", "Kim", "Patel"],
  },
  portfolio: {
    first: ["Luna", "Felix", "Maya", "Leo", "Aria", "Kai", "Nova", "River"],
    last: ["Rivera", "Foster", "Hayes", "Brooks", "Reed", "Cole", "Lane", "Stone"],
  },
};

const titlesBySource: Record<SourceType, string[]> = {
  linkedin: [
    "Senior Software Engineer",
    "Engineering Manager",
    "Technical Lead",
    "Principal Engineer",
    "Staff Engineer",
    "Director of Engineering",
  ],
  github: [
    "Full-Stack Developer",
    "Open Source Contributor",
    "DevOps Engineer",
    "Backend Developer",
    "Systems Programmer",
    "Platform Engineer",
  ],
  portfolio: [
    "Creative Developer",
    "UI/UX Engineer",
    "Frontend Developer",
    "Design Engineer",
    "Product Designer",
    "Interaction Designer",
  ],
};

const extraSkillsBySource: Record<SourceType, string[]> = {
  linkedin: ["Leadership", "Agile", "Scrum", "Project Management", "Stakeholder Management"],
  github: ["Git", "CI/CD", "Docker", "Kubernetes", "Linux", "Open Source"],
  portfolio: ["Figma", "Design Systems", "Animation", "Prototyping", "User Research"],
};

function generateSourcedCandidate(
  job: Job,
  teamMembers: TeamMember[],
  source: SourceType
): { candidate: Candidate; jobScore: number; teamScore: number; source: SourceType } {
  const names = namesBySource[source];
  const randomFirst = names.first[Math.floor(Math.random() * names.first.length)];
  const randomLast = names.last[Math.floor(Math.random() * names.last.length)];

  const titles = titlesBySource[source];
  const randomTitle = titles[Math.floor(Math.random() * titles.length)];

  // Generate skills based on job requirements with source-specific extras
  const baseSkills = job.requiredSkills.slice(0, 4).map(getSkillName);
  const extraSkills = extraSkillsBySource[source];
  const candidateSkillNames: string[] = [
    ...baseSkills.slice(0, Math.floor(Math.random() * baseSkills.length + 2)),
    ...extraSkills.slice(0, Math.floor(Math.random() * 3) + 1),
  ];

  const skillLevels: Skill["level"][] = ["beginner", "intermediate", "advanced", "expert"];
  const skills: Skill[] = candidateSkillNames.map((name) => ({
    name,
    level: skillLevels[Math.floor(Math.random() * skillLevels.length)],
  }));

  // Calculate job match score
  const jobSkillNames = job.requiredSkills.map(getSkillName);
  const matchingSkills = jobSkillNames.filter((s) =>
    candidateSkillNames.includes(s)
  );
  const jobScore = Math.min(
    95,
    Math.round(60 + (matchingSkills.length / Math.max(job.requiredSkills.length, 1)) * 35)
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

  const companies: Record<SourceType, string[]> = {
    linkedin: ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix"],
    github: ["Vercel", "Supabase", "Stripe", "GitHub", "GitLab", "Hashicorp"],
    portfolio: ["IDEO", "Figma", "Framer", "Webflow", "Squarespace", "Canva"],
  };

  const candidate: Candidate = {
    id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    name: `${randomFirst} ${randomLast}`,
    email: `${randomFirst.toLowerCase()}.${randomLast.toLowerCase()}@email.com`,
    title: randomTitle,
    skills,
    experience: [
      {
        title: randomTitle,
        company: companies[source][Math.floor(Math.random() * companies[source].length)],
        duration: `${Math.floor(Math.random() * 5 + 1)} years`,
      },
    ],
    education: [
      {
        degree: source === "portfolio" ? "B.A. Design" : "B.S. Computer Science",
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
    uploadedAt: new Date(),
  };

  return { candidate, jobScore, teamScore, source };
}

export default function AISourcingPage() {
  const { jobs, isLoading: isLoadingJobs } = useJobs();
  const { teams, isLoading: isLoadingTeams } = useTeams();

  // Selection state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Sourcing options
  const [candidateCount, setCandidateCount] = useState<number>(10);
  const [sources, setSources] = useState<SourceType[]>(["linkedin", "github"]);

  // Results state
  const [isSearching, setIsSearching] = useState(false);
  const [sourcedResults, setSourcedResults] = useState<
    { candidate: Candidate; jobScore: number; teamScore: number; source: SourceType }[]
  >([]);

  // Modal state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const toggleSource = useCallback((source: SourceType) => {
    setSources((prev) => {
      if (prev.includes(source)) {
        return prev.filter((s) => s !== source);
      }
      return [...prev, source];
    });
  }, []);

  const handleStartSourcing = useCallback(async () => {
    if (!selectedJob || sources.length === 0) return;

    setIsSearching(true);
    setSourcedResults([]);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Generate candidates from selected sources
    const teamMembers = selectedTeam?.members || [];
    const results: typeof sourcedResults = [];

    // Distribute candidates across sources
    const candidatesPerSource = Math.ceil(candidateCount / sources.length);

    for (const source of sources) {
      const count = Math.min(candidatesPerSource, candidateCount - results.length);
      for (let i = 0; i < count; i++) {
        results.push(generateSourcedCandidate(selectedJob, teamMembers, source));
      }
    }

    // Sort by overall score
    results.sort((a, b) => {
      const overallA = (a.jobScore + a.teamScore) / 2;
      const overallB = (b.jobScore + b.teamScore) / 2;
      return overallB - overallA;
    });

    // Automatically save all candidates to the database and link to job
    for (const { candidate, jobScore, teamScore } of results) {
      try {
        const createdCandidate = await api.createCandidate({
          name: candidate.name,
          email: candidate.email || undefined,
          title: candidate.title,
          location: undefined,
          skills: candidate.skills.map((s) => ({ name: s.name, level: s.level })),
          experience: candidate.experience.map((e) => ({
            title: e.title,
            company: e.company,
            duration: e.duration,
            description: undefined,
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
          source: "ai_sourcing",
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

    setSourcedResults(results);
    setIsSearching(false);
  }, [selectedJob, selectedTeam, candidateCount, sources]);

  const canSearch = selectedJob && sources.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600">
              <Radar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                AI Talent Sourcing
              </h1>
              <p className="text-sm text-slate-500">
                Let AI find the best candidates for your role
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1: Select Job */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-600">
                1
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Select Job
                </h2>
                <p className="text-sm text-slate-500">
                  Which role are you hiring for?
                </p>
              </div>
            </div>
            <JobSelector
              jobs={jobs}
              selectedJobId={selectedJob?.id || null}
              onSelect={(job) => {
                setSelectedJob(job);
                setSourcedResults([]);
              }}
              isLoading={isLoadingJobs}
            />

            {selectedJob && selectedJob.requiredSkills.length > 0 && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Required Skills
                </p>
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
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-semibold text-violet-600">
                  2
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Select Team
                  </h2>
                  <p className="text-sm text-slate-500">
                    Which team will they join? (Optional)
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
                setSourcedResults([]);
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

          {/* Step 3: Sourcing Options */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-600">
                3
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Sourcing Options
                </h2>
                <p className="text-sm text-slate-500">
                  Configure your search criteria
                </p>
              </div>
            </div>

            {/* Candidate Count */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                How many candidates?
              </label>
              <div className="flex gap-2">
                {[5, 10, 20].map((count) => (
                  <button
                    key={count}
                    onClick={() => setCandidateCount(count)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      candidateCount === count
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search from
              </label>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(sourceConfig) as SourceType[]).map((source) => {
                  const config = sourceConfig[source];
                  const Icon = config.icon;
                  const isSelected = sources.includes(source);

                  return (
                    <button
                      key={source}
                      onClick={() => toggleSource(source)}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-2 border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {config.label}
                      {isSelected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-center">
              <button
                onClick={handleStartSourcing}
                disabled={!canSearch || isSearching}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Radar className="h-4 w-4" />
                    Start Sourcing
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Results */}
          {(sourcedResults.length > 0 || isSearching) && (
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Sourced Candidates
                  </h2>
                </div>
                {sourcedResults.length > 0 && (
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                    {sourcedResults.length} found
                  </span>
                )}
              </div>

              {isSearching ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
                  <p className="mt-4 font-medium text-slate-700">
                    Searching for candidates...
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Finding talent across {sources.map((s) => sourceConfig[s].label).join(", ")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sourcedResults.map(({ candidate, jobScore, teamScore, source }) => {
                    const config = sourceConfig[source];
                    const Icon = config.icon;

                    return (
                      <div key={candidate.id} className="relative">
                        <MatchedCandidateCard
                          candidate={candidate}
                          jobMatchScore={jobScore}
                          teamCompatibilityScore={teamScore}
                          onViewDetails={() => setSelectedCandidate(candidate)}
                        />
                        {/* Source Badge */}
                        <div
                          className={`absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {config.label}
                        </div>
                      </div>
                    );
                  })}
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

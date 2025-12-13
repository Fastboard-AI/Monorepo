"use client";

import { useState, useCallback } from "react";
import {
  Briefcase,
  Users,
  Upload,
  Sparkles,
  Plus,
  ChevronRight,
  X,
  UserPlus,
  Loader2,
} from "lucide-react";
import {
  Header,
  JobSelector,
  FileUpload,
  MatchedCandidateCard,
  TeamMemberCard,
  CandidateDetailModal,
} from "../../components";
import { useJobsStorage } from "../../hooks/useJobsStorage";
import type {
  Job,
  TeamMember,
  Candidate,
  Skill,
  ExperienceLevel,
  WorkStyle,
} from "../../types";

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
    const teamSkills = new Set(teamMembers.flatMap((m) => m.skills.map((s) => s.name)));
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

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Principal" },
];

const SKILL_LEVELS: Skill["level"][] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

export default function ResumeMatcherPage() {
  const { jobs, isLoading: isLoadingJobs } = useJobsStorage();

  // Step state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedResults, setMatchedResults] = useState<
    { candidate: Candidate; jobScore: number; teamScore: number }[]
  >([]);

  // Modal states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );

  // Add member form state
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberExpLevel, setMemberExpLevel] = useState<ExperienceLevel>("mid");
  const [memberSkills, setMemberSkills] = useState<Skill[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] =
    useState<Skill["level"]>("intermediate");
  const [memberWorkStyle, setMemberWorkStyle] = useState<WorkStyle>({
    communication: "mixed",
    collaboration: "balanced",
    pace: "flexible",
  });

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
  }, [selectedJob, selectedFiles, teamMembers]);

  const handleAddMember = useCallback(() => {
    if (!memberName.trim() || !memberRole.trim()) return;

    const newMember: TeamMember = {
      id: Math.random().toString(36).substring(2, 9),
      name: memberName.trim(),
      role: memberRole.trim(),
      skills: memberSkills,
      experienceLevel: memberExpLevel,
      workStyle: memberWorkStyle,
    };

    setTeamMembers((prev) => [...prev, newMember]);

    // Reset form
    setMemberName("");
    setMemberRole("");
    setMemberExpLevel("mid");
    setMemberSkills([]);
    setNewSkillName("");
    setNewSkillLevel("intermediate");
    setMemberWorkStyle({
      communication: "mixed",
      collaboration: "balanced",
      pace: "flexible",
    });
    setShowAddMemberModal(false);
    setMatchedResults([]); // Clear results when team changes
  }, [memberName, memberRole, memberSkills, memberExpLevel, memberWorkStyle]);

  const handleRemoveMember = useCallback((memberId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
    setMatchedResults([]); // Clear results when team changes
  }, []);

  const handleAddSkill = useCallback(() => {
    if (!newSkillName.trim()) return;
    if (
      memberSkills.some(
        (s) => s.name.toLowerCase() === newSkillName.toLowerCase()
      )
    )
      return;

    setMemberSkills((prev) => [
      ...prev,
      { name: newSkillName.trim(), level: newSkillLevel },
    ]);
    setNewSkillName("");
    setNewSkillLevel("intermediate");
  }, [newSkillName, newSkillLevel, memberSkills]);

  const handleRemoveSkill = useCallback((skillName: string) => {
    setMemberSkills((prev) => prev.filter((s) => s.name !== skillName));
  }, []);

  const canMatch = selectedJob && selectedFiles.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Resume Matcher
              </h1>
              <p className="text-slate-500">
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

          {/* Step 2: Define Team */}
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-semibold text-violet-600">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Define Team
                  </h2>
                  <p className="text-sm text-slate-500">
                    Who will this person work with? (Optional)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            </div>

            {teamMembers.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 font-medium text-slate-500">
                  No team members yet
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Add existing employees to calculate team compatibility
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {teamMembers.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    onRemove={() => handleRemoveMember(member.id)}
                  />
                ))}
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
                  className="btn-lift flex items-center gap-2 rounded-full gradient-bg px-8 py-3 text-base font-semibold text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-5 w-5" />
                  Match {selectedFiles.length} Resume
                  {selectedFiles.length !== 1 ? "s" : ""}
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </section>

          {/* Results */}
          {(matchedResults.length > 0 || isProcessing) && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
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

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowAddMemberModal(false)}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Add Team Member
                  </h2>
                  <p className="text-sm text-slate-500">
                    Add an existing employee for compatibility matching
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {/* Name */}
              <div>
                <label
                  htmlFor="member-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="member-name"
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g., Sarah Chen"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                />
              </div>

              {/* Role */}
              <div>
                <label
                  htmlFor="member-role"
                  className="block text-sm font-medium text-slate-700"
                >
                  Current Role <span className="text-red-500">*</span>
                </label>
                <input
                  id="member-role"
                  type="text"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  placeholder="e.g., Senior Frontend Developer"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Experience Level */}
              <div>
                <label
                  htmlFor="experience-level"
                  className="block text-sm font-medium text-slate-700"
                >
                  Experience Level
                </label>
                <select
                  id="experience-level"
                  value={memberExpLevel}
                  onChange={(e) =>
                    setMemberExpLevel(e.target.value as ExperienceLevel)
                  }
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
                <label className="block text-sm font-medium text-slate-700">
                  Skills
                </label>
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
                    onChange={(e) =>
                      setNewSkillLevel(e.target.value as Skill["level"])
                    }
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
                {memberSkills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {memberSkills.map((skill) => (
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
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-medium text-slate-700">
                  Work Style Preferences
                </h3>

                <div>
                  <label
                    htmlFor="communication"
                    className="block text-xs font-medium text-slate-600"
                  >
                    Communication Style
                  </label>
                  <select
                    id="communication"
                    value={memberWorkStyle.communication}
                    onChange={(e) =>
                      setMemberWorkStyle((prev) => ({
                        ...prev,
                        communication: e.target
                          .value as WorkStyle["communication"],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="async">Async (email, messages)</option>
                    <option value="sync">Sync (calls, meetings)</option>
                    <option value="mixed">Mixed (flexible)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="collaboration"
                    className="block text-xs font-medium text-slate-600"
                  >
                    Collaboration Style
                  </label>
                  <select
                    id="collaboration"
                    value={memberWorkStyle.collaboration}
                    onChange={(e) =>
                      setMemberWorkStyle((prev) => ({
                        ...prev,
                        collaboration: e.target
                          .value as WorkStyle["collaboration"],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="independent">Independent (solo work)</option>
                    <option value="collaborative">
                      Collaborative (pair/team work)
                    </option>
                    <option value="balanced">Balanced (mix of both)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="pace"
                    className="block text-xs font-medium text-slate-600"
                  >
                    Work Pace
                  </label>
                  <select
                    id="pace"
                    value={memberWorkStyle.pace}
                    onChange={(e) =>
                      setMemberWorkStyle((prev) => ({
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
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!memberName.trim() || !memberRole.trim()}
                className="btn-lift flex items-center gap-2 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}

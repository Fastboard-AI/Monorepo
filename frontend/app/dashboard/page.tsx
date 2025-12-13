"use client";

import { useMemo } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Sparkles,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Target,
  FileText,
  Zap,
} from "lucide-react";

import { Header } from "../components";
import { useJobsStorage } from "../hooks/useJobsStorage";
import { useTeamsStorage } from "../hooks/useTeamsStorage";
import { mockCandidates } from "../data/mockCandidates";

const statusColors: Record<string, string> = {
  sourcing: "bg-indigo-100 text-indigo-700",
  reviewing: "bg-amber-100 text-amber-700",
  filled: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
};

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { jobs, isLoading: jobsLoading } = useJobsStorage();
  const { teams, isLoading: teamsLoading } = useTeamsStorage();

  // Calculate stats
  const stats = useMemo(() => {
    const activeJobs = jobs.filter(
      (j) => j.status === "sourcing" || j.status === "reviewing"
    ).length;
    const totalCandidates = jobs.reduce(
      (sum, j) => sum + j.candidateIds.length,
      0
    );
    const totalTeamMembers = teams.reduce(
      (sum, t) => sum + t.members.length,
      0
    );
    const avgTeamScore =
      teams.length > 0
        ? Math.round(
            teams.reduce((sum, t) => sum + t.compatibilityScore, 0) /
              teams.length
          )
        : 0;

    return {
      totalJobs: jobs.length,
      activeJobs,
      totalTeams: teams.length,
      totalCandidates,
      totalTeamMembers,
      avgTeamScore,
    };
  }, [jobs, teams]);

  // Recent jobs (last 5)
  const recentJobs = useMemo(() => {
    return [...jobs]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);
  }, [jobs]);

  // Recent teams (last 3)
  const recentTeams = useMemo(() => {
    return [...teams]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 3);
  }, [teams]);

  if (!isLoaded || jobsLoading || teamsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome to <span className="gradient-text">FastboardAI</span>
          </h1>
          <p className="mt-2 text-slate-600">
            Build your dream team with AI-powered candidate matching.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-lift rounded-xl border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Jobs</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stats.activeJobs}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {stats.totalJobs} total
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                <Briefcase className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Teams</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stats.totalTeams}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {stats.totalTeamMembers} members
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
                <Users className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Candidates</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stats.totalCandidates}
                </p>
                <p className="mt-1 text-xs text-slate-400">sourced for jobs</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Team Score</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stats.avgTeamScore}%
                </p>
                <p className="mt-1 text-xs text-slate-400">compatibility</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <Target className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/dashboard/jobs"
              className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-card transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Create Job</p>
                <p className="text-sm text-slate-500">Post a new position</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
            </Link>

            <Link
              href="/dashboard/resume-matcher"
              className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-card transition-all hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Match Resumes</p>
                <p className="text-sm text-slate-500">AI-powered matching</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-violet-500" />
            </Link>

            <Link
              href="/dashboard/teams"
              className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-card transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Manage Teams</p>
                <p className="text-sm text-slate-500">Build your team</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Jobs */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Jobs
              </h2>
              <Link
                href="/dashboard/jobs"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-medium text-slate-600">No jobs yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first job to start hiring
                </p>
                <Link
                  href="/dashboard/jobs"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Job
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/jobs/${job.id}`}
                    className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-card transition-all hover:border-slate-200 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <Briefcase className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">
                          {job.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[job.status]
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {job.candidateIds.length} candidates
                        </span>
                        {job.requiredSkills.length > 0 && (
                          <span className="truncate">
                            {job.requiredSkills.slice(0, 2).join(", ")}
                            {job.requiredSkills.length > 2 && "..."}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Teams Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Teams</h2>
              <Link
                href="/dashboard/teams"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all
              </Link>
            </div>

            {recentTeams.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 font-medium text-slate-600">No teams yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create a team to organize your hiring
                </p>
                <Link
                  href="/dashboard/teams"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Team
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTeams.map((team) => (
                  <Link
                    key={team.id}
                    href="/dashboard/teams"
                    className="group block rounded-xl border border-slate-100 bg-white p-4 shadow-card transition-all hover:border-slate-200 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{team.name}</p>
                      <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <TrendingUp className="h-3 w-3" />
                        {team.compatibilityScore}%
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      {team.members.length} member
                      {team.members.length !== 1 ? "s" : ""}
                      {team.targetRole && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="truncate">{team.targetRole}</span>
                        </>
                      )}
                    </div>
                    {team.members.length > 0 && (
                      <div className="mt-2 flex -space-x-2">
                        {team.members.slice(0, 4).map((member) => (
                          <div
                            key={member.id}
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-violet-400 text-xs font-medium text-white"
                            title={member.name}
                          >
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                        ))}
                        {team.members.length > 4 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-medium text-slate-600">
                            +{team.members.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* Getting Started Card */}
            <div className="mt-6 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Pro Tip</p>
                  <p className="text-sm text-indigo-100">
                    Use Resume Matcher for bulk candidate screening
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/resume-matcher"
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/30"
              >
                <Sparkles className="h-4 w-4" />
                Try Resume Matcher
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

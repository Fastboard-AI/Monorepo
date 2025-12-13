import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Zap, Users, Target, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 opacity-50 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-gradient-to-br from-violet-200 to-indigo-200 opacity-40 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              Fastboard<span className="gradient-text">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <SignedIn>
              <Link
                href="/dashboard"
                className="btn-lift rounded-full gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-button"
              >
                Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="btn-lift rounded-full gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-button">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Zap className="h-4 w-4" />
              AI-Powered Team Matching
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Build Your Dream Team{" "}
              <span className="gradient-text">in Minutes</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600 leading-relaxed">
              Upload resumes, analyze candidates with AI-powered insights, and
              find the perfect team composition for your startup. No more
              guesswork.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="btn-lift flex items-center gap-2 rounded-full gradient-bg px-8 py-4 text-base font-semibold text-white shadow-button"
                >
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </SignedIn>
              <SignedOut>
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="btn-lift flex items-center gap-2 rounded-full gradient-bg px-8 py-4 text-base font-semibold text-white shadow-button">
                    Start Matching
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </SignUpButton>
              </SignedOut>
              <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                Watch Demo
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything You Need to{" "}
              <span className="gradient-text">Hire Smart</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Our platform combines resume parsing, skill matching, and team
              analytics to help you make data-driven hiring decisions.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-lift rounded-2xl border border-slate-100 bg-white p-8 shadow-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50">
                <Target className="h-7 w-7 text-indigo-600" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                TalentFit Score
              </h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                AI-calculated scores that measure skills match, experience
                alignment, and cultural fit for each candidate.
              </p>
            </div>

            <div className="card-lift rounded-2xl border border-slate-100 bg-white p-8 shadow-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-50">
                <Users className="h-7 w-7 text-violet-600" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                Team Compatibility
              </h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Drag and drop candidates to experiment with different team
                compositions and see compatibility scores update in real-time.
              </p>
            </div>

            <div className="card-lift rounded-2xl border border-slate-100 bg-white p-8 shadow-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                Visual Analytics
              </h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Beautiful radar charts and score breakdowns help you understand
                each candidate&apos;s strengths at a glance.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 to-indigo-950 p-12 text-center lg:p-20">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to Build Your Dream Team?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-indigo-200">
              Join hundreds of startups using FastboardAI to make smarter hiring
              decisions and build high-performing teams.
            </p>
            <SignedIn>
              <Link
                href="/dashboard"
                className="btn-lift mt-8 inline-block rounded-full bg-white px-8 py-4 text-base font-semibold text-indigo-900 shadow-lg transition-all hover:bg-slate-50"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="btn-lift mt-8 rounded-full bg-white px-8 py-4 text-base font-semibold text-indigo-900 shadow-lg transition-all hover:bg-slate-50">
                  Get Started Free
                </button>
              </SignUpButton>
            </SignedOut>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-slate-900">FastboardAI</span>
              </div>
              <p className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} FastboardAI. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

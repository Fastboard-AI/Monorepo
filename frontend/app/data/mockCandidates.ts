import type { Candidate } from "../types";

export const mockCandidates: Candidate[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@email.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    title: "Senior Full-Stack Developer",
    summary: "Experienced full-stack developer with 7+ years building scalable web applications. Passionate about clean code and user experience.",
    skills: [
      { name: "React", level: "expert", yearsOfExperience: 5 },
      { name: "TypeScript", level: "expert", yearsOfExperience: 4 },
      { name: "Node.js", level: "advanced", yearsOfExperience: 6 },
      { name: "PostgreSQL", level: "advanced", yearsOfExperience: 5 },
      { name: "AWS", level: "intermediate", yearsOfExperience: 3 },
      { name: "GraphQL", level: "advanced", yearsOfExperience: 3 },
    ],
    experience: [
      {
        title: "Senior Software Engineer",
        company: "TechCorp Inc.",
        duration: "2021 - Present",
        description: "Leading frontend architecture and mentoring junior developers.",
      },
      {
        title: "Full-Stack Developer",
        company: "StartupXYZ",
        duration: "2018 - 2021",
        description: "Built core product features from scratch to 1M+ users.",
      },
    ],
    education: [
      {
        degree: "M.S. Computer Science",
        institution: "Stanford University",
        year: "2018",
        field: "Artificial Intelligence",
      },
    ],
    links: {
      github: "https://github.com/sarahchen",
      linkedin: "https://linkedin.com/in/sarahchen",
      portfolio: "https://sarahchen.dev",
    },
    talentFitScore: 92,
    scoreBreakdown: {
      skillsMatch: 95,
      experienceMatch: 90,
      workStyleAlignment: 88,
      teamFit: 94,
    },
    resumeFileName: "sarah_chen_resume.pdf",
    uploadedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Marcus Johnson",
    email: "marcus.j@email.com",
    location: "New York, NY",
    title: "Backend Engineer",
    summary: "Backend specialist focused on distributed systems and high-performance APIs. Love solving complex problems at scale.",
    skills: [
      { name: "Python", level: "expert", yearsOfExperience: 8 },
      { name: "Go", level: "advanced", yearsOfExperience: 4 },
      { name: "Kubernetes", level: "advanced", yearsOfExperience: 3 },
      { name: "Redis", level: "expert", yearsOfExperience: 5 },
      { name: "MongoDB", level: "intermediate", yearsOfExperience: 4 },
    ],
    experience: [
      {
        title: "Staff Backend Engineer",
        company: "FinTech Solutions",
        duration: "2020 - Present",
        description: "Architecting payment processing systems handling $1B+ annually.",
      },
      {
        title: "Backend Developer",
        company: "DataStream",
        duration: "2016 - 2020",
        description: "Built real-time data pipelines processing 10M events/day.",
      },
    ],
    education: [
      {
        degree: "B.S. Computer Engineering",
        institution: "MIT",
        year: "2016",
      },
    ],
    links: {
      github: "https://github.com/marcusj",
      linkedin: "https://linkedin.com/in/marcusjohnson",
    },
    talentFitScore: 87,
    scoreBreakdown: {
      skillsMatch: 88,
      experienceMatch: 92,
      workStyleAlignment: 82,
      teamFit: 85,
    },
    resumeFileName: "marcus_johnson_cv.pdf",
    uploadedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    location: "Austin, TX",
    title: "Product Designer & Frontend Dev",
    summary: "Hybrid designer-developer bridging the gap between design and code. Creating beautiful, accessible experiences.",
    skills: [
      { name: "Figma", level: "expert", yearsOfExperience: 6 },
      { name: "React", level: "advanced", yearsOfExperience: 4 },
      { name: "CSS/Tailwind", level: "expert", yearsOfExperience: 5 },
      { name: "User Research", level: "advanced", yearsOfExperience: 4 },
      { name: "Framer Motion", level: "intermediate", yearsOfExperience: 2 },
    ],
    experience: [
      {
        title: "Senior Product Designer",
        company: "DesignStudio Pro",
        duration: "2022 - Present",
        description: "Leading design system creation and frontend implementation.",
      },
      {
        title: "UI/UX Designer",
        company: "Creative Agency",
        duration: "2019 - 2022",
        description: "Designed and prototyped mobile apps for Fortune 500 clients.",
      },
    ],
    education: [
      {
        degree: "B.F.A. Graphic Design",
        institution: "RISD",
        year: "2019",
      },
    ],
    links: {
      linkedin: "https://linkedin.com/in/emilyrodriguez",
      portfolio: "https://emilyrodriguez.design",
    },
    talentFitScore: 85,
    scoreBreakdown: {
      skillsMatch: 82,
      experienceMatch: 85,
      workStyleAlignment: 90,
      teamFit: 84,
    },
    resumeFileName: "emily_rodriguez_portfolio.pdf",
    uploadedAt: new Date("2024-01-13"),
  },
  {
    id: "4",
    name: "David Kim",
    email: "d.kim@email.com",
    location: "Seattle, WA",
    title: "DevOps Engineer",
    summary: "Infrastructure specialist with a passion for automation and reliability. Building systems that scale.",
    skills: [
      { name: "Docker", level: "expert", yearsOfExperience: 6 },
      { name: "Terraform", level: "expert", yearsOfExperience: 4 },
      { name: "AWS", level: "expert", yearsOfExperience: 7 },
      { name: "CI/CD", level: "advanced", yearsOfExperience: 5 },
      { name: "Python", level: "intermediate", yearsOfExperience: 3 },
      { name: "Prometheus", level: "advanced", yearsOfExperience: 3 },
    ],
    experience: [
      {
        title: "Senior DevOps Engineer",
        company: "CloudScale",
        duration: "2021 - Present",
        description: "Managing infrastructure serving 50M+ daily active users.",
      },
      {
        title: "Site Reliability Engineer",
        company: "BigTech Corp",
        duration: "2018 - 2021",
        description: "Reduced deployment time by 80% through automation.",
      },
    ],
    education: [
      {
        degree: "B.S. Information Systems",
        institution: "University of Washington",
        year: "2018",
      },
    ],
    links: {
      github: "https://github.com/davidkim",
      linkedin: "https://linkedin.com/in/davidkim",
    },
    talentFitScore: 79,
    scoreBreakdown: {
      skillsMatch: 85,
      experienceMatch: 82,
      workStyleAlignment: 72,
      teamFit: 76,
    },
    resumeFileName: "david_kim_resume.docx",
    uploadedAt: new Date("2024-01-12"),
  },
  {
    id: "5",
    name: "Aisha Patel",
    email: "aisha.p@email.com",
    location: "Boston, MA",
    title: "Machine Learning Engineer",
    summary: "ML engineer specializing in NLP and computer vision. Turning research into production-ready systems.",
    skills: [
      { name: "Python", level: "expert", yearsOfExperience: 6 },
      { name: "PyTorch", level: "expert", yearsOfExperience: 4 },
      { name: "TensorFlow", level: "advanced", yearsOfExperience: 3 },
      { name: "NLP", level: "expert", yearsOfExperience: 5 },
      { name: "MLOps", level: "intermediate", yearsOfExperience: 2 },
      { name: "SQL", level: "advanced", yearsOfExperience: 4 },
    ],
    experience: [
      {
        title: "ML Engineer",
        company: "AI Research Labs",
        duration: "2022 - Present",
        description: "Developing state-of-the-art NLP models for enterprise applications.",
      },
      {
        title: "Data Scientist",
        company: "Analytics Inc.",
        duration: "2019 - 2022",
        description: "Built recommendation systems improving engagement by 40%.",
      },
    ],
    education: [
      {
        degree: "Ph.D. Computer Science",
        institution: "Harvard University",
        year: "2019",
        field: "Machine Learning",
      },
    ],
    links: {
      github: "https://github.com/aishapatel",
      linkedin: "https://linkedin.com/in/aishapatel",
      portfolio: "https://aishapatel.ai",
    },
    talentFitScore: 94,
    scoreBreakdown: {
      skillsMatch: 96,
      experienceMatch: 94,
      workStyleAlignment: 91,
      teamFit: 95,
    },
    resumeFileName: "aisha_patel_cv.pdf",
    uploadedAt: new Date("2024-01-11"),
  },
  {
    id: "6",
    name: "James Wilson",
    email: "james.w@email.com",
    location: "Denver, CO",
    title: "iOS Developer",
    summary: "Mobile-first developer with deep expertise in Swift and iOS ecosystem. Building apps users love.",
    skills: [
      { name: "Swift", level: "expert", yearsOfExperience: 7 },
      { name: "SwiftUI", level: "advanced", yearsOfExperience: 3 },
      { name: "UIKit", level: "expert", yearsOfExperience: 6 },
      { name: "Core Data", level: "advanced", yearsOfExperience: 5 },
      { name: "Combine", level: "intermediate", yearsOfExperience: 2 },
    ],
    experience: [
      {
        title: "Senior iOS Developer",
        company: "MobileFirst",
        duration: "2020 - Present",
        description: "Led development of apps with 5M+ downloads.",
      },
      {
        title: "iOS Developer",
        company: "AppWorks",
        duration: "2017 - 2020",
        description: "Shipped 12 apps for various startups and enterprises.",
      },
    ],
    education: [
      {
        degree: "B.S. Software Engineering",
        institution: "CU Boulder",
        year: "2017",
      },
    ],
    links: {
      github: "https://github.com/jameswilson",
      linkedin: "https://linkedin.com/in/jameswilson",
    },
    talentFitScore: 72,
    scoreBreakdown: {
      skillsMatch: 68,
      experienceMatch: 78,
      workStyleAlignment: 75,
      teamFit: 68,
    },
    resumeFileName: "james_wilson_resume.pdf",
    uploadedAt: new Date("2024-01-10"),
  },
];

export const getAllSkills = (candidates: Candidate[]): string[] => {
  const skillSet = new Set<string>();
  candidates.forEach((candidate) => {
    candidate.skills.forEach((skill) => {
      skillSet.add(skill.name);
    });
  });
  return Array.from(skillSet).sort();
};

export const calculateTeamCompatibility = (candidates: Candidate[]): number => {
  if (candidates.length === 0) return 0;
  if (candidates.length === 1) return candidates[0].talentFitScore;

  const avgScore =
    candidates.reduce((sum, c) => sum + c.talentFitScore, 0) / candidates.length;

  const allSkills = candidates.flatMap((c) => c.skills.map((s) => s.name));
  const uniqueSkills = new Set(allSkills);
  const skillDiversity = (uniqueSkills.size / allSkills.length) * 100;

  const avgTeamFit =
    candidates.reduce((sum, c) => sum + c.scoreBreakdown.teamFit, 0) /
    candidates.length;

  return Math.round((avgScore * 0.4 + skillDiversity * 0.3 + avgTeamFit * 0.3));
};

import { JobStatus, EmploymentType, ExperienceLevel, InterviewType } from '@talent-net/types';

export const MOCK_JOBS = [
  {
    id: '1',
    title: 'Senior Full-Stack Engineer',
    slug: 'senior-full-stack-engineer',
    department: 'Engineering',
    level: ExperienceLevel.SENIOR,
    employmentType: EmploymentType.FULL_TIME,
    location: 'Bangkok',
    isRemote: true,
    status: JobStatus.PUBLISHED,
    salaryMin: 120000,
    salaryMax: 160000,
    salaryCurrency: 'THB',
    applicationDeadline: '2026-06-30T00:00:00.000Z',
    publishedAt: '2026-04-01T00:00:00.000Z',
    description: `
      <h2>About the Role</h2>
      <p>We are looking for a Senior Full-Stack Engineer to join our growing engineering team. You will design, build, and maintain scalable web applications used by thousands of users daily.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Design and implement robust backend APIs using Node.js and TypeScript</li>
        <li>Build responsive, accessible frontends with React and Next.js</li>
        <li>Collaborate with Product and Design to ship features end-to-end</li>
        <li>Own system reliability through code reviews, tests, and observability</li>
        <li>Mentor junior engineers and champion engineering best practices</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>5+ years of professional software development experience</li>
        <li>Strong proficiency in TypeScript, React, and Node.js</li>
        <li>Experience with relational databases (PostgreSQL preferred)</li>
        <li>Familiarity with cloud platforms (AWS, GCP, or Azure)</li>
        <li>Excellent communication and collaboration skills</li>
      </ul>
    `,
    applicationForm: { screeningQuestions: [] },
    hasScoringConfig: true,
  },
  {
    id: '2',
    title: 'Product Designer',
    slug: 'product-designer',
    department: 'Design',
    level: ExperienceLevel.MID,
    employmentType: EmploymentType.FULL_TIME,
    location: 'Bangkok',
    isRemote: false,
    status: JobStatus.PUBLISHED,
    salaryMin: 80000,
    salaryMax: 110000,
    salaryCurrency: 'THB',
    applicationDeadline: '2026-05-31T00:00:00.000Z',
    publishedAt: '2026-04-02T00:00:00.000Z',
    description: `
      <h2>About the Role</h2>
      <p>As a Product Designer, you will shape the user experience across our suite of HR products, working closely with engineers and stakeholders to create intuitive, delightful interfaces.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Lead end-to-end design for new product features — from discovery to delivery</li>
        <li>Create wireframes, prototypes, and high-fidelity mockups in Figma</li>
        <li>Conduct user research and usability testing</li>
        <li>Maintain and evolve our design system</li>
        <li>Work cross-functionally with engineering and product management</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>3+ years of product design experience, ideally in SaaS or enterprise tools</li>
        <li>Expert-level Figma skills</li>
        <li>Strong portfolio demonstrating problem-solving and craft</li>
        <li>Experience with user research methodologies</li>
      </ul>
    `,
    applicationForm: {
      screeningQuestions: [
        { id: 'sq1', question: 'Please share a link to your portfolio', type: 'text', isRequired: true, isKnockout: false, order: 1 },
      ],
    },
    hasScoringConfig: true,
  },
  {
    id: '3',
    title: 'Data Analyst',
    slug: 'data-analyst',
    department: 'Data & Analytics',
    level: ExperienceLevel.JUNIOR,
    employmentType: EmploymentType.FULL_TIME,
    location: 'Chiang Mai',
    isRemote: true,
    status: JobStatus.PUBLISHED,
    salaryMin: 55000,
    salaryMax: 75000,
    salaryCurrency: 'THB',
    applicationDeadline: '2026-05-15T00:00:00.000Z',
    publishedAt: '2026-04-03T00:00:00.000Z',
    description: `
      <h2>About the Role</h2>
      <p>Join our Data & Analytics team to turn raw data into actionable insights that drive business decisions. You will work with large datasets, build dashboards, and collaborate with stakeholders across the company.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Analyze data to identify trends, patterns, and opportunities</li>
        <li>Build and maintain dashboards using BI tools (Metabase, Looker, or similar)</li>
        <li>Write SQL queries and data pipelines for reporting</li>
        <li>Present findings to non-technical stakeholders</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>1–3 years of experience in a data or analytics role</li>
        <li>Strong SQL skills; Python is a plus</li>
        <li>Experience with BI tools</li>
        <li>Analytical mindset and attention to detail</li>
      </ul>
    `,
    applicationForm: { screeningQuestions: [] },
    hasScoringConfig: false,
  },
  {
    id: '4',
    title: 'DevOps Engineer',
    slug: 'devops-engineer',
    department: 'Infrastructure',
    level: ExperienceLevel.MID,
    employmentType: EmploymentType.FULL_TIME,
    location: 'Bangkok',
    isRemote: true,
    status: JobStatus.PUBLISHED,
    salaryMin: 100000,
    salaryMax: 140000,
    salaryCurrency: 'THB',
    applicationDeadline: null,
    publishedAt: '2026-04-04T00:00:00.000Z',
    description: `
      <h2>About the Role</h2>
      <p>We are looking for a DevOps Engineer to own our cloud infrastructure, CI/CD pipelines, and site reliability practices. This is a high-impact role with significant ownership.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Design and maintain AWS infrastructure using Terraform and CDK</li>
        <li>Build and improve CI/CD pipelines (GitHub Actions)</li>
        <li>Monitor system performance and drive reliability improvements</li>
        <li>Implement security best practices and compliance controls</li>
        <li>Collaborate with engineering teams on deployment and scaling strategies</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>3+ years of DevOps or SRE experience</li>
        <li>Strong AWS knowledge (Lambda, ECS, RDS, S3, VPC)</li>
        <li>Experience with IaC tools (Terraform or Pulumi)</li>
        <li>Familiarity with containerization (Docker, ECS or EKS)</li>
      </ul>
    `,
    applicationForm: { screeningQuestions: [] },
    hasScoringConfig: true,
  },
  {
    id: '5',
    title: 'Marketing Manager',
    slug: 'marketing-manager',
    department: 'Marketing',
    level: ExperienceLevel.SENIOR,
    employmentType: EmploymentType.FULL_TIME,
    location: 'Bangkok',
    isRemote: false,
    status: JobStatus.PUBLISHED,
    salaryMin: 90000,
    salaryMax: 130000,
    salaryCurrency: 'THB',
    applicationDeadline: '2026-06-01T00:00:00.000Z',
    publishedAt: '2026-04-05T00:00:00.000Z',
    description: `
      <h2>About the Role</h2>
      <p>Lead our marketing efforts to grow brand awareness, generate leads, and support the sales pipeline. You will manage campaigns, content, and a small team of marketers.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Own demand generation strategy across paid, organic, and owned channels</li>
        <li>Manage and mentor a team of 2–3 marketing specialists</li>
        <li>Partner with Sales to align on pipeline goals and messaging</li>
        <li>Drive content marketing, SEO, and social media programmes</li>
        <li>Track performance and report on KPIs to leadership</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>5+ years of B2B or SaaS marketing experience</li>
        <li>Proven track record in demand generation and campaign management</li>
        <li>Strong analytical skills; comfortable with marketing attribution</li>
        <li>Experience managing a team</li>
      </ul>
    `,
    applicationForm: { screeningQuestions: [] },
    hasScoringConfig: false,
  },
  {
    id: '6',
    title: 'Frontend Engineer (React)',
    slug: 'frontend-engineer-react',
    department: 'Engineering',
    level: ExperienceLevel.MID,
    employmentType: EmploymentType.CONTRACT,
    location: 'Remote',
    isRemote: true,
    status: JobStatus.PUBLISHED,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    applicationDeadline: '2026-05-01T00:00:00.000Z',
    publishedAt: '2026-04-06T00:00:00.000Z',
    description: `
      <h2>About the Role</h2>
      <p>6-month contract engagement for an experienced React engineer to help us ship a major frontend overhaul. Fully remote, async-friendly environment.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Migrate legacy pages to our new Next.js App Router architecture</li>
        <li>Implement pixel-perfect UI from Figma designs</li>
        <li>Write unit and integration tests (Vitest, Testing Library)</li>
        <li>Participate in code reviews and technical discussions</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>3+ years of React experience</li>
        <li>Solid understanding of Next.js App Router and server components</li>
        <li>Tailwind CSS proficiency</li>
        <li>Available for at least 30 hours/week for 6 months</li>
      </ul>
    `,
    applicationForm: {
      screeningQuestions: [
        { id: 'sq2', question: 'What is your hourly rate expectation (USD)?', type: 'text', isRequired: true, isKnockout: false, order: 1 },
        { id: 'sq3', question: 'Are you available to start within 2 weeks?', type: 'yes_no', isRequired: true, isKnockout: true, order: 2 },
      ],
    },
    hasScoringConfig: true,
  },
  {
    id: '7',
    title: 'HR Business Partner',
    slug: 'hr-business-partner',
    department: 'Human Resources',
    level: ExperienceLevel.SENIOR,
    employmentType: EmploymentType.FULL_TIME,
    location: 'Bangkok',
    isRemote: false,
    status: JobStatus.PUBLISHED,
    salaryMin: 85000,
    salaryMax: 115000,
    salaryCurrency: 'THB',
    applicationDeadline: '2026-06-15T00:00:00.000Z',
    publishedAt: '2026-04-07T00:00:00.000Z',
    description: `
      <h2>About the Role</h2>
      <p>Partner with business leaders to build high-performing teams, drive people programmes, and create a culture where everyone can thrive.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Act as a strategic advisor to department heads on all people matters</li>
        <li>Lead talent acquisition, performance management, and L&amp;D initiatives</li>
        <li>Manage employee relations and resolve workplace issues</li>
        <li>Analyse HR data to identify trends and recommend improvements</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>5+ years of HRBP or generalist HR experience</li>
        <li>Strong knowledge of Thai labour law</li>
        <li>Excellent interpersonal and coaching skills</li>
        <li>Experience in a fast-growing tech or startup environment preferred</li>
      </ul>
    `,
    applicationForm: { screeningQuestions: [] },
    hasScoringConfig: false,
  },
  {
    id: '8',
    title: 'Machine Learning Intern',
    slug: 'machine-learning-intern',
    department: 'Data & Analytics',
    level: ExperienceLevel.ENTRY,
    employmentType: EmploymentType.INTERNSHIP,
    location: 'Bangkok',
    isRemote: true,
    status: JobStatus.PUBLISHED,
    salaryMin: 15000,
    salaryMax: 20000,
    salaryCurrency: 'THB',
    applicationDeadline: '2026-05-01T00:00:00.000Z',
    publishedAt: '2026-04-08T00:00:00.000Z',
    description: `
      <h2>About the Role</h2>
      <p>A 3-month paid internship for students or recent graduates interested in applied machine learning. You will work alongside senior data scientists on real product problems.</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>Assist in data collection, cleaning, and feature engineering</li>
        <li>Train and evaluate ML models using Python and scikit-learn / PyTorch</li>
        <li>Document experiments and present findings to the team</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>Currently enrolled in or recently graduated from a CS, Statistics, or related degree</li>
        <li>Solid Python skills and familiarity with pandas, numpy</li>
        <li>Basic understanding of ML concepts (regression, classification, evaluation metrics)</li>
      </ul>
    `,
    applicationForm: {
      screeningQuestions: [
        { id: 'sq4', question: 'Are you currently enrolled in a university or recently graduated (within 12 months)?', type: 'yes_no', isRequired: true, isKnockout: true, order: 1 },
      ],
    },
    hasScoringConfig: false,
  },
];

export function getMockJobBySlug(slug: string) {
  return MOCK_JOBS.find((j) => j.slug === slug) ?? null;
}

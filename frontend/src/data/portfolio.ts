import type { LucideIcon } from 'lucide-react'
import { Github, Linkedin, BookOpen, Globe } from 'lucide-react'

export const profile = {
  name: 'Alejandro Jordan Bojanic',
  location: 'Bentonville, AR',
  title: 'Alejandro Jordan Bojanic — Integration Engineering Lead',
  languages: 'Fluent in English and Spanish.',
  opener: {
    headline:
      "I care about helping small brands find their footing, building teams that actually enjoy working together, and giving back to the communities that shaped me.",
    body: "Most of my days are spent growing engineers, defining how things should be built, and making sure the software we ship is something we're proud of. I've scaled a team from just me to a crew of four, delivered hundreds of data pipelines, and co-founded a consultancy back home in Bolivia.",
  },
  contact: {
    heading: 'Say hi',
    intro:
      "I'm always up for a conversation — whether it's about a project, a team challenge, or just swapping ideas.",
  },
}

export const interests = [
  'Building & Growing Teams',
  'Data Integration',
  'API Design',
  'Python',
  'TypeScript',
  'React',
  'Microservices',
  'Mentoring Engineers',
  'ETL Pipelines',
  'Kubernetes',
  'Google Cloud',
]

export interface Project {
  title: string
  description: string
  tags: string[]
}

export const projects: Project[] = [
  {
    title: 'Integration Platform',
    description:
      'Built a proprietary integration platform from the ground up — microservices, public APIs, and job orchestration powering 200+ data pipelines for 20+ enterprise clients.',
    tags: ['Python', 'FastAPI', 'React', 'MongoDB', 'Kubernetes'],
  },
  {
    title: 'PaiP — Data Science Consultancy',
    description:
      'Co-founded a consultancy in Bolivia. Deployed web APIs, data pipelines, and demand forecasting models that improved client accuracy by 70%.',
    tags: ['Python', 'FastAPI', 'Docker', 'GCP', 'Prophet'],
  },
]

export interface JourneyStop {
  period: string
  role: string
  company: string
  note: string
}

export const journey: JourneyStop[] = [
  {
    period: 'Feb 2025 – Present',
    role: 'Senior Consultant / Integration Engineering Lead',
    company: 'Gravitate',
    note: 'Leading a team of 4, owning the integration engineering practice end-to-end.',
  },
  {
    period: 'Aug 2022 – Feb 2025',
    role: 'Technical Consultant',
    company: 'Gravitate',
    note: 'Led 10+ client integration projects, developed 20+ data pipelines and automated workflows.',
  },
  {
    period: 'Sep 2021 – Aug 2022',
    role: 'Business Analyst',
    company: 'Gravitate',
    note: 'Managed 6+ client implementations facilitating 4.5B+ gallons of petroleum transactions.',
  },
  {
    period: 'May 2022 – Dec 2023',
    role: 'Co-Founder',
    company: 'PaiP',
    note: 'Data science consultancy in La Paz, Bolivia.',
  },
  {
    period: 'Dec 2019 – Mar 2024',
    role: 'Fullstack Web Developer',
    company: 'DATAX LTD.',
    note: 'Built APIs and data pipelines for a leading software provider in Bolivia.',
  },
]

export interface Education {
  institution: string
  credential: string
}

export const education: Education[] = [
  {
    institution: 'MIT — IDSS',
    credential: 'Data Science & Machine Learning Certification',
  },
  {
    institution: 'University of Arkansas',
    credential: 'M.S. Information Systems, B.S. Marketing',
  },
]

export interface SocialLink {
  href: string
  icon: LucideIcon
  label: string
}

export const socialLinks: SocialLink[] = [
  {
    href: 'https://github.com/ajordanb',
    icon: Github,
    label: 'GitHub',
  },
  {
    href: 'https://linkedin.com/in/alejandrojordanbojanic',
    icon: Linkedin,
    label: 'LinkedIn',
  },
  {
    href: 'https://medium.com/@ajordanbojanic',
    icon: BookOpen,
    label: 'Medium',
  },
  {
    href: 'https://jordanbojanic.com',
    icon: Globe,
    label: 'jordanbojanic.com',
  },
]

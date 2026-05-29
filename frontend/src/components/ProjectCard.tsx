import type { Project } from '@/data/portfolio'
import { Pill } from './Pill'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="rounded-2xl bg-card p-5 space-y-3 transition-shadow hover:shadow-md">
      <h3 className="font-semibold text-card-foreground">{project.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {project.tags.map((tag) => (
          <Pill key={tag} variant="tag">
            {tag}
          </Pill>
        ))}
      </div>
    </div>
  )
}

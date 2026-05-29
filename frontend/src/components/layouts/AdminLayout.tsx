import React, { useEffect } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Link, useRouterState } from '@tanstack/react-router'

function AdminBreadcrumb() {
  const matches = useRouterState({ select: (s) => s.matches })
  const segments = matches
    .filter((m) => m.pathname !== '/_authenticated')
    .map((m) => m.pathname.split('/').filter(Boolean).pop() ?? '')
    .filter(Boolean)

  const labels: Record<string, string> = {
    admin: 'Admin',
    participants: 'Participants',
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin/participants">Admin</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments
          .filter((s) => s !== 'admin')
          .map((seg, i, arr) => (
            <React.Fragment key={seg}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {i === arr.length - 1 ? (
                  <BreadcrumbPage>{labels[seg] ?? seg}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={`/admin/${seg}` as '/admin/participants'}>{labels[seg] ?? seg}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add('dashboard-theme')
    return () => document.body.classList.remove('dashboard-theme')
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <AdminBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

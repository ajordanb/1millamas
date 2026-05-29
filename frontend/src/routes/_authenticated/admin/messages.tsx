import { createFileRoute, Outlet } from '@tanstack/react-router'
import { MessagesList, useActiveMessageId } from '@/components/messages/MessagesList'

export const Route = createFileRoute('/_authenticated/admin/messages')({
  component: MessagesLayout,
})

function MessagesLayout() {
  const activeId = useActiveMessageId()

  return (
    <div className="flex gap-4 h-[calc(100dvh-5rem)] min-h-0">
      <aside
        className={`w-full md:w-80 md:shrink-0 rounded-2xl bg-card shadow-[0_2px_12px_-4px_rgb(0,0,0,0.06)] overflow-hidden ${
          activeId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <MessagesList />
      </aside>
      <section
        className={`flex-1 min-w-0 ${activeId ? 'flex' : 'hidden md:flex'} flex-col`}
      >
        <Outlet />
      </section>
    </div>
  )
}

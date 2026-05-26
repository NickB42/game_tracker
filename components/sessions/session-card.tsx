import Link from 'next/link'
import { ListItemCard } from '@/components/ui/list-item-card'

interface SessionCardProps {
  session: {
    id: string
    title: string | null
    activityType: 'CARD' | 'SQUASH' | 'PADEL'
    playedAt: Date
    updatedAt: Date
    group: { id: string; name: string } | null
    ownerUserId: string
    trustedAdmins: Array<{ id: string; userId: string }>
    _count: {
      participants: number
      roundResults: number
      matches: number
    }
  }
  returnTo: string
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDateTime(value: Date) {
  return dateFormatter.format(value)
}

export function SessionCard({
  session,
  returnTo,
}: SessionCardProps) {
  const isCard = session.activityType === 'CARD'
  const resultCount = isCard ? session._count.roundResults : session._count.matches
  const resultLabel = isCard ? 'Rounds' : 'Matches'

  const stats = [
    { label: 'Group', value: session.group?.name ?? 'No group' },
    { label: 'Participants', value: session._count.participants },
    { label: resultLabel, value: resultCount },
  ]

  return (
    <Link href={`/dashboard/sessions/${session.id}?returnTo=${returnTo}`}>
      <ListItemCard
        title={session.title ?? 'Untitled session'}
        subtitle={formatDateTime(session.playedAt)}
        badge={{
          label: session.activityType,
          variant: 'default',
        }}
        stats={stats}
      />
    </Link>
  )
}

import Link from 'next/link'
import { ListItemCard } from '@/components/ui/list-item-card'

interface GroupCardProps {
  group: {
    id: string
    name: string
    _count: {
      memberships: number
      gameSessions: number
    }
  }
}

export function GroupCard({ group }: GroupCardProps) {
  const stats = [
    { label: 'Members', value: group._count.memberships },
    { label: 'Sessions', value: group._count.gameSessions },
  ]

  return (
    <Link href={`/dashboard/groups/${group.id}`}>
      <ListItemCard
        title={group.name}
        stats={stats}
      />
    </Link>
  )
}

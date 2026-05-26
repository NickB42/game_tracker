import Link from 'next/link'
import { ListItemCard } from '@/components/ui/list-item-card'
import { StatusBadge } from '@/components/ui/primitives'

interface PlayerCardProps {
  player: {
    id: string
    displayName: string
    isActive: boolean
    _count: {
      groupMemberships: number
      sessionParticipants: number
    }
  }
}

export function PlayerCard({ player }: PlayerCardProps) {
  const stats = [
    { label: 'Groups', value: player._count.groupMemberships },
    { label: 'Sessions', value: player._count.sessionParticipants },
  ]

  return (
    <Link href={`/dashboard/players/${player.id}`}>
      <ListItemCard
        title={player.displayName}
        badge={{
          label: player.isActive ? 'Active' : 'Inactive',
          variant: player.isActive ? 'success' : 'warning',
        }}
        stats={stats}
      />
    </Link>
  )
}

import Link from 'next/link'
import type { ActivityType } from '@prisma/client'
import { ListItemCard } from '@/components/ui/list-item-card'
import type { LeaderboardRow } from '@/lib/db/leaderboards'

interface LeaderboardCardProps {
  row: LeaderboardRow
  rank: number
  activityType: ActivityType
}

export function LeaderboardCard({ row, rank, activityType }: LeaderboardCardProps) {
  const isCard = activityType === 'CARD'

  const stats = [
    { label: 'Rating', value: row.displayedRating.toFixed(2) },
    ...(isCard ? [{ label: 'Mu', value: row.mu.toFixed(2) }] : []),
    ...(isCard ? [{ label: 'Sigma', value: row.sigma.toFixed(2) }] : []),
    ...(isCard ? [{ label: 'Round wins', value: row.roundWins }] : []),
    { label: 'Match wins', value: row.matchWins },
    {
      label: isCard ? 'Rounds played' : 'Matches played',
      value: isCard ? row.roundsPlayed : row.matchesPlayed,
    },
    { label: 'Sessions', value: row.sessionsPlayed },
  ]

  return (
    <Link href={`/dashboard/players/${row.playerId}`}>
      <ListItemCard
        title={row.playerDisplayName}
        subtitle={`Rank #${rank}`}
        badge={{
          label: `#${rank}`,
          variant: rank === 1 ? 'success' : 'default',
        }}
        stats={stats}
      />
    </Link>
  )
}

import { ReactNode } from 'react'
import { DataTable } from './primitives'

interface ResponsiveListProps<T> {
  data: T[]
  mobile: (item: T, index: number) => ReactNode
  desktop: (item: T, index: number) => ReactNode
  desktopHeaders?: ReactNode
  emptyState?: ReactNode
  heading?: string
  testId?: string
}

/**
 * Renders mobile-optimized cards below 880px breakpoint,
 * and a desktop table above 880px.
 * Single data source, dual presentation.
 */
export function ResponsiveList<T extends { id?: string; [key: string]: any }>({
  data,
  mobile,
  desktop,
  desktopHeaders,
  emptyState,
  heading,
  testId,
}: ResponsiveListProps<T>) {
  if (data.length === 0) {
    return emptyState
  }

  return (
    <>
      {heading && <h2 className="text-lg font-semibold mb-4">{heading}</h2>}

      {/* Mobile: Stacked cards (visible below 880px) */}
      <div className="md:hidden space-y-2" data-testid={testId ? `${testId}-mobile` : undefined}>
        {data.map((item, index) => (
          <div key={item.id || index}>{mobile(item, index)}</div>
        ))}
      </div>

      {/* Desktop: Table (visible at 880px and above) */}
      <div className="hidden md:block" data-testid={testId ? `${testId}-desktop` : undefined}>
        <DataTable>
          <table className="app-table w-full" data-testid={testId ? `${testId}-table` : undefined}>
            {desktopHeaders && <thead>{desktopHeaders}</thead>}
            <tbody>{data.map((item, index) => desktop(item, index))}</tbody>
          </table>
        </DataTable>
      </div>
    </>
  )
}

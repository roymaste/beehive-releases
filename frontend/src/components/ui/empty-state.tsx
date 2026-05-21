import { type ReactNode } from 'react'
import { Button } from './button'
import { useNavigate } from 'react-router-dom'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  actionUrl?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyStateTable({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <h3 className="text-sm font-medium text-muted-foreground">{title || "暂无数据"}</h3>
      {description && <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>}
    </div>
  )
}

export function EmptyState({ icon, title, description, actionLabel, actionUrl, action }: EmptyStateProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-muted-foreground/40">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {actionLabel && actionUrl && (
        <Button onClick={() => navigate(actionUrl)}>
          {actionLabel}
        </Button>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

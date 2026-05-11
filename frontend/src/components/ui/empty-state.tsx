import React from 'react';
import { cn } from "@/lib/utils"

// UX: EmptyState component — consistent empty state with illustration, message, and optional CTA button
interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function EmptyState({
  icon,
  title = '暂无数据',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16 animate-in fade-in duration-300",
        className
      )}
    >
      {/* Illustration */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        {icon || (
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground"
          >
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-5">
          {description}
        </p>
      )}

      {/* CTA Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="btn"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// UX: EmptyStateTable — specialized empty state for DataTable with table-appropriate padding
function EmptyStateTable({
  icon,
  title = '暂无数据',
  description,
  action,
}: Omit<EmptyStateProps, 'className'>) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className="py-14"
    />
  );
}

export { EmptyState, EmptyStateTable }

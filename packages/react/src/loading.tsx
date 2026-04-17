import { type HTMLAttributes, type ReactNode, forwardRef } from 'react'

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  /** 0..1 progress; surfaced as aria-valuenow when set. */
  progress?: number
  children?: ReactNode
}

export const Loading = forwardRef<HTMLDivElement, LoadingProps>(function Loading(
  { progress, children, ...rest },
  ref,
) {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: progressbar is a visual indicator, not interactive
    <div
      ref={ref}
      cmdk-loading=""
      role="progressbar"
      aria-valuenow={progress != null ? Math.round(progress * 100) : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      {children}
    </div>
  )
})

'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center gap-1 text-sm', className)}
    >
      {/* Home link */}
      <Link
        href="/"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={item.label} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-muted-foreground/60" aria-hidden="true" />
            
            {isLast || !item.href ? (
              <span 
                className={cn(
                  'flex items-center gap-1.5',
                  isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Example usage for future subpages:
// <Breadcrumb items={[
//   { label: 'Presets', href: '/presets' },
//   { label: 'Corporate PA', icon: <Mic className="w-3.5 h-3.5" /> }
// ]} />

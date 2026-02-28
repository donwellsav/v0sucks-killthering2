'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

interface ResetConfirmDialogProps {
  onConfirm: () => void
  trigger?: React.ReactNode
  variant?: 'icon' | 'full'
}

export function ResetConfirmDialog({
  onConfirm,
  trigger,
  variant = 'icon',
}: ResetConfirmDialogProps) {
  const defaultTrigger =
    variant === 'icon' ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        title="Reset all settings to defaults"
        aria-label="Reset settings"
      >
        <RotateCcw className="w-3 h-3" />
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="w-full gap-1.5">
        <RotateCcw className="w-3.5 h-3.5" />
        Reset to PA Defaults
      </Button>
    )

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset settings?</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore all detection settings to their defaults. Any custom threshold,
            growth rate, or mode changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Reset</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

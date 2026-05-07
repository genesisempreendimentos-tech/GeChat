"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { LoadingGif } from "@/components/LoadingGif"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const AvatarGroup = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const forwardClickToAvatarAction = (root: HTMLDivElement, originalTarget: EventTarget | null) => {
    const targetEl = originalTarget instanceof HTMLElement ? originalTarget : null
    const alreadyInteractive = targetEl?.closest('button,a,[role="button"],[data-avatar-click-target="true"]')
    if (alreadyInteractive) return

    const actionEl = root.querySelector<HTMLElement>('button,a,[role="button"],[data-avatar-click-target="true"]')
    actionEl?.click()
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn("flex -space-x-4 items-center justify-center", className)}
        {...props}
      >
        <AnimatePresence mode="popLayout">
          {React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) return null

            return (
              <motion.div
                key={child.key || index}
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  transition: { 
                    delay: index * 0.03,
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }
                }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                whileHover={{ 
                  scale: 1.15, 
                  y: -4,
                  zIndex: 50,
                  transition: { type: "spring", stiffness: 300, damping: 20 }
                }}
                className="relative flex items-center self-center cursor-pointer transition-all hover:z-50"
                style={{ zIndex: index }}
                onClick={(e) => {
                  forwardClickToAvatarAction(e.currentTarget as HTMLDivElement, e.target)
                }}
              >
                {child}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}

export const AvatarGroupTooltip = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("absolute inset-0 z-50 h-full w-full cursor-pointer rounded-full", className)} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

interface AvatarGroupItemProps {
  children: React.ReactNode
  tooltip: React.ReactNode
  onClick?: () => void
  loading?: boolean
  className?: string
  buttonClassName?: string
}

export const AvatarGroupItem = ({
  children,
  tooltip,
  onClick,
  loading = false,
  className,
  buttonClassName,
}: AvatarGroupItemProps) => {
  const content = onClick ? (
    <button
      type="button"
      data-avatar-click-target="true"
      disabled={loading}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "relative inline-flex items-center justify-center align-middle rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0d1520]",
        loading && "opacity-70",
        buttonClassName,
      )}
      aria-label={typeof tooltip === "string" ? `Ver perfil de ${tooltip}` : "Ver perfil"}
    >
      {children}
      {loading ? (
        <span className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-background/60">
          <LoadingGif size="sm" />
        </span>
      ) : null}
    </button>
  ) : (
    <div className="relative inline-flex items-center align-middle">{children}</div>
  )

  return (
    <div className={cn("relative flex items-center", className)}>
      {content}
      <AvatarGroupTooltip>{tooltip}</AvatarGroupTooltip>
    </div>
  )
}

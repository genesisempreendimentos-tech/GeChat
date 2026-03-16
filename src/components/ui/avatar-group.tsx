"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
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
                className="relative cursor-pointer transition-all hover:z-50"
                style={{ zIndex: index }}
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

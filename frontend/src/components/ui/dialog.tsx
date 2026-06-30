import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { useRootZoom } from "@/hooks/useRootZoom"
import { useAppMotion } from "@/hooks/useAppMotion"
import { modalScaleFromFillRatio, motionModalTransitionSubtle } from "@/lib/motionPresets"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, style, ...props }, ref) => {
  const rootZoom = useRootZoom()
  const motionCfg = useAppMotion()

  if (!motionCfg.enabled) {
    return (
      <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className
        )}
        style={{ zoom: rootZoom, ...style } as React.CSSProperties}
        {...props}
      />
    )
  }

  return (
    <DialogPrimitive.Overlay ref={ref} asChild {...props}>
      <motion.div
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
          className
        )}
        style={{ zoom: rootZoom, ...style } as React.CSSProperties}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      />
    </DialogPrimitive.Overlay>
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** 0–1: escala inicial proporcional ao volume de dados (ex.: perfil preenchido). */
  entranceFillRatio?: number
  /** `subtle` = fade discreto sem bounce; `default` = spring com escala e deslocamento. */
  entranceStyle?: 'default' | 'subtle'
  /** Quando false, clique no overlay e Escape não fecham o modal. */
  dismissOnOutsideClick?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, style, entranceFillRatio, entranceStyle = 'default', dismissOnOutsideClick = true, ...props }, ref) => {
  const rootZoom = useRootZoom()
  const motionCfg = useAppMotion()
  const isSubtle = entranceStyle === 'subtle'
  const initialScale = isSubtle ? 0.98 : modalScaleFromFillRatio(entranceFillRatio ?? 0.45)

  const dismissProps =
    dismissOnOutsideClick === false
      ? {
          onPointerDownOutside: (event: Event) => event.preventDefault(),
          onInteractOutside: (event: Event) => event.preventDefault(),
          onEscapeKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        }
      : {}

  const shellClass = cn(
    "fixed left-1/2 top-1/2 z-50 grid w-full gap-4 border bg-background p-6 shadow-lg rounded-xl outline-none",
    className
  )

  const centeredMotion = isSubtle
    ? ({
        initial: { opacity: 0, scale: initialScale, x: '-50%', y: '-50%' },
        animate: { opacity: 1, scale: 1, x: '-50%', y: '-50%' },
        exit: { opacity: 0, scale: initialScale, x: '-50%', y: '-50%' },
      } as const)
    : ({
        initial: {
          opacity: 0,
          scale: initialScale,
          x: '-50%',
          y: 'calc(-50% + 8px)',
        },
        animate: {
          opacity: 1,
          scale: 1,
          x: '-50%',
          y: '-50%',
        },
        exit: {
          opacity: 0,
          scale: initialScale,
          x: '-50%',
          y: 'calc(-50% + 6px)',
        },
      } as const)

  const motionTransition = isSubtle ? motionModalTransitionSubtle : motionCfg.modalTransition

  if (!motionCfg.enabled) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            shellClass,
            "translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            !isSubtle &&
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          style={{ zoom: rootZoom, ...style } as React.CSSProperties}
          {...dismissProps}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        asChild
        {...dismissProps}
        {...props}
      >
        <motion.div
          key={`dialog-${initialScale.toFixed(2)}`}
          className={shellClass}
          style={
            {
              zoom: rootZoom,
              transformOrigin: 'center center',
              ...style,
            } as React.CSSProperties
          }
          initial={centeredMotion.initial}
          animate={centeredMotion.animate}
          exit={centeredMotion.exit}
          transition={motionTransition}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "确认操作",
  description = "确定要执行此操作吗？",
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  confirmVariant = "destructive",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">{cancelText}</Button>} />
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function useConfirmDialog() {
  const [open, setOpen] = React.useState(false)
  const [config, setConfig] = React.useState<Omit<ConfirmDialogProps, "open" | "onOpenChange">>({
    onConfirm: () => {},
  })

  const confirm = React.useCallback(
    (options: Omit<ConfirmDialogProps, "open" | "onOpenChange">) => {
      setConfig(options)
      setOpen(true)
    },
    []
  )

  const dialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      {...config}
    />
  )

  return { confirm, dialog }
}

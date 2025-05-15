import * as React from "react"
import { cn } from "@/lib/utils"

const VisuallyHidden = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "absolute h-[1px] w-[1px] overflow-hidden whitespace-nowrap p-0 [clip:rect(0,0,0,0)]",
        className
      )}
      {...props}
    />
  )
}

export { VisuallyHidden }
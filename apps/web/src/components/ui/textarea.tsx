import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-[#7c6fe0] focus:outline-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };

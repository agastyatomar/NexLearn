import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "font-body text-[14px] font-bold leading-[1.4] text-ink",
        className,
      )}
      {...props}
    />
  );
}

import { cn } from "@/lib/utils";

/* Input — design.md: 12px radius, 2px Faded Gray border,
   Paper White fill, Charcoal text 15px/500, Pencil Gray
   placeholder, Spark Blue focus. 44px height to match 3D buttons. */
export function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-[44px] w-full rounded-[12px] border-2 border-dim-steel bg-night px-4 font-body text-[15px] font-medium leading-[1.4] text-ink placeholder:text-steel/60 outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] focus:border-electric-cyan focus-visible:border-electric-cyan disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

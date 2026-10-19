import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* shadcn-style Button customized for NexLearn.
   - primary: electric blue fill, snow text, body 700 at
     15px uppercase with 0.0530em tracking, 12px radius. The 2px
     border matches the fill so it aligns with outline buttons.
     3D edge: 4px Nex Blue Deep bottom (`.nex-btn-primary`).
   - outline: transparent fill, cyan text at 14px, 2px
     dim-steel border on top/sides. 3D edge: 4px pale cyan
     bottom (`.nex-btn-outline`).
   Motion (.nex-btn in globals.css): hover shifts color only;
   press travels 2px down while the edge compresses 4px -> 2px. */

const buttonVariants = cva(
  "nex-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border-2 font-body font-bold whitespace-nowrap outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-cyan disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "nex-btn-primary border-nex-blue bg-nex-blue text-nav-label leading-nav-label tracking-nav-label text-snow uppercase hover:brightness-95",
        outline:
          "nex-btn-outline border-dim-steel bg-transparent text-[14px] leading-[1.4] text-electric-cyan hover:border-electric-cyan hover:bg-electric-cyan/5",
      },
      size: {
        default: "px-4 py-2.5",
        sm: "px-3 py-1.5",
        lg: "px-6 py-3.5",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({ className, variant, size, href, type = "button", ...props }) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (href) {
    return <a href={href} className={classes} {...props} />;
  }
  return <button type={type} className={classes} {...props} />;
}

export { Button, buttonVariants };

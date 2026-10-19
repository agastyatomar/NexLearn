/* Centered auth card — Paper White on Paper White canvas,
   2px Faded Gray border, 12px radius, smooth entrance.
   Max 480px per design.md. No logo per request — title is the
   only header. Padding is generous (28px / 40px) and uses
   arbitrary values so the custom --spacing-* scale doesn't
   shrink it (p-8 would be 8px, not 32px). */
export function AuthCard({ title, description, children }) {
  return (
    <div className="auth-card w-full max-w-[480px] rounded-[12px] border-2 border-dim-steel bg-night p-[28px] sm:p-[40px]">
      <div className="mb-8 text-center">
        <h1 className="font-body text-[32px] font-bold leading-[1.2] text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 font-body text-[15px] font-medium leading-[1.4] text-steel">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

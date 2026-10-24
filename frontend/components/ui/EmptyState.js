/* Reusable empty state — icon tile, title, body, optional CTA.
   Used by dashboard, community, leaderboard and search results.
   Server-safe presentational component. */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action = null,
  tone = "violet",
}) {
  const tileMap = {
    violet: "bg-soft-violet text-nex-blue",
    cyan: "bg-soft-violet text-electric-cyan",
  };
  return (
    <div className="flex flex-col items-center rounded-[16px] border-2 border-dashed border-dim-steel bg-night px-6 py-10 text-center">
      {Icon ? (
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${tileMap[tone] ?? tileMap.violet}`}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </span>
      ) : null}
      <p className="mt-3 font-feather text-[17px] leading-[1.2] font-bold text-ink">
        {title}
      </p>
      {body ? (
        <p className="mt-1.5 max-w-[320px] font-body text-[13.5px] leading-[1.5] font-medium text-steel">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

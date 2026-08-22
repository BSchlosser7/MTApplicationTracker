export default function DeadlinePill({
  date,
  daysUntil,
  variant = "due",
}: {
  date: string;
  daysUntil: number;
  variant?: "due" | "opens";
}) {
  const dateLabel = date.slice(0, 10);

  if (variant === "opens") {
    let color = "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300";
    let label = `Opens ${dateLabel}`;
    if (daysUntil < 0) {
      color = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
      label = `Opened ${dateLabel}`;
    } else if (daysUntil === 0) {
      label = "Opens today";
    } else if (daysUntil <= 14) {
      label = `Opens in ${daysUntil}d`;
    }
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}
        title={dateLabel}
      >
        {label}
      </span>
    );
  }

  let color = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  let label = dateLabel;

  if (daysUntil < 0) {
    color = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    label = `Overdue (${dateLabel})`;
  } else if (daysUntil <= 3) {
    color = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    label = daysUntil === 0 ? "Due today" : `${daysUntil}d left`;
  } else if (daysUntil <= 14) {
    color = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    label = `${daysUntil}d left`;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}
      title={dateLabel}
    >
      {label}
    </span>
  );
}

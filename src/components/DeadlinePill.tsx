export default function DeadlinePill({
  date,
  daysUntil,
}: {
  date: string;
  daysUntil: number;
}) {
  let color =
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  let label = `${date.slice(0, 10)}`;

  if (daysUntil < 0) {
    color = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    label = `Overdue (${date.slice(0, 10)})`;
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
      title={date.slice(0, 10)}
    >
      {label}
    </span>
  );
}

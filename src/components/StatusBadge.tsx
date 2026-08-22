import type { Status } from "@/lib/types";

const STYLES: Record<Status, string> = {
  "Not Started": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  Researching: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "Prescreen Submitted": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "Application Submitted": "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  Accepted: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Waitlisted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Withdrawn: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 line-through",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STYLES[status] ?? STYLES["Not Started"]}`}
    >
      {status}
    </span>
  );
}

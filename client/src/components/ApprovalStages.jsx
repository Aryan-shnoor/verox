import { formatDateTime } from "../format.js";
import { STATUS_STYLES } from "../constants.js";

const labels = {
  WAITING: "Waiting",
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes requested",
  SKIPPED: "Skipped",
};

const styles = {
  ...STATUS_STYLES,
  WAITING: "bg-[#eceef2] text-[#454d5c]",
  PENDING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  SKIPPED: "bg-[#eceef2] text-[#8a93a3]",
};

function Chip({ status }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function ApprovalStages({ attempts }) {
  if (attempts.length === 0) {
    return <p className="text-sm text-muted">Not submitted yet.</p>;
  }

  const newestFirst = [...attempts].reverse();

  return (
    <div className="space-y-3">
      {newestFirst.map((attempt, index) => (
        <details
          key={attempt.id}
          open={index === 0}
          className="rounded-xl border border-line"
        >
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
            <span className="font-semibold">
              Attempt {attempt.attempt_number}
              <span className="ml-2 font-normal text-muted">
                Started {formatDateTime(attempt.started_at)}
              </span>
            </span>
            <Chip status={attempt.status} />
          </summary>

          <ul className="divide-y divide-line border-t border-line">
            {attempt.stages.map((stage) => (
              <li
                key={stage.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-page text-xs font-semibold text-muted">
                    {stage.stage_order}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {stage.stage_name}
                    </span>
                    <span className="text-xs text-muted">
                      {stage.reviewer_name}
                    </span>
                  </span>
                </span>
                <Chip status={stage.status} />
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

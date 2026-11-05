import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../authContext.js";
import {
  getSummary,
  getDocuments,
  getPendingReviews,
  downloadDocumentsCsv,
} from "../api.js";
import { STATUS_LABELS } from "../constants.js";
import { formatDate, formatDateTime } from "../format.js";
import { btnPrimary, btnSecondary } from "../ui.js";
import StatusBadge from "../components/StatusBadge.jsx";

// const numberColor = {
//   TOTAL: "text-ink",
//   DRAFT: "text-[#454d5c]",
//   PENDING_REVIEW: "text-amber-700",
//   CHANGES_REQUESTED: "text-orange-700",
//   APPROVED: "text-green-700",
//   REJECTED: "text-red-700",
// };

const barColor = {
  DRAFT: "bg-slate-300",
  PENDING_REVIEW: "bg-amber-400",
  CHANGES_REQUESTED: "bg-orange-500",
  APPROVED: "bg-green-600",
  REJECTED: "bg-red-500",
};

const dotColor = { TOTAL: "bg-accent", ...barColor };

const verbs = {
  CREATED: "created",
  SUBMITTED: "submitted",
  RESUBMITTED: "resubmitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  CHANGES_REQUESTED: "asked for changes on",
};

function Card({ title, link, children }) {
  return (
    <section className="rounded-[14px] border border-line bg-white">
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {link && (
          <Link
            to={link.to}
            className="text-sm font-medium text-accent hover:underline"
          >
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="px-5 pb-5 text-sm text-muted">{children}</p>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const isReviewer = user.role === "REVIEWER" || isAdmin;

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [summary, documents, pending] = await Promise.all([
          getSummary(),
          getDocuments(),
          isReviewer ? getPendingReviews() : [],
        ]);
        if (!ignore)
          setData({ summary, documents: documents.slice(0, 5), pending });
      } catch (err) {
        if (!ignore) setError(err.message);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [isReviewer]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadDocumentsCsv({});
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  if (!data) {
    return error ? (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    ) : (
      <p className="text-sm text-muted">Loading...</p>
    );
  }

  const counts = data.summary.documents;
  const activity = data.summary.activity;
  const reviewers = data.summary.reviewers || [];

  const subtitle = isAdmin
    ? "All documents and reviewers."
    : isReviewer
      ? "Your reviews and your documents."
      : "Your documents at a glance.";

  const cards = [
    { key: "TOTAL", label: "Total", value: counts.total, to: "/documents" },
    ...Object.entries(STATUS_LABELS).map(([status, label]) => ({
      key: status,
      label,
      value: counts[status],
      to: `/documents?status=${status}`,
    })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`${btnSecondary} min-w-36`}
          >
            {downloading ? "Preparing..." : "Export report"}
          </button>
          <Link to="/documents/new" className={btnPrimary}>
            New document
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {isReviewer && data.pending.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-accent-soft px-5 py-3.5 text-sm">
          <p className="font-semibold text-accent">
            {data.pending.length}{" "}
            {data.pending.length === 1 ? "document is" : "documents are"}{" "}
            waiting for your decision.
          </p>
          <Link
            to="/reviews"
            className="font-semibold text-accent hover:underline"
          >
            Open My Reviews
          </Link>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <Link
            key={card.key}
            to={card.to}
            className="rounded-[14px] border border-line bg-white p-4 hover:border-line-strong"
          >
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span className={`h-2 w-2 rounded-full ${dotColor[card.key]}`} />
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {isReviewer && (
            <Card
              title="Waiting for your decision"
              link={{ to: "/reviews", label: "View all" }}
            >
              {data.pending.length === 0 ? (
                <Empty>Nothing is waiting for you.</Empty>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {data.pending.slice(0, 5).map((item) => (
                    <li key={item.document_id}>
                      <Link
                        to={`/documents/${item.document_id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-page/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {item.title}
                          </span>
                          <span className="text-xs text-muted">
                            {item.owner_name} &middot; {item.stage_name}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-xs text-muted">
                          {formatDate(item.started_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card
            title="Recent documents"
            link={{ to: "/documents", label: "View all" }}
          >
            {data.documents.length === 0 ? (
              <Empty>No documents yet.</Empty>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {data.documents.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      to={`/documents/${doc.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-page/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {doc.title}
                        </span>
                        <span className="text-xs text-muted">
                          {doc.category} &middot; {formatDate(doc.updated_at)}
                        </span>
                      </span>
                      <StatusBadge status={doc.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isAdmin && (
            <Card title="Reviewers">
              {reviewers.length === 0 ? (
                <Empty>No reviewers yet.</Empty>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {reviewers.slice(0, 6).map((person) => (
                    <li
                      key={person.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                        {person.full_name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {person.full_name}
                        </p>
                        <p className="text-xs text-muted">
                          {person.approved} approved &middot; {person.rejected}{" "}
                          rejected &middot; {person.changes_requested} changes
                          requested
                        </p>
                      </div>
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          person.pending > 0
                            ? "bg-accent-soft text-accent"
                            : "bg-page text-muted"
                        }`}
                      >
                        {person.pending} pending
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {reviewers.length > 6 && (
                <p className="border-t border-line px-5 py-3 text-xs text-muted">
                  Showing 6 of {reviewers.length}
                </p>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Documents by status">
            <div className="px-5 pb-5">
              {counts.total === 0 ? (
                <p className="text-sm text-muted">No documents yet.</p>
              ) : (
                <>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-page">
                    {Object.keys(STATUS_LABELS).map(
                      (status) =>
                        counts[status] > 0 && (
                          <div
                            key={status}
                            className={barColor[status]}
                            style={{
                              width: `${(counts[status] / counts.total) * 100}%`,
                            }}
                          />
                        ),
                    )}
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                      <li
                        key={status}
                        className="flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2 text-muted">
                          <span
                            className={`h-2 w-2 rounded-full ${barColor[status]}`}
                          />
                          {label}
                        </span>
                        <span className="font-semibold">{counts[status]}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Card>

          <Card title="Recent activity">
            {activity.length === 0 ? (
              <Empty>No activity yet.</Empty>
            ) : (
              <ul className="space-y-3.5 px-5 pb-5">
                {activity.map((item) => (
                  <li key={item.id} className="text-sm">
                    <p>
                      <span className="font-semibold">{item.actor_name}</span>{" "}
                      {verbs[item.action]}{" "}
                      <Link
                        to={`/documents/${item.document_id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {item.title}
                      </Link>
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(item.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

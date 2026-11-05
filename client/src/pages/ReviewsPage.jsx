import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getPendingReviews, getReviewHistory } from "../api.js";
import { formatDate, formatDateTime } from "../format.js";
import { btnSecondary } from "../ui.js";
import StatusBadge from "../components/StatusBadge.jsx";
import DecisionPanel from "../components/DecisionPanel.jsx";

const HISTORY_PAGE = 8;

function Chip({ className, children }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

const neutral = "bg-[#eceef2] text-[#454d5c]";

export default function ReviewsPage() {
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    Promise.all([getPendingReviews(), getReviewHistory()])
      .then(([pendingList, historyList]) => {
        if (ignore) return;
        setPending(pendingList);
        setHistory(historyList);
        setError("");
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const selected =
    pending.find((item) => item.document_id === selectedId) ??
    pending[0] ??
    null;

  function select(id) {
    setSelectedId(id);
    if (window.innerWidth < 1024) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function tabClass(name) {
    return `-mb-px border-b-2 px-1 pb-3 text-sm font-medium ${
      tab === name
        ? "border-accent text-ink"
        : "border-transparent text-muted hover:text-ink"
    }`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">My Reviews</h1>
      <p className="mt-1 text-sm text-muted">
        Review each document without leaving the page.
      </p>

      <div className="mt-5 flex gap-6 border-b border-line">
        <button
          onClick={() => setTab("pending")}
          className={tabClass("pending")}
        >
          Waiting for me ({pending.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={tabClass("history")}
        >
          My decisions ({history.length})
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && <p className="mt-4 text-sm text-muted">Loading...</p>}

      {!loading && tab === "pending" && pending.length === 0 && (
        <p className="mt-4 rounded-[14px] border border-line bg-white px-5 py-10 text-center text-sm text-muted">
          Nothing is waiting for your decision.
        </p>
      )}

      {!loading && tab === "pending" && selected && (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <ul className="space-y-2">
            {pending.map((item) => {
              const active = item.document_id === selected.document_id;
              return (
                <li key={item.document_id}>
                  <button
                    onClick={() => select(item.document_id)}
                    className={`block w-full rounded-xl border bg-white px-4 py-3 text-left ${
                      active
                        ? "border-accent ring-1 ring-accent"
                        : "border-line hover:border-line-strong"
                    }`}
                  >
                    <span className="block truncate text-sm font-semibold">
                      {item.title}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Chip className={neutral}>{item.category}</Chip>
                      <span className="text-xs text-muted">
                        {item.owner_name}, {formatDate(item.started_at)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <section
            ref={panelRef}
            className="scroll-mt-4 rounded-[14px] border border-line bg-white p-5 md:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight">
                  {selected.title}
                </h2>
                <div className="mt-2">
                  <Chip className={neutral}>{selected.category}</Chip>
                </div>
              </div>
              <Chip className="bg-accent-soft text-accent">
                {selected.stage_name}
              </Chip>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Owner</dt>
                <dd className="mt-0.5 font-semibold">{selected.owner_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Submitted</dt>
                <dd className="mt-0.5 font-semibold">
                  {formatDate(selected.started_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Stage</dt>
                <dd className="mt-0.5 font-semibold">{selected.stage_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Attempt</dt>
                <dd className="mt-0.5 font-semibold">
                  {selected.attempt_number}
                  {selected.attempt_number > 1 && (
                    <span className="font-normal text-muted">
                      {" "}
                      (resubmitted)
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            <Link
              to={`/documents/${selected.document_id}`}
              className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
            >
              Open the document, files and history
            </Link>

            <div className="mt-5 border-t border-line pt-5">
              <DecisionPanel
                key={selected.document_id}
                documentId={selected.document_id}
                onDone={() => setReloadKey((key) => key + 1)}
              />
            </div>
          </section>
        </div>
      )}

      {!loading && tab === "history" && (
        <div className="mt-4">
          <div className="rounded-[14px] border border-line bg-white">
            {history.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">
                You haven't made any decisions yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {history.slice(0, historyShown).map((item) => (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/documents/${item.document_id}`}
                        className="font-semibold hover:text-accent"
                      >
                        {item.title}
                      </Link>
                      <StatusBadge status={item.action} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Stage {item.stage_order}, attempt {item.attempt_number}{" "}
                      &middot; {formatDateTime(item.created_at)}
                    </p>
                    {item.comment && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-page px-3 py-2 text-sm">
                        {item.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {history.length > historyShown && (
            <button
              onClick={() => setHistoryShown((n) => n + HISTORY_PAGE)}
              className={`${btnSecondary} mt-3`}
            >
              Show more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

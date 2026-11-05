import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../authContext.js";
import { getApproval, submitDocument } from "../api.js";
import { formatDate } from "../format.js";
import { btnPrimary, btnSecondary, inputClass } from "../ui.js";
import StatusBadge from "../components/StatusBadge.jsx";
import ApprovalStages from "../components/ApprovalStages.jsx";
import HistoryTimeline from "../components/HistoryTimeline.jsx";
import Attachments from "../components/Attachments.jsx";
import DecisionPanel from "../components/DecisionPanel.jsx";

function Panel({ title, children }) {
  return (
    <section className="rounded-[14px] border border-line bg-white">
      <h2 className="px-5 pt-4 text-[15px] font-semibold">{title}</h2>
      <div className="p-5 pt-3">{children}</div>
    </section>
  );
}

function Item({ label, className = "", children }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    getApproval(id)
      .then((result) => {
        if (!ignore) setData(result);
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
  }, [id]);

  async function handleSubmit() {
    const ok = window.confirm(
      "Submit this document for review? You can't edit it while it is under review.",
    );
    if (!ok) return;

    setError("");
    setSubmitting(true);
    try {
      const result = await submitDocument(id, note.trim());
      setData(result);
      setNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading...</p>;

  if (!data) {
    return (
      <div>
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
        <Link
          to="/documents"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Back to documents
        </Link>
      </div>
    );
  }

  const doc = data.document;
  const { attempts, history } = data;

  const isOwner = doc.owner_id === Number(user.id);
  const canEdit =
    isOwner && (doc.status === "DRAFT" || doc.status === "CHANGES_REQUESTED");
  const resubmitting = doc.status === "CHANGES_REQUESTED";

  const lastDecision = [...history]
    .reverse()
    .find((h) => h.action === "CHANGES_REQUESTED" || h.action === "REJECTED");
  const showDecision =
    lastDecision &&
    (doc.status === "CHANGES_REQUESTED" || doc.status === "REJECTED");
  const rejected = lastDecision?.action === "REJECTED";

  const currentAttempt = attempts[attempts.length - 1];
  const myStage =
    currentAttempt && doc.status === "PENDING_REVIEW"
      ? currentAttempt.stages.find(
          (s) => s.status === "PENDING" && s.reviewer_id === Number(user.id),
        )
      : null;

  return (
    <div>
      <Link to="/documents" className="text-sm text-muted hover:text-ink">
        &larr; Documents
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
            <StatusBadge status={doc.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {doc.category} &middot; Added by {doc.owner_name}
          </p>
        </div>
        {canEdit && (
          <Link to={`/documents/${doc.id}/edit`} className={btnSecondary}>
            Edit
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showDecision && (
        <div
          className={`mt-4 rounded-[14px] border px-5 py-3.5 text-sm ${
            rejected
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-orange-200 bg-orange-50 text-orange-900"
          }`}
        >
          <p className="font-semibold">
            {lastDecision.actor_name}{" "}
            {rejected ? "rejected this document" : "requested changes"}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{lastDecision.comment}</p>
        </div>
      )}

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <aside className="order-first lg:order-none lg:col-start-2 lg:row-start-1">
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-1">
              <Item label="Waiting on" className="col-span-2 lg:col-span-1">
                {doc.current_reviewer_name ? (
                  <>
                    {doc.current_reviewer_name}
                    <span className="block text-xs font-normal text-muted">
                      {doc.current_stage_name}
                    </span>
                  </>
                ) : (
                  <span className="font-normal text-muted">
                    Not under review
                  </span>
                )}
              </Item>
              <Item label="Category">{doc.category}</Item>
              <Item label="Owner">{doc.owner_name}</Item>
              <Item label="Created">{formatDate(doc.created_at)}</Item>
              <Item label="Last updated">{formatDate(doc.updated_at)}</Item>
            </dl>
          </Panel>
        </aside>

        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          <Panel title="Description">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {doc.description || (
                <span className="text-muted">No description.</span>
              )}
            </p>
          </Panel>

          {myStage && (
            <Panel title={`Your decision: ${myStage.stage_name}`}>
              <DecisionPanel documentId={doc.id} onDone={setData} />
            </Panel>
          )}

          {canEdit && (
            <Panel
              title={resubmitting ? "Resubmit for review" : "Submit for review"}
            >
              {!doc.workflow_id && (
                <p className="mb-3 text-sm text-amber-700">
                  Choose an approval workflow before submitting. Use Edit to
                  pick one.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  placeholder="Note for the reviewers (optional)"
                  className={`${inputClass} w-full`}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !doc.workflow_id}
                  className={`${btnPrimary} whitespace-nowrap`}
                >
                  {submitting
                    ? "Submitting..."
                    : resubmitting
                      ? "Resubmit"
                      : "Submit"}
                </button>
              </div>
            </Panel>
          )}

          <Panel title="Attachments">
            <Attachments
              documentId={doc.id}
              canEdit={canEdit}
              attemptCount={attempts.length}
            />
          </Panel>

          <Panel title="Approval stages">
            <ApprovalStages attempts={attempts} />
          </Panel>

          <Panel title="History">
            <HistoryTimeline history={history} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

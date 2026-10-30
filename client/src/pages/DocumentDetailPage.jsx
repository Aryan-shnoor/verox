import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../authContext.js";
import { getApproval, submitDocument } from "../api.js";
import { formatDate } from "../format.js";
import StatusBadge from "../components/StatusBadge.jsx";
import ApprovalStages from "../components/ApprovalStages.jsx";
import HistoryTimeline from "../components/HistoryTimeline.jsx";
import Attachments from "../components/Attachments.jsx";

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

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  if (!data) {
    return (
      <div>
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
        <Link
          to="/documents"
          className="mt-3 inline-block text-sm text-navy-700 underline"
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

  const lastDecision = [...history]
    .reverse()
    .find((h) => h.action === "CHANGES_REQUESTED" || h.action === "REJECTED");
  const showDecision =
    lastDecision &&
    (doc.status === "CHANGES_REQUESTED" || doc.status === "REJECTED");

  const sectionTitle = "text-sm font-semibold uppercase text-gray-500";

  return (
    <div className="max-w-4xl">
      <Link to="/documents" className="text-sm text-navy-700 hover:underline">
        Back to documents
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-navy-900">{doc.title}</h1>
          <StatusBadge status={doc.status} />
        </div>
        {canEdit && (
          <Link
            to={`/documents/${doc.id}/edit`}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Edit
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showDecision && (
        <div className="mt-4 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <p className="font-medium">
            {lastDecision.actor_name}{" "}
            {lastDecision.action === "REJECTED"
              ? "rejected this document"
              : "requested changes"}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{lastDecision.comment}</p>
        </div>
      )}

      <div className="mt-4 rounded border border-gray-200 bg-white p-4">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Category</dt>
            <dd>{doc.category}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Owner</dt>
            <dd>{doc.owner_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd>{formatDate(doc.created_at)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Last updated</dt>
            <dd>{formatDate(doc.updated_at)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Waiting on</dt>
            <dd>
              {doc.current_reviewer_name
                ? `${doc.current_reviewer_name} (${doc.current_stage_name})`
                : "-"}
            </dd>
          </div>
        </dl>

        <p className="mt-4 whitespace-pre-wrap border-t border-gray-100 pt-4 text-sm text-gray-700">
          {doc.description || "No description."}
        </p>
      </div>

      <h2 className={`mt-6 ${sectionTitle}`}>Attachments</h2>
      <div className="mt-2">
        <Attachments
          documentId={doc.id}
          canEdit={canEdit}
          attemptCount={attempts.length}
        />
      </div>

      {canEdit && (
        <div className="mt-4 rounded border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700">
            {doc.status === "CHANGES_REQUESTED"
              ? "Resubmit for review"
              : "Submit for review"}
          </p>

          {!doc.workflow_id && (
            <p className="mt-1 text-sm text-amber-700">
              Choose an approval workflow before submitting. Use Edit to pick
              one.
            </p>
          )}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder="Note for the reviewers (optional)"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !doc.workflow_id}
              className="whitespace-nowrap rounded bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60"
            >
              {submitting
                ? "Submitting..."
                : doc.status === "CHANGES_REQUESTED"
                  ? "Resubmit"
                  : "Submit"}
            </button>
          </div>
        </div>
      )}

      <h2 className={`mt-6 ${sectionTitle}`}>Approval stages</h2>
      <div className="mt-2">
        <ApprovalStages attempts={attempts} />
      </div>

      <h2 className={`mt-6 ${sectionTitle}`}>History</h2>
      <div className="mt-2 rounded border border-gray-200 bg-white p-4">
        <HistoryTimeline history={history} />
      </div>
    </div>
  );
}

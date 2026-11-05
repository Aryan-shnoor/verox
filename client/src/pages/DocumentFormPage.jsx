import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../authContext.js";
import {
  getDocument,
  createDocument,
  updateDocument,
  getWorkflows,
  uploadAttachment,
} from "../api.js";
import { CATEGORIES } from "../constants.js";
import { btnPrimary, btnSecondary, inputClass } from "../ui.js";

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    workflowId: "",
  });
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [createdId, setCreatedId] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const list = await getWorkflows();
        if (ignore) return;
        setWorkflows(list);

        if (isEdit) {
          const doc = await getDocument(id);
          if (ignore) return;

          const editable =
            doc.status === "DRAFT" || doc.status === "CHANGES_REQUESTED";
          if (doc.owner_id !== Number(user.id) || !editable) {
            setBlocked("This document can't be edited right now.");
          }

          setForm({
            title: doc.title,
            category: doc.category,
            description: doc.description || "",
            workflowId: doc.workflow_id ? String(doc.workflow_id) : "",
          });
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id, isEdit, user.id]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function addFiles(e) {
    const picked = Array.from(e.target.files);
    e.target.value = "";

    const next = [...files];
    const problems = [];
    for (const file of picked) {
      if (file.size > MAX_SIZE) {
        problems.push(`${file.name} is over 5 MB.`);
      } else if (next.length >= MAX_FILES) {
        problems.push(`You can attach up to ${MAX_FILES} files here.`);
      } else {
        next.push(file);
      }
    }

    setFiles(next);
    setFileError([...new Set(problems)].join(" "));
  }

  function removeFile(index) {
    setFiles(files.filter((_, i) => i !== index));
    setFileError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const data = {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
    };
    if (form.workflowId) data.workflowId = Number(form.workflowId);

    try {
      if (isEdit) {
        const saved = await updateDocument(id, data);
        navigate(`/documents/${saved.id}`);
        return;
      }

      const saved = await createDocument(data);

      const failed = [];
      for (const file of files) {
        try {
          await uploadAttachment(saved.id, file);
        } catch (err) {
          failed.push(`${file.name}: ${err.message}`);
        }
      }

      if (failed.length === 0) {
        navigate(`/documents/${saved.id}`);
        return;
      }

      setCreatedId(saved.id);
      setError(
        `The document was created, but some files were not uploaded. ${failed.join(" ")}`,
      );
      setSaving(false);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading...</p>;

  if (blocked) {
    return (
      <div className="max-w-2xl">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {blocked}
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

  const categories =
    !form.category || CATEGORIES.includes(form.category)
      ? CATEGORIES
      : [form.category, ...CATEGORIES];

  const chosen = workflows.find(
    (workflow) => String(workflow.id) === form.workflowId,
  );

  const labelClass = "mb-1.5 block text-[13px] font-semibold";
  const fieldClass = `${inputClass} block w-full`;

  return (
    <div className="max-w-2xl">
      <Link
        to={isEdit ? `/documents/${id}` : "/documents"}
        className="text-sm text-muted hover:text-ink"
      >
        &larr; {isEdit ? "Back to document" : "Documents"}
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">
        {isEdit ? "Edit document" : "New document"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isEdit
          ? "Update the details, then submit it for review from the document page."
          : "Save it as a draft now and submit it when it's ready."}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-5 rounded-[14px] border border-line bg-white p-5 md:p-6"
      >
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={200}
            disabled={saving || createdId}
            value={form.title}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <select
              id="category"
              name="category"
              required
              disabled={saving || createdId}
              value={form.category}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="workflowId" className={labelClass}>
              Approval workflow
            </label>
            <select
              id="workflowId"
              name="workflowId"
              disabled={saving || createdId}
              value={form.workflowId}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value="">Choose later</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {chosen ? (
          <div className="rounded-lg bg-page px-4 py-3">
            <p className="text-xs font-semibold text-muted">
              Reviewed in this order
            </p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {chosen.stages.map((stage) => (
                <li key={stage.id} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white text-xs font-semibold text-muted">
                    {stage.stage_order}
                  </span>
                  <span className="font-medium">{stage.stage_name}</span>
                  <span className="text-muted">{stage.reviewer_name}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="-mt-2 text-xs text-muted">
            You can save a draft now and pick the workflow before submitting.
          </p>
        )}

        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            disabled={saving || createdId}
            value={form.description}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        {!isEdit && (
          <div>
            <p className={labelClass}>
              Attachments{" "}
              <span className="font-normal text-muted">(optional)</span>
            </p>

            <label className="block cursor-pointer rounded-lg border border-dashed border-line-strong bg-page px-4 py-5 text-center hover:border-accent">
              <span className="text-sm font-semibold text-accent">
                Choose files
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                PDF, Word, Excel, PNG, JPG or TXT. Up to {MAX_FILES} files, 5 MB
                each.
              </span>
              <input
                type="file"
                multiple
                hidden
                accept={ACCEPT}
                disabled={saving || createdId}
                onChange={addFiles}
              />
            </label>

            {fileError && (
              <p className="mt-2 text-xs text-red-700">{fileError}</p>
            )}

            {files.length > 0 && (
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {file.name}
                      <span className="ml-2 text-xs text-muted">
                        {formatSize(file.size)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={saving || createdId}
                      className="text-xs font-medium text-red-700 hover:underline disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isEdit && (
          <p className="text-xs text-muted">
            Files are added and removed on the document page.
          </p>
        )}

        <div className="flex gap-2 border-t border-line pt-5">
          {createdId ? (
            <Link to={`/documents/${createdId}`} className={btnPrimary}>
              Open the document
            </Link>
          ) : (
            <>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving
                  ? files.length > 0 && !isEdit
                    ? "Creating and uploading..."
                    : "Saving..."
                  : isEdit
                    ? "Save changes"
                    : "Create draft"}
              </button>
              <Link
                to={isEdit ? `/documents/${id}` : "/documents"}
                className={btnSecondary}
              >
                Cancel
              </Link>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

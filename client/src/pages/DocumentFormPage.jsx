import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../authContext.js";
import {
  getDocument,
  createDocument,
  updateDocument,
  getWorkflows,
} from "../api.js";
import { CATEGORIES } from "../constants.js";

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
      if (isEdit) await updateDocument(id, data);
      else await createDocument(data);
      navigate("/documents");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  if (blocked) {
    return (
      <div>
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {blocked}
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

  // keep the saved category selectable even if it isn't in our list
  const categories =
    !form.category || CATEGORIES.includes(form.category)
      ? CATEGORIES
      : [form.category, ...CATEGORIES];

  const inputClass =
    "mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none";

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-navy-900">
        {isEdit ? "Edit document" : "New document"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-4 rounded border border-gray-200 bg-white p-4 md:p-6"
      >
        {error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <label className="block text-sm font-medium text-gray-700">
          Title
          <input
            name="title"
            required
            maxLength={200}
            value={form.title}
            onChange={handleChange}
            className={inputClass}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Category
          <select
            name="category"
            required
            value={form.category}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Description
          <textarea
            name="description"
            rows={5}
            value={form.description}
            onChange={handleChange}
            className={inputClass}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Approval workflow
          <select
            name="workflowId"
            value={form.workflowId}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Choose later</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}:{" "}
                {workflow.stages.map((s) => s.reviewer_name).join(" > ")}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-gray-500">
            You can save a draft now and pick the workflow before submitting.
          </span>
        </label>

        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create draft"}
          </button>
          <Link
            to="/documents"
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

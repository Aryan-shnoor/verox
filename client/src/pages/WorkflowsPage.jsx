import { useEffect, useState } from "react";
import {
  getWorkflows,
  getReviewers,
  createWorkflow,
  setWorkflowActive,
} from "../api.js";
import { CATEGORIES } from "../constants.js";
import { btnPrimary, btnSecondary, inputClass } from "../ui.js";

const PAGE_SIZE = 6;

function makeEmptyForm() {
  return {
    name: "",
    category: "",
    description: "",
    stages: [{ stageName: "", reviewerId: "" }],
  };
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(makeEmptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    Promise.all([getWorkflows(), getReviewers()])
      .then(([workflowList, reviewerList]) => {
        if (ignore) return;
        setWorkflows(workflowList);
        setReviewers(reviewerList);
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

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function updateStage(index, changes) {
    setForm({
      ...form,
      stages: form.stages.map((stage, i) =>
        i === index ? { ...stage, ...changes } : stage,
      ),
    });
  }

  function addStage() {
    setForm({
      ...form,
      stages: [...form.stages, { stageName: "", reviewerId: "" }],
    });
  }

  function removeStage(index) {
    setForm({ ...form, stages: form.stages.filter((_, i) => i !== index) });
  }

  function closeForm() {
    setShowForm(false);
    setForm(makeEmptyForm());
    setFormError("");
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      await createWorkflow({
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        stages: form.stages.map((stage) => ({
          stageName: stage.stageName.trim(),
          reviewerId: Number(stage.reviewerId),
        })),
      });
      closeForm();
      setReloadKey((key) => key + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(workflow) {
    setError("");
    try {
      await setWorkflowActive(workflow.id, !workflow.is_active);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  const labelClass = "mb-1.5 block text-[13px] font-semibold";
  const fieldClass = `${inputClass} block w-full`;
  const shown = workflows.slice(0, visible);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted">
            Create approval flows and choose a reviewer for each stage.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className={btnPrimary}>
            New workflow
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-5 rounded-[14px] border border-line bg-white p-5 md:p-6"
        >
          <h2 className="text-[15px] font-semibold">New workflow</h2>

          {formError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClass}>
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={150}
                value={form.name}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="category" className={labelClass}>
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                value={form.category}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="">Choose a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <input
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>

          <p className="mt-5 text-[13px] font-semibold">
            Stages, reviewed in this order
          </p>
          <div className="mt-2 space-y-2">
            {form.stages.map((stage, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg bg-page p-3 sm:flex-row sm:items-center"
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white text-xs font-semibold text-muted">
                  {index + 1}
                </span>
                <input
                  required
                  maxLength={120}
                  placeholder="Stage name"
                  value={stage.stageName}
                  onChange={(e) =>
                    updateStage(index, { stageName: e.target.value })
                  }
                  className={fieldClass}
                />
                <select
                  required
                  value={stage.reviewerId}
                  onChange={(e) =>
                    updateStage(index, { reviewerId: e.target.value })
                  }
                  className={fieldClass}
                >
                  <option value="">Choose reviewer</option>
                  {reviewers.map((reviewer) => (
                    <option key={reviewer.id} value={reviewer.id}>
                      {reviewer.full_name} (
                      {reviewer.role === "ADMIN" ? "Admin" : "Reviewer"})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeStage(index)}
                  disabled={form.stages.length === 1}
                  className="text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStage}
            disabled={form.stages.length >= 10}
            className="mt-3 text-sm font-medium text-accent hover:underline disabled:opacity-40"
          >
            + Add stage
          </button>

          <div className="mt-6 flex gap-2 border-t border-line pt-5">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Creating..." : "Create workflow"}
            </button>
            <button type="button" onClick={closeForm} className={btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && <p className="mt-5 text-sm text-muted">Loading...</p>}

      {!loading && workflows.length === 0 && (
        <p className="mt-5 rounded-[14px] border border-line bg-white px-5 py-10 text-center text-sm text-muted">
          No workflows yet.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {!loading &&
          shown.map((workflow) => (
            <section
              key={workflow.id}
              className={`rounded-[14px] border border-line bg-white p-5 ${
                workflow.is_active ? "" : "opacity-75"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-[15px] font-semibold">
                      {workflow.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        workflow.is_active
                          ? "bg-[#d9f2e3] text-[#11613a]"
                          : "bg-[#eceef2] text-[#454d5c]"
                      }`}
                    >
                      {workflow.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {workflow.category}
                    {workflow.description && ` \u00b7 ${workflow.description}`}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(workflow)}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {workflow.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>

              <ol className="mt-4 flex flex-wrap items-center gap-y-2">
                {workflow.stages.map((stage, index) => (
                  <li key={stage.id} className="flex items-center">
                    <span className="rounded-lg bg-page px-3 py-2 text-sm">
                      <span className="font-semibold">
                        {stage.stage_order}. {stage.stage_name}
                      </span>
                      <span className="block text-xs text-muted">
                        {stage.reviewer_name}
                      </span>
                    </span>
                    {index < workflow.stages.length - 1 && (
                      <span className="px-2 text-muted" aria-hidden="true">
                        &rsaquo;
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
      </div>

      {!loading && workflows.length > visible && (
        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={() => setVisible((n) => n + PAGE_SIZE)}
            className={btnSecondary}
          >
            Show more
          </button>
          <p className="text-xs text-muted">
            Showing {shown.length} of {workflows.length}
          </p>
        </div>
      )}
    </div>
  );
}

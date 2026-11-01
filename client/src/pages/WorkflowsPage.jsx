import { useEffect, useState } from "react";
import {
  getWorkflows,
  getReviewers,
  createWorkflow,
  setWorkflowActive,
} from "../api.js";
import { CATEGORIES } from "../constants.js";

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

  const inputClass =
    "mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none";

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-navy-900">Workflows</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-navy-700 px-3 py-2 text-sm font-medium text-white hover:bg-navy-900"
          >
            New workflow
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded border border-gray-200 bg-white p-4 md:p-6"
        >
          <h2 className="text-sm font-semibold uppercase text-gray-500">
            New workflow
          </h2>

          {formError && (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Name
              <input
                name="name"
                required
                maxLength={150}
                value={form.name}
                onChange={handleChange}
                className={inputClass}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Category
              <select
                name="category"
                required
                value={form.category}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Choose a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Description
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              className={inputClass}
            />
          </label>

          <p className="mt-4 text-sm font-medium text-gray-700">
            Stages (reviewed in this order)
          </p>
          <div className="mt-2 space-y-2">
            {form.stages.map((stage, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <span className="w-6 text-sm text-gray-500">{index + 1}.</span>
                <input
                  required
                  maxLength={120}
                  placeholder="Stage name"
                  value={stage.stageName}
                  onChange={(e) =>
                    updateStage(index, { stageName: e.target.value })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                />
                <select
                  required
                  value={stage.reviewerId}
                  onChange={(e) =>
                    updateStage(index, { reviewerId: e.target.value })
                  }
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
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
                  className="text-sm text-red-700 hover:underline disabled:opacity-40"
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
            className="mt-3 text-sm text-navy-700 hover:underline disabled:opacity-40"
          >
            Add stage
          </button>

          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create workflow"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Workflow</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Stages</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No workflows yet.
                </td>
              </tr>
            )}

            {!loading &&
              workflows.map((workflow) => (
                <tr
                  key={workflow.id}
                  className={`border-b border-gray-100 align-top last:border-0 ${
                    workflow.is_active ? "" : "text-gray-500"
                  }`}
                >
                  <td className="px-4 py-2">
                    <p className="font-medium">{workflow.name}</p>
                    {workflow.description && (
                      <p className="text-xs text-gray-500">
                        {workflow.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2">{workflow.category}</td>
                  <td className="px-4 py-2">
                    <ol className="space-y-0.5">
                      {workflow.stages.map((stage) => (
                        <li key={stage.id}>
                          {stage.stage_order}. {stage.stage_name} (
                          {stage.reviewer_name})
                        </li>
                      ))}
                    </ol>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        workflow.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {workflow.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggleActive(workflow)}
                      className="text-sm text-navy-700 hover:underline"
                    >
                      {workflow.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

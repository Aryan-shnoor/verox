const workflowService = require("../services/workflowService");
const parseId = require("../utils/parseId");

async function listWorkflows(req, res, next) {
  try {
    const onlyActive = req.user.role !== "ADMIN";
    res.json(await workflowService.listWorkflows(onlyActive));
  } catch (err) {
    next(err);
  }
}

async function getWorkflow(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid workflow ID." });

  try {
    const onlyActive = req.user.role !== "ADMIN";
    const workflow = await workflowService.getWorkflowById(id, onlyActive);
    if (!workflow)
      return res.status(404).json({ message: "Workflow not found." });
    res.json(workflow);
  } catch (err) {
    next(err);
  }
}

async function listReviewers(req, res, next) {
  try {
    res.json(await workflowService.listReviewers());
  } catch (err) {
    next(err);
  }
}

async function createWorkflow(req, res, next) {
  const { name, category, description, stages } = req.body || {};

  if (typeof name !== "string" || !name.trim() || name.trim().length > 150) {
    return res
      .status(400)
      .json({ message: "Name is required (max 150 characters)." });
  }
  if (
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 100
  ) {
    return res
      .status(400)
      .json({ message: "Category is required (max 100 characters)." });
  }
  if (description != null && typeof description !== "string") {
    return res.status(400).json({ message: "Description must be text." });
  }
  if (!Array.isArray(stages) || stages.length === 0 || stages.length > 10) {
    return res.status(400).json({ message: "Add between 1 and 10 stages." });
  }

  for (let i = 0; i < stages.length; i++) {
    const { stageName, reviewerId } = stages[i] || {};
    if (
      typeof stageName !== "string" ||
      !stageName.trim() ||
      stageName.trim().length > 120
    ) {
      return res
        .status(400)
        .json({
          message: `Stage ${i + 1}: a name is required (max 120 characters).`,
        });
    }
    if (!parseId(reviewerId)) {
      return res
        .status(400)
        .json({ message: `Stage ${i + 1}: choose a reviewer.` });
    }
  }

  try {
    const reviewerIds = stages.map((s) => parseId(s.reviewerId));
    const found = await workflowService.findReviewers(reviewerIds);

    const stageList = [];
    for (let i = 0; i < stages.length; i++) {
      const reviewer = found.find((r) => r.id === reviewerIds[i]);
      if (!reviewer) {
        return res.status(400).json({
          message: `Stage ${i + 1}: the reviewer must be an existing reviewer or admin.`,
        });
      }
      stageList.push({
        stageName: stages[i].stageName.trim(),
        reviewerId: reviewer.id,
        reviewerRole: reviewer.role,
      });
    }

    const workflowId = await workflowService.createWorkflow({
      name: name.trim(),
      category: category.trim(),
      description,
      stages: stageList,
      createdBy: req.user.id,
    });

    const workflow = await workflowService.getWorkflowById(workflowId, false);
    res.status(201).json(workflow);
  } catch (err) {
    next(err);
  }
}

async function setWorkflowActive(req, res, next) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid workflow ID." });

  const { isActive } = req.body || {};
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be true or false." });
  }

  try {
    const updated = await workflowService.setActive(id, isActive);
    if (!updated)
      return res.status(404).json({ message: "Workflow not found." });

    res.json(await workflowService.getWorkflowById(id, false));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listWorkflows,
  getWorkflow,
  listReviewers,
  createWorkflow,
  setWorkflowActive,
};

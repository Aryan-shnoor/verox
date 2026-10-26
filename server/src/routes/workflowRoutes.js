const express = require("express");
const {
  listWorkflows,
  getWorkflow,
  listReviewers,
  createWorkflow,
  setWorkflowActive,
} = require("../controllers/workflowController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/reviewers", requireRole("ADMIN"), listReviewers);
router.get("/", listWorkflows);
router.get("/:id", getWorkflow);
router.post("/", requireRole("ADMIN"), createWorkflow);
router.patch("/:id", requireRole("ADMIN"), setWorkflowActive);

module.exports = router;

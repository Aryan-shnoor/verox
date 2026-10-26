const express = require("express");
const {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
} = require("../controllers/documentController");

const {
  submitDocument,
  getApproval,
  decideDocument,
} = require("../controllers/approvalController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.post("/", createDocument);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.patch("/:id", updateDocument);
router.post("/:id/submit", submitDocument);
router.get("/:id/approval", getApproval);
router.post("/:id/decision", requireRole("REVIEWER", "ADMIN"), decideDocument);

module.exports = router;

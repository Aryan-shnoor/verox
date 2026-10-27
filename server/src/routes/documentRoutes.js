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

const upload = require("../middleware/upload");
const {
  uploadAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachment,
} = require("../controllers/attachmentController");

const router = express.Router();

router.use(requireAuth);

router.post("/", createDocument);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.patch("/:id", updateDocument);
router.post("/:id/submit", submitDocument);
router.get("/:id/approval", getApproval);
router.post("/:id/decision", requireRole("REVIEWER", "ADMIN"), decideDocument);
//attachment routes
router.post("/:id/attachments", upload.single("file"), uploadAttachment);
router.get("/:id/attachments", listAttachments);
router.get("/:id/attachments/:attachmentId", downloadAttachment);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

module.exports = router;

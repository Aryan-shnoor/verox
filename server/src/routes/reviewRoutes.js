const express = require("express");
const {
  listPending,
  listReviewHistory,
  reviewSummary,
} = require("../controllers/approvalController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireRole("REVIEWER", "ADMIN"));

router.get("/pending", listPending);
router.get("/history", listReviewHistory);
router.get("/summary", reviewSummary);

module.exports = router;

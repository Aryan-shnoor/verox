const multer = require("multer");
const httpError = require("../utils/httpError");

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(
        httpError(
          400,
          "File type not allowed. Use PDF, Word, Excel, PNG, JPG or TXT.",
        ),
      );
    }
    cb(null, true);
  },
});

module.exports = upload;

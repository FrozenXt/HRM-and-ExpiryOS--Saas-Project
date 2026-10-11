const service = require("../services/backup.service");
const { successResponse, errorResponse } = require("../utils/api-response");

const wrap =
  (fn, message, code = 400) =>
  async (req, res) => {
    try {
      return successResponse(res, message, await fn(req));
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || code);
    }
  };

module.exports = {
  index: wrap((req) => service.list(req.user, req.query), "Backups fetched"),
  status: wrap((req) => service.status(req.user), "Backup status fetched"),
  run: wrap(
    (req) => service.runManual(req.user, req.body || {}),
    "Backup completed",
  ),
  remove: wrap(
    (req) => service.remove(req.user, req.params.id),
    "Backup deleted",
  ),

  async download(req, res) {
    try {
      const { filePath, fileName } = await service.getForDownload(
        req.user,
        req.params.id,
      );
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      return res.download(filePath, fileName);
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || 400);
    }
  },
};

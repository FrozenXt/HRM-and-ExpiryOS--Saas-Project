const advanceSalaryService = require("../services/advance-salary.service");
const SearchHelper = require("../helpers/search.helper");

const run =
  (fn, okStatus = 200) =>
  async (req, res) => {
    try {
      const data = await fn(req);
      res.status(okStatus).json({ success: true, data });
    } catch (err) {
      res
        .status(err.statusCode || 400)
        .json({ success: false, message: err.message });
    }
  };

exports.index = run((req) =>
  advanceSalaryService.getAll(
    new SearchHelper({ ...req.query, ...req.body }),
    req.user,
  ),
);

exports.show = run((req) =>
  advanceSalaryService.getById(req.params.id, req.user),
);

exports.create = run(
  (req) => advanceSalaryService.create(req.body, req.user),
  201,
);

exports.review = run((req) =>
  advanceSalaryService.review(req.params.id, req.body, req.user),
);

exports.cancel = run((req) =>
  advanceSalaryService.cancel(req.params.id, req.user),
);

exports.destroy = run((req) =>
  advanceSalaryService.remove(req.params.id, req.user),
);

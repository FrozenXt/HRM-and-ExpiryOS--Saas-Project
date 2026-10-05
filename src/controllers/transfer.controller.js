const transferService = require("../services/transfer.service");
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
  transferService.getAll(
    new SearchHelper({ ...req.query, ...req.body }),
    req.user,
  ),
);

exports.show = run((req) => transferService.getById(req.params.id, req.user));

exports.create = run((req) => transferService.create(req.body, req.user), 201);

exports.review = run((req) =>
  transferService.review(req.params.id, req.body, req.user),
);

exports.cancel = run((req) => transferService.cancel(req.params.id, req.user));

exports.destroy = run((req) => transferService.remove(req.params.id, req.user));

const resignationService = require("../services/resignation.service");
const SearchHelper = require("../helpers/search.helper");

// Wraps a handler so every action returns { success, data } or { success: false, message }.
// Swap this for your own response helper if you already have one.
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
  resignationService.getAll(
    new SearchHelper({ ...req.query, ...req.body }),
    req.user,
  ),
);

exports.show = run((req) =>
  resignationService.getById(req.params.id, req.user),
);

exports.create = run(
  (req) => resignationService.create(req.body, req.user),
  201,
);

exports.review = run((req) =>
  resignationService.review(req.params.id, req.body, req.user),
);

exports.withdraw = run((req) =>
  resignationService.withdraw(req.params.id, req.user),
);

exports.destroy = run((req) =>
  resignationService.remove(req.params.id, req.user),
);

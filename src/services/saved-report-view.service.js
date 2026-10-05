const savedReportViewRepository = require("../repositories/saved-report-view.repository");

class SavedReportViewService {
  _scopeFor(user) {
    return { userId: user._id };
  }

  async getAll(searchHelper, user) {
    return await savedReportViewRepository.findAll(
      searchHelper,
      this._scopeFor(user),
    );
  }

  async getById(id, user) {
    const view = await savedReportViewRepository.findById(
      id,
      this._scopeFor(user),
    );
    if (!view) {
      const err = new Error("Saved report view not found");
      err.statusCode = 404;
      throw err;
    }
    return view;
  }

  async create(data, user) {
    if (!data.name) {
      const err = new Error("name is required");
      err.statusCode = 400;
      throw err;
    }
    return await savedReportViewRepository.create({
      name: data.name,
      filters: data.filters || {},
      userId: user._id,
      companyId: user.companyId || null,
    });
  }

  async update(id, data, user) {
    const payload = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.filters !== undefined) payload.filters = data.filters;

    const view = await savedReportViewRepository.update(
      id,
      this._scopeFor(user),
      payload,
    );
    if (!view) {
      const err = new Error("Saved report view not found");
      err.statusCode = 404;
      throw err;
    }
    return view;
  }

  async remove(id, user) {
    const view = await savedReportViewRepository.delete(
      id,
      this._scopeFor(user),
    );
    if (!view) {
      const err = new Error("Saved report view not found");
      err.statusCode = 404;
      throw err;
    }
    return view;
  }
}

module.exports = new SavedReportViewService();

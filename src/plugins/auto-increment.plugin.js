const Counter = require("../models/counter.model");

function autoIncrementId(schema, options = {}) {
  const fieldName = options.fieldName || "id_int";
  const sequenceName = options.sequenceName;

  if (!sequenceName) {
    throw new Error('autoIncrementId plugin requires a "sequenceName" option');
  }

  if (!schema.path(fieldName)) {
    schema.add({
      [fieldName]: {
        type: Number,
        unique: true,
        index: true,
      },
    });
  }

  schema.pre("save", async function () {
    // Only assign once, on first insert.
    if (!this.isNew || this[fieldName] != null) {
      return;
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: sequenceName },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
      },
    );

    this[fieldName] = counter.seq;
  });
}

module.exports = autoIncrementId;

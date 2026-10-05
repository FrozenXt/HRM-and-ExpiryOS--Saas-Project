const User = require("../models/user.model");

async function attachProfileImage(records, userField = "userId") {
  const list = (records || []).map((r) =>
    typeof r.toObject === "function" ? r.toObject() : r,
  );

  const ids = [
    ...new Set(list.map((r) => r[userField]?.toString()).filter(Boolean)),
  ];
  if (ids.length === 0) {
    return list.map((r) => ({ ...r, profileImage: null }));
  }

  const users = await User.find({ _id: { $in: ids } })
    .select("profileImage")
    .lean();
  const map = new Map(users.map((u) => [u._id.toString(), u.profileImage]));

  return list.map((r) => ({
    ...r,
    profileImage: map.get(r[userField]?.toString()) ?? null,
  }));
}

module.exports = { attachProfileImage };

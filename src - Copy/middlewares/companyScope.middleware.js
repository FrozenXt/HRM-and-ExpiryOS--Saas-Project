const companyScope = (req, res, next) => {
  if (req.user.role === "super_admin") {
    req.companyFilter = {};
  } else {
    req.companyFilter = { companyId: req.user.companyId };
  }
  next();
};

module.exports = companyScope;

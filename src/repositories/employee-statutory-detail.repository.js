const EmployeeStatutoryDetail = require("../models/employee-statutory-detail.model");

// Shared populate chain: employeeId -> its userId (for the person's name)
// plus department/designation for context, and companyId -> company name.
// Kept as a function so findAll/findById/findByEmployeeId all stay in sync
// if you ever need to add/remove a populated field.
function withDetails(query) {
  return query
    .populate({
      path: "employeeId",
      select: "userId departmentId designationId id_int",
      populate: [
        { path: "userId", select: "firstName lastName email" },
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
      ],
    })
    .populate("companyId", "legalName tradeName");
}

class EmployeeStatutoryDetailRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      withDetails(
        EmployeeStatutoryDetail.find(filters)
          .sort(searchHelper.getSort())
          .skip(searchHelper.getSkip())
          .limit(searchHelper.getLimit()),
      ),
      EmployeeStatutoryDetail.countDocuments(filters),
    ]);
    return { data, total };
  }

  async findById(id) {
    return await withDetails(EmployeeStatutoryDetail.findById(id));
  }

  async findByEmployeeId(employeeId) {
    return await EmployeeStatutoryDetail.findOne({ employeeId });
  }

  async create(data) {
    return await EmployeeStatutoryDetail.create(data);
  }

  async update(id, data) {
    return await EmployeeStatutoryDetail.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await EmployeeStatutoryDetail.findByIdAndDelete(id);
  }

  // Internal use only (e.g. future payroll/payslip generation) — never
  // wired to a controller. Explicitly selects + decrypts the sensitive fields.
  async findDecryptedByEmployeeId(employeeId) {
    const { decrypt } = require("../utils/encryption");
    const doc = await EmployeeStatutoryDetail.findOne({ employeeId }).select(
      "+aadhaarNumber +bankAccountNumber",
    );
    if (!doc) return null;
    return {
      ...doc.toObject(),
      aadhaarNumber: doc.aadhaarNumber ? decrypt(doc.aadhaarNumber) : null,
      bankAccountNumber: decrypt(doc.bankAccountNumber),
    };
  }
}

module.exports = new EmployeeStatutoryDetailRepository();

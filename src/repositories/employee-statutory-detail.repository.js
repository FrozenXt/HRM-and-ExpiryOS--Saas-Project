const EmployeeStatutoryDetail = require("../models/employee-statutory-detail.model");
const { maskLastN, decrypt } = require("../utils/encryption");

// Shared populate chain: employeeId -> its userId (name, email, photo) plus
// department/designation, and companyId -> company name.
function withDetails(query) {
  return query
    .populate({
      path: "employeeId",
      select: "userId departmentId designationId id_int status",
      populate: [
        {
          path: "userId",
          select: "firstName lastName email profileImage",
        },
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
      ],
    })
    .populate("companyId", "legalName tradeName");
}

const SENSITIVE = "+aadhaarNumber +bankAccountNumber";

const safeMask = (value) => {
  if (!value) return null;
  try {
    return maskLastN(decrypt(value));
  } catch {
    return null; // unreadable value: never leak the stored ciphertext
  }
};

// Keeps every existing field (including the nested populated objects) and
// adds flat ones. Aadhaar and bank account are always returned masked.
function shape(docs) {
  return docs.map((doc) => {
    const r = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };

    const emp =
      r.employeeId && typeof r.employeeId === "object" ? r.employeeId : null;
    const user =
      emp?.userId && typeof emp.userId === "object" ? emp.userId : null;
    const company =
      r.companyId && typeof r.companyId === "object" ? r.companyId : null;

    return {
      ...r,
      aadhaarNumber: safeMask(r.aadhaarNumber),
      bankAccountNumber: safeMask(r.bankAccountNumber),

      employeeName: user
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : null,
      profileImage: user?.profileImage ?? null,
      email: user?.email ?? null,
      employeeCode: emp?.id_int ?? null,
      employeeStatus: emp?.status ?? null,
      department: emp?.departmentId?.name ?? null,
      designation: emp?.designationId?.name ?? null,
      companyName: company?.legalName || company?.tradeName || null,
    };
  });
}

class EmployeeStatutoryDetailRepository {
  shape(docs) {
    return shape(docs);
  }

  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      withDetails(
        EmployeeStatutoryDetail.find(filters)
          .select(SENSITIVE)
          .sort(searchHelper.getSort())
          .skip(searchHelper.getSkip())
          .limit(searchHelper.getLimit()),
      ),
      EmployeeStatutoryDetail.countDocuments(filters),
    ]);
    return { data: shape(data), total };
  }

  async findById(id) {
    return await withDetails(EmployeeStatutoryDetail.findById(id));
  }

  // Same as findById, but includes the encrypted fields so they can be masked.
  async findByIdFull(id) {
    return await withDetails(
      EmployeeStatutoryDetail.findById(id).select(SENSITIVE),
    );
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

  // Internal use only (e.g. payroll/payslip generation) — never wired to a
  // controller. Explicitly selects + decrypts the sensitive fields.
  async findDecryptedByEmployeeId(employeeId) {
    const doc = await EmployeeStatutoryDetail.findOne({ employeeId }).select(
      SENSITIVE,
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

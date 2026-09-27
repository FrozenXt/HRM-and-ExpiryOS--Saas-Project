const jobPostingRepository = require("../repositories/job-posting.repository");
const departmentRepository = require("../repositories/department.repository");
const designationRepository = require("../repositories/designation.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class JobPostingService {
  async getAll(searchHelper, actingUser) {
    const scopeFilters = TenantScope.scopeFilters(actingUser);
    return await jobPostingRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await jobPostingRepository.findById(id);
    if (!doc) throw new Error("Job posting not found");
    TenantScope.assertAccess(actingUser, doc, "Job posting not found");
    return doc;
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    const department = await departmentRepository.findById(data.departmentId);
    if (
      !department ||
      department.companyId.toString() !== companyId.toString()
    ) {
      throw new Error("departmentId must belong to the same company");
    }

    if (data.designationId) {
      const designation = await designationRepository.findById(
        data.designationId,
      );
      if (
        !designation ||
        designation.companyId.toString() !== companyId.toString()
      ) {
        throw new Error("designationId must belong to the same company");
      }
    }

    return await jobPostingRepository.create({
      companyId,
      title: data.title,
      departmentId: data.departmentId,
      designationId: data.designationId ?? null,
      description: data.description,
      requirements: data.requirements ?? [],
      employmentType: data.employmentType,
      numberOfOpenings: data.numberOfOpenings ?? 1,
      status: data.status ?? "open",
      postedBy: actingUser._id,
      closingDate: data.closingDate ?? null,
    });
  }

  async update(id, data, actingUser) {
    const doc = await jobPostingRepository.findById(id);
    if (!doc) throw new Error("Job posting not found");
    TenantScope.assertAccess(actingUser, doc, "Job posting not found");

    const { companyId, postedBy, ...safeData } = data;

    if (safeData.departmentId) {
      const department = await departmentRepository.findById(
        safeData.departmentId,
      );
      if (
        !department ||
        department.companyId.toString() !== doc.companyId.toString()
      ) {
        throw new Error("departmentId must belong to the same company");
      }
    }
    if (safeData.designationId) {
      const designation = await designationRepository.findById(
        safeData.designationId,
      );
      if (
        !designation ||
        designation.companyId.toString() !== doc.companyId.toString()
      ) {
        throw new Error("designationId must belong to the same company");
      }
    }

    return await jobPostingRepository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const doc = await jobPostingRepository.findById(id);
    if (!doc) throw new Error("Job posting not found");
    TenantScope.assertAccess(actingUser, doc, "Job posting not found");
    await jobPostingRepository.delete(id);
    return doc;
  }
}

module.exports = new JobPostingService();

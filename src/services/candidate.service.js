const candidateRepository = require("../repositories/candidate.repository");
const jobPostingRepository = require("../repositories/job-posting.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

const VALID_STATUSES = [
  "applied",
  "shortlisted",
  "interview_scheduled",
  "interviewed",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
];

class CandidateService {
  async getAll(searchHelper, actingUser) {
    const scopeFilters = TenantScope.scopeFilters(actingUser);
    return await candidateRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await candidateRepository.findById(id);
    if (!doc) throw new Error("Candidate not found");
    TenantScope.assertAccess(actingUser, doc, "Candidate not found");
    return doc;
  }

  async create(data, file, actingUser) {
    if (!file) throw new Error("resume file is required");

    const jobPosting = await jobPostingRepository.findById(data.jobPostingId);
    if (!jobPosting)
      throw new Error("jobPostingId does not refer to an existing job posting");

    if (
      actingUser.role !== "super_admin" &&
      jobPosting.companyId.toString() !== actingUser.companyId.toString()
    ) {
      throw new Error("jobPostingId must belong to your own company");
    }

    if (data.referredBy) {
      const referrer = await employeeRepository.findById(data.referredBy);
      if (
        !referrer ||
        referrer.companyId.toString() !== jobPosting.companyId.toString()
      ) {
        throw new Error("referredBy must be an employee in the same company");
      }
    }

    return await candidateRepository.create({
      companyId: jobPosting.companyId,
      jobPostingId: jobPosting._id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      resumeUrl: `/uploads/resumes/${file.filename}`,
      coverLetter: data.coverLetter ?? null,
      source: data.source ?? null,
      referredBy: data.referredBy ?? null,
      appliedAt: data.appliedAt ?? new Date(),
      status: "applied",
    });
  }

  async update(id, data, actingUser) {
    const doc = await candidateRepository.findById(id);
    if (!doc) throw new Error("Candidate not found");
    TenantScope.assertAccess(actingUser, doc, "Candidate not found");

    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const { companyId, jobPostingId, ...safeData } = data;
    return await candidateRepository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const doc = await candidateRepository.findById(id);
    if (!doc) throw new Error("Candidate not found");
    TenantScope.assertAccess(actingUser, doc, "Candidate not found");
    await candidateRepository.delete(id);
    return doc;
  }
}

module.exports = new CandidateService();

const companyRepository = require("../repositories/company.repository");
const userRepository = require("../repositories/user.repository");

class CompanyService {
  async getCompanies(searchHelper) {
    return await companyRepository.findAll(searchHelper);
  }

  async getCompanyById(id) {
    const company = await companyRepository.findById(id);

    if (!company) {
      throw new Error("Company not found");
    }

    return company;
  }

  async registerCompany(payload) {
    const { admin, ...companyData } = payload;

    const existingCompany = await companyRepository.findByRegistrationNumber(
      companyData.registrationNumber,
    );

    if (existingCompany) {
      throw new Error("Company with this registration number already exists");
    }

    const existingAdmin = await userRepository.findByEmail(admin.email);

    if (existingAdmin) {
      throw new Error("Admin email already exists");
    }

    return await companyRepository.createWithAdmin({
      companyData,
      adminData: {
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: admin.password,
        mustResetPassword: admin.mustResetPassword ?? true,
      },
    });
  }

  async updateCompany(id, data) {
    const company = await companyRepository.update(id, data);

    if (!company) {
      throw new Error("Company not found");
    }

    return company;
  }

  async deleteCompany(id) {
    const company = await companyRepository.delete(id);

    if (!company) {
      throw new Error("Company not found");
    }

    return company;
  }

  async setVerificationStatus(id, approved, verifiedBy) {
    const company = await companyRepository.update(id, {
      verificationStatus: approved ? "verified" : "rejected",
      verifiedBy,
      verifiedAt: new Date(),
    });
    if (!company) throw new Error("Company not found");
    return company;
  }
}

module.exports = new CompanyService();

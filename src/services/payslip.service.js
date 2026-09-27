const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const os = require("os");

const payrollRepository = require("../repositories/payroll.repository");
const employeeRepository = require("../repositories/employee.repository");
const companyRepository = require("../repositories/company.repository");
const currencyRepository = require("../repositories/currency.repository");
const salaryStructureRepository = require("../repositories/salary-structure.repository");
const payrollStatutoryDeductionRepository = require("../repositories/payroll-statutory-deduction.repository");
const employeeStatutoryDetailRepository = require("../repositories/employee-statutory-detail.repository");
const { renderPayslipHtml } = require("../utils/payslipTemplate");

const Employee = require("../models/employee.model");

function monthLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function logoToDataUri(logoUrl) {
  console.log("[payslip] company.logoUrl from DB:", logoUrl);
  if (!logoUrl) {
    console.log(
      "[payslip] logoUrl is empty/null — no logo uploaded for this company",
    );
    return null;
  }
  try {
    const filePath = path.join(__dirname, "..", "..", logoUrl);
    console.log("[payslip] resolved logo file path:", filePath);
    console.log("[payslip] file exists?", fs.existsSync(filePath));

    if (!fs.existsSync(filePath)) return null;

    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime =
      {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
      }[ext] || "image/png";

    const buffer = fs.readFileSync(filePath);
    console.log("[payslip] logo file read, bytes:", buffer.length);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.log("[payslip] logoToDataUri error:", err.message);
    return null;
  }
}

function periodRangeLabel(period) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const fmt = (d) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Small helper so every step can be individually time-boxed and logged —
// makes it obvious in the console exactly which async call is the one that
// never resolves, instead of the whole function silently hanging.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

class PayslipService {
  async buildPayslipData(payrollId) {
    const payroll = await payrollRepository.findById(payrollId);
    if (!payroll) throw new Error("Payroll not found");

    const [company, currency, structure, statutoryDeduction, statutoryDetail] =
      await Promise.all([
        companyRepository.findById(payroll.companyId),
        currencyRepository.findById(payroll.currencyId),
        salaryStructureRepository.findByEmployeeId(payroll.employeeId),
        payrollStatutoryDeductionRepository.findByPayrollId(payroll._id),
        employeeStatutoryDetailRepository.findByEmployeeId(payroll.employeeId),
      ]);

    const employeeDoc = await Employee.findById(payroll.employeeId)
      .populate("userId", "firstName lastName email")
      .populate("departmentId", "name")
      .populate("designationId", "name");

    if (!employeeDoc) throw new Error("Employee not found for this payroll");

    const user = employeeDoc.userId;
    const employee = {
      name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "-",
      designation: employeeDoc.designationId?.name || "-",
      department: employeeDoc.departmentId?.name || "-",
      employeeCode: `EMP-${String(employeeDoc.id_int || 0).padStart(4, "0")}`,
      joiningDate: employeeDoc.joiningDate,
    };

    const earnings = [
      { name: "Basic Salary", amount: structure?.basic || 0 },
      ...(structure?.allowances || []).filter((a) => a.name !== "Allowance"),
    ];
    const autoAllowance = (structure?.allowances || []).find(
      (a) => a.name === "Allowance",
    );
    if (autoAllowance)
      earnings.push({ name: "Allowance", amount: autoAllowance.amount });

    const structureDeductions = (structure?.deductions || []).filter(
      (d) => !(statutoryDeduction && d.name === "Income Tax (TDS)"),
    );

    const deductions = [...structureDeductions];
    if (statutoryDeduction) {
      if (statutoryDeduction.tds)
        deductions.push({
          name: "Income Tax (TDS)",
          amount: statutoryDeduction.tds,
        });
      if (statutoryDeduction.pfEmployeeContribution)
        deductions.push({
          name: "Employee Provident Fund (EPF)",
          amount: statutoryDeduction.pfEmployeeContribution,
        });
      if (statutoryDeduction.esiEmployeeContribution)
        deductions.push({
          name: "Social Security Fund (SSF)",
          amount: statutoryDeduction.esiEmployeeContribution,
        });
      if (statutoryDeduction.professionalTax)
        deductions.push({
          name: "Professional Tax",
          amount: statutoryDeduction.professionalTax,
        });
      if (statutoryDeduction.otherDeductions)
        deductions.push({
          name: "Other Deductions",
          amount: statutoryDeduction.otherDeductions,
        });
    }

    // Temporarily forcing logoUrl to null while debugging — a broken image
    // URL that Chromium can't reach is a separate, known way to cause a
    // long hang. Re-enable once the newPage()/launch hang itself is fixed.
    return {
      company: {
        legalName: company?.legalName || "-",
        tradeName: company?.tradeName,
        address: company?.address,
        billingEmail: company?.billingEmail,
        logoUrl: logoToDataUri(company?.logoUrl), // company?.logoUrl ? `http://localhost:5000${company.logoUrl}` : null,
      },
      employee,
      payroll: {
        period: payroll.period,
        periodLabel: monthLabel(payroll.period),
        periodRangeLabel: periodRangeLabel(payroll.period),
        id_int: payroll.id_int,
      },
      bank: {
        bankName: statutoryDetail?.bankName,
        bankAccountNumber: statutoryDetail?.bankAccountNumber,
      },
      earnings,
      deductions,
      currencySymbol: currency?.symbol || currency?.code || "",
      issueDate: new Date(),
    };
  }
  async getEmployeeSlug(employeeId) {
    const employeeDoc = await Employee.findById(employeeId).populate(
      "userId",
      "firstName lastName",
    );
    const user = employeeDoc?.userId;
    const name =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Employee";
    // Sanitize for a safe filename: letters/numbers/hyphens only.
    return name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  async generatePdf(payrollId) {
    const data = await this.buildPayslipData(payrollId);
    const html = renderPayslipHtml(data);

    console.log("[payslip] launching browser...");
    const browser = await withTimeout(
      puppeteer.launch({
        channel: "chrome", // use the real, already-installed Google Chrome instead of Puppeteer's bundled Chromium
        headless: true,
        pipe: true,
        dumpio: true,
        protocolTimeout: 30000,
        userDataDir: path.join(os.tmpdir(), `puppeteer-payslip-${Date.now()}`),
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-features=NetworkService,NetworkServiceInProcess",
        ],
      }),
      30000,
      "puppeteer.launch()",
    );
    console.log("[payslip] browser launched, pid:", browser.process()?.pid);

    try {
      console.log("[payslip] opening new page...");
      const page = await withTimeout(
        browser.newPage(),
        10000,
        "browser.newPage()",
      );
      console.log("[payslip] new page created");

      console.log("[payslip] setting content...");
      await withTimeout(
        page.setContent(html, { waitUntil: "domcontentloaded" }),
        10000,
        "page.setContent()",
      );
      console.log("[payslip] content set, generating pdf...");

      const buf = await withTimeout(
        page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
        }),
        10000,
        "page.pdf()",
      );
      console.log("[payslip] pdf generated, size:", buf.length, "bytes");
      return buf;
    } finally {
      console.log("[payslip] closing browser...");
      await browser.close();
      console.log("[payslip] browser closed");
    }
  }
  async generateAndStore(payrollId) {
    const pdfBuffer = await this.generatePdf(payrollId);
    const dir = path.join(__dirname, "..", "..", "uploads", "payslips");
    fs.mkdirSync(dir, { recursive: true });
    const filename = `payslip-${payrollId}.pdf`;
    fs.writeFileSync(path.join(dir, filename), pdfBuffer);
    return `/uploads/payslips/${filename}`;
  }

  async bulkRelease(ids, actingUser) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("ids must be a non-empty array of payroll IDs");
    }

    const results = [];
    for (const id of ids) {
      try {
        const doc = await this.release(id, null, actingUser);
        results.push({ id, success: true, payroll: doc });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    return {
      releasedCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    };
  }
}

module.exports = new PayslipService();

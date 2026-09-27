// Pure function: takes the fully-joined payslip data, returns an HTML
// string. Kept separate from the PDF-generation code so the template can
// be tweaked/previewed independently of Puppeteer.

function money(n) {
  return Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function amountInWords(n) {
  // Minimal English number-to-words for whole rupees — good enough for a
  // payslip footer line. Swap for a proper library (e.g. "to-words") if you
  // need paisa precision or other locales.
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function chunk(num) {
    if (num === 0) return "";
    if (num < 20) return ones[num] + " ";
    if (num < 100) return tens[Math.floor(num / 10)] + " " + chunk(num % 10);
    return ones[Math.floor(num / 100)] + " Hundred " + chunk(num % 100);
  }

  let num = Math.round(Number(n) || 0);
  if (num === 0) return "Zero";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;

  let words = "";
  if (crore) words += chunk(crore) + "Crore ";
  if (lakh) words += chunk(lakh) + "Lakh ";
  if (thousand) words += chunk(thousand) + "Thousand ";
  if (num) words += chunk(num);

  return words.trim();
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function maskAccount(acc) {
  if (!acc) return "-";
  const digits = String(acc).replace(/\D/g, "");
  return digits.length > 4 ? `**** ${digits.slice(-4)}` : acc;
}

/**
 * data shape:
 * {
 *   company: { legalName, tradeName, address: {line1, city, country}, billingEmail, logoUrl },
 *   employee: { name, designation, department, employeeCode, joiningDate },
 *   payroll: { period, payableDays, grossPay, overtimePay, deductions, netPay, id_int },
 *   bank: { bankName, bankAccountNumber }, // bankAccountNumber already masked by the caller
 *   earnings: [{ name, amount }],   // Basic first, then structure.allowances[]
 *   deductions: [{ name, amount }], // structure.deductions[] + statutory lines merged
 *   currencySymbol: "NPR" | "Rs" | etc,
 *   issueDate: Date,
 * }
 */
function renderPayslipHtml(data) {
  const {
    company,
    employee,
    payroll,
    bank,
    earnings,
    deductions,
    currencySymbol,
  } = data;

  const totalEarnings = earnings.reduce((n, e) => n + (e.amount || 0), 0);
  const totalDeductions = deductions.reduce((n, d) => n + (d.amount || 0), 0);
  const netPay = totalEarnings - totalDeductions;

  const earningsRows = earnings
    .map(
      (e) => `
      <tr>
        <td>${e.name}</td>
        <td class="amt">${money(e.amount)}</td>
      </tr>`,
    )
    .join("");

  const deductionRows = deductions
    .map(
      (d) => `
      <tr>
        <td>${d.name}</td>
        <td class="amt">${money(d.amount)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; font-size: 13px; padding: 32px; }
  .header {
    background: linear-gradient(135deg, #eef2ff 0%, #dbeafe 100%);
    border-radius: 14px;
    padding: 24px 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 22px;
  }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand-logo { width: 46px; height: 46px; border-radius: 10px; object-fit: contain; background: #fff; }
  .brand-name { font-size: 19px; font-weight: 700; color: #1e3a8a; }
  .brand-tag { font-size: 11.5px; color: #64748b; margin-top: 2px; }
  .company-meta { text-align: right; font-size: 11.5px; color: #334155; line-height: 1.7; }
  .title-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
  .title { font-size: 26px; font-weight: 800; color: #111827; }
  .subtitle { font-size: 12.5px; color: #64748b; margin-top: 2px; }
  .meta-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 18px; display: flex; gap: 24px; font-size: 11.5px; }
  .meta-box .lab { color: #64748b; }
  .meta-box .val { font-weight: 700; color: #111827; margin-top: 2px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; margin-bottom: 18px; display: flex; justify-content: space-between; gap: 20px; }
  .emp-name { font-size: 16px; font-weight: 700; }
  .emp-role { color: #2563eb; font-size: 12.5px; margin-bottom: 10px; }
  .kv { display: flex; font-size: 12px; margin-bottom: 5px; }
  .kv .k { width: 110px; color: #64748b; }
  .kv .v { font-weight: 600; }
  .side-box { background: #f8fafc; border-radius: 10px; padding: 14px 18px; font-size: 12px; min-width: 220px; }
  .side-box div { margin-bottom: 10px; }
  .side-box .lab { color: #64748b; font-size: 11px; }
  .side-box .val { font-weight: 700; margin-top: 2px; }
  .tables { display: flex; gap: 16px; margin-bottom: 18px; }
  .table-card { flex: 1; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
  .table-card.earn .thead { background: #ecfdf5; color: #047857; }
  .table-card.ded .thead { background: #fef2f2; color: #b91c1c; }
  .thead { padding: 10px 16px; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 9px 16px; font-size: 12px; text-align: left; }
  th { color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9; }
  td.amt, th.amt { text-align: right; }
  .total-row td { font-weight: 700; }
  .table-card.earn .total-row { background: #ecfdf5; color: #047857; }
  .table-card.ded .total-row { background: #fef2f2; color: #b91c1c; }
  .summary { background: #eef2ff; border-radius: 12px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
  .net-label { font-size: 12px; color: #64748b; }
  .net-amount { font-size: 22px; font-weight: 800; color: #111827; }
  .net-words { font-size: 11px; color: #64748b; }
  .summary-figs { display: flex; gap: 28px; }
  .summary-figs div { text-align: left; }
  .summary-figs .lab { font-size: 11px; color: #64748b; }
  .summary-figs .val { font-weight: 700; font-size: 13.5px; }
  .summary-figs .val.blue { color: #2563eb; }
  .notes { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; }
  .notes ul { padding-left: 16px; margin-top: 6px; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; }
</style>
</head>
<body>

  <div class="header">
    <div class="brand">
      ${company.logoUrl ? `<img class="brand-logo" src="${company.logoUrl}" />` : ""}
      <div>
        <div class="brand-name">${company.legalName}</div>
        <div class="brand-tag">${company.tradeName || ""}</div>
      </div>
    </div>
    <div class="company-meta">
      ${company.address ? `<div>${[company.address.line1, company.address.city, company.address.country].filter(Boolean).join(", ")}</div>` : ""}
      ${company.billingEmail ? `<div>${company.billingEmail}</div>` : ""}
    </div>
  </div>

  <div class="title-row">
    <div>
      <div class="title">Payslip</div>
      <div class="subtitle">For the month of ${payroll.periodLabel}</div>
    </div>
    <div class="meta-box">
      <div><div class="lab">Payslip No.</div><div class="val">PS-${payroll.period.replace("-", "-")}-${String(payroll.id_int).padStart(4, "0")}</div></div>
      <div><div class="lab">Issue Date</div><div class="val">${formatDate(data.issueDate)}</div></div>
    </div>
  </div>

  <div class="card">
    <div>
      <div class="emp-name">${employee.name}</div>
      <div class="emp-role">${employee.designation}</div>
      <div class="kv"><span class="k">Employee ID</span><span class="v">${employee.employeeCode}</span></div>
      <div class="kv"><span class="k">Department</span><span class="v">${employee.department}</span></div>
      <div class="kv"><span class="k">Designation</span><span class="v">${employee.designation}</span></div>
      <div class="kv"><span class="k">Joining Date</span><span class="v">${formatDate(employee.joiningDate)}</span></div>
    </div>
    <div class="side-box">
      <div><div class="lab">Pay Period</div><div class="val">${payroll.periodRangeLabel}</div></div>
      <div><div class="lab">Bank Account</div><div class="val">${bank.bankName || "-"}<br/>${maskAccount(bank.bankAccountNumber)}</div></div>
    </div>
  </div>

  <div class="tables">
    <div class="table-card earn">
      <div class="thead">Earnings</div>
      <table>
        <thead><tr><th>Description</th><th class="amt">Amount (${currencySymbol})</th></tr></thead>
        <tbody>
          ${earningsRows}
          <tr class="total-row"><td>Total Earnings</td><td class="amt">${money(totalEarnings)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="table-card ded">
      <div class="thead">Deductions</div>
      <table>
        <thead><tr><th>Description</th><th class="amt">Amount (${currencySymbol})</th></tr></thead>
        <tbody>
          ${deductionRows}
          <tr class="total-row"><td>Total Deductions</td><td class="amt">${money(totalDeductions)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="summary">
    <div>
      <div class="net-label">Net Salary</div>
      <div class="net-amount">${currencySymbol} ${money(netPay)}</div>
      <div class="net-words">(${amountInWords(netPay)} Only)</div>
    </div>
    <div class="summary-figs">
      <div><div class="lab">Gross Salary</div><div class="val">${money(totalEarnings)}</div></div>
      <div><div class="lab">Total Deductions</div><div class="val">${money(totalDeductions)}</div></div>
      <div><div class="lab">Net Salary</div><div class="val blue">${money(netPay)}</div></div>
    </div>
  </div>

  <div class="notes">
    <div>
      <strong>Notes</strong>
      <ul>
        <li>This is a system generated payslip and does not require a signature.</li>
        <li>Tax calculations are based on the applicable Nepal Income Tax Act and company policy.</li>
        <li>Please contact HR for any discrepancies or queries.</li>
      </ul>
    </div>
  </div>

  <div class="footer">Thank you for being a part of our team!</div>

</body>
</html>`;
}

module.exports = { renderPayslipHtml };

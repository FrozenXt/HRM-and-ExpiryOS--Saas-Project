// src/services/offer-letter.service.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "offer-letters");

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMoney(amount, currency = "NPR") {
  if (amount == null) return "-";
  return `${currency} ${Number(amount).toLocaleString("en-IN")}`;
}

/**
 * Generates a PDF offer letter and returns the public URL path.
 * e.g. "/uploads/offer-letters/1698...-offer.pdf"
 */
async function generateOfferLetter(offer) {
  ensureDir();

  const filename = `${Date.now()}-${offer._id}-offer.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const publicUrl = `/uploads/offer-letters/${filename}`;

  const candidate = offer.candidateId || {};
  const company = offer.companyId || {};
  const designation = offer.designationId || {};
  const issuedBy = offer.issuedBy || {};

  const candidateName =
    `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();
  const issuerName =
    `${issuedBy.firstName || ""} ${issuedBy.lastName || ""}`.trim();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 60 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .fillColor("#0f172a")
      .text(company.legalName || "Company", { align: "left" });

    if (company.tradeName) {
      doc.fontSize(11).fillColor("#64748b").text(company.tradeName);
    }
    if (company.addressLine1 || company.city) {
      doc
        .fontSize(10)
        .fillColor("#64748b")
        .text(
          [company.addressLine1, company.city, company.country]
            .filter(Boolean)
            .join(", "),
        );
    }

    doc.moveDown(1.5);

    // Title
    doc
      .fontSize(16)
      .fillColor("#0f172a")
      .text("OFFER OF EMPLOYMENT", { align: "center", underline: true });

    doc.moveDown(1.5);

    // Date
    doc
      .fontSize(11)
      .fillColor("#0f172a")
      .text(`Date: ${formatDate(offer.issuedAt)}`, { align: "right" });

    doc.moveDown(1);

    // Salutation
    doc.fontSize(11).text(`Dear ${candidateName || "Candidate"},`);
    doc.moveDown(0.8);

    // Body
    doc.text(
      `We are pleased to offer you the position of ` +
        `${designation.name || "the role"} at ${company.legalName || "our company"}. ` +
        `Your expected joining date is ${formatDate(offer.joiningDate)}.`,
      { align: "justify", lineGap: 4 },
    );

    doc.moveDown(0.6);
    doc.text(
      `Your annual gross salary will be ${formatMoney(offer.offeredSalary)}. ` +
        `Details of the compensation package, benefits, and other terms will be ` +
        `shared with you during onboarding.`,
      { align: "justify", lineGap: 4 },
    );

    doc.moveDown(0.6);
    doc.text(
      `This offer is contingent upon successful completion of background ` +
        `verification and submission of required documents. Please confirm your ` +
        `acceptance by signing and returning a copy of this letter.`,
      { align: "justify", lineGap: 4 },
    );

    doc.moveDown(2);

    // Signature
    doc.text("Sincerely,", { continued: false });
    doc.moveDown(1.2);
    doc
      .fontSize(12)
      .fillColor("#0f172a")
      .text(issuerName || "HR Team");
    doc
      .fontSize(10)
      .fillColor("#64748b")
      .text(issuedBy.role || "Authorized Signatory");
    doc.fontSize(10).text(company.legalName || "");

    // Footer
    const bottom = doc.page.height - 40;
    doc
      .fontSize(9)
      .fillColor("#94a3b8")
      .text(
        `This document was generated electronically. Offer ID: ${offer._id}`,
        60,
        bottom,
        { align: "center", width: doc.page.width - 120 },
      );

    doc.end();

    stream.on("finish", () => resolve(publicUrl));
    stream.on("error", reject);
  });
}

module.exports = { generateOfferLetter };

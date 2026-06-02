// pdfService.js — Generates invoice HTML → PDF buffer using puppeteer (optional)
// If puppeteer is not installed, falls back to returning HTML for browser print.

const generateInvoiceHTML = (invoice) => {
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const itemRows = (invoice.items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <strong>${item.description}</strong>
        ${item.hsn ? `<br><small>HSN: ${item.hsn}</small>` : ''}
      </td>
      <td>${item.unit || 'Nos'}</td>
      <td style="text-align:right">${item.quantity}</td>
      <td style="text-align:right">${fmt(item.price)}</td>
      <td style="text-align:right"><strong>${fmt(item.quantity * item.price)}</strong></td>
    </tr>
  `).join('');

  const gstRows = () => {
    if (!invoice.gstRate) return '';
    if (invoice.gstType === 'IGST') {
      return `<tr><td>IGST (${invoice.gstRate}%)</td><td>${fmt(invoice.igstAmount || invoice.gstAmount)}</td></tr>`;
    }
    return `
      <tr><td>CGST (${invoice.gstRate / 2}%)</td><td>${fmt(invoice.cgstAmount || invoice.gstAmount / 2)}</td></tr>
      <tr><td>SGST (${invoice.gstRate / 2}%)</td><td>${fmt(invoice.sgstAmount || invoice.gstAmount / 2)}</td></tr>
    `;
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: white; }
  .page { max-width: 794px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .logo { font-size: 22px; font-weight: 900; color: #2563eb; }
  .company-info { font-size: 12px; color: #64748b; margin-top: 6px; line-height: 1.6; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 32px; font-weight: 900; color: #2563eb; letter-spacing: 2px; }
  .invoice-meta { font-size: 12px; color: #64748b; margin-top: 8px; line-height: 1.8; }
  .invoice-meta strong { color: #1e293b; }
  .divider { border: none; border-top: 2px solid #e2e8f0; margin: 24px 0; }
  .bill-section { display: flex; gap: 40px; margin-bottom: 32px; }
  .bill-box { flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; }
  .bill-box h3 { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  .bill-box p { font-size: 13px; color: #1e293b; line-height: 1.7; }
  .bill-box .name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #2563eb; color: white; }
  thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:last-child, thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:hover { background: #f8fafc; }
  tbody td { padding: 12px; font-size: 13px; vertical-align: top; }
  tbody td small { color: #94a3b8; font-size: 11px; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
  .totals-box { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  .totals-row.total { border-top: 2px solid #2563eb; border-bottom: none; padding-top: 12px; margin-top: 4px; }
  .totals-row.total span:first-child { font-weight: 700; font-size: 15px; }
  .totals-row.total span:last-child { font-weight: 900; font-size: 20px; color: #2563eb; }
  .totals-row .label { color: #64748b; }
  .totals-row .discount { color: #10b981; font-weight: 600; }
  .notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 32px; }
  .notes h4 { font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .notes p { color: #78350f; font-size: 13px; line-height: 1.6; }
  .bank-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 32px; }
  .bank-box h4 { font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .bank-row { display: flex; gap: 8px; font-size: 13px; margin-bottom: 4px; }
  .bank-row .label { color: #64748b; min-width: 110px; }
  .bank-row .value { font-weight: 600; color: #1e293b; font-family: monospace; }
  .footer { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-sent { background: #dbeafe; color: #1e40af; }
  .status-draft { background: #f1f5f9; color: #475569; }
  .status-overdue { background: #fee2e2; color: #991b1b; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">⚡ ${invoice.company?.name || 'Company'}</div>
      <div class="company-info">
        ${invoice.company?.address || ''}<br>
        ${invoice.company?.gstin ? `GSTIN: ${invoice.company.gstin}` : ''}<br>
        ${invoice.company?.email || ''} ${invoice.company?.phone ? '| ' + invoice.company.phone : ''}
      </div>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <div class="invoice-meta">
        <strong>Invoice #:</strong> ${invoice.invoiceNumber}<br>
        <strong>Date:</strong> ${fmtDate(invoice.issueDate)}<br>
        <strong>Due:</strong> ${fmtDate(invoice.dueDate)}<br>
        <span class="status-badge status-${invoice.status}">${invoice.status?.toUpperCase()}</span>
      </div>
    </div>
  </div>

  <hr class="divider">

  <!-- Bill To / Bank -->
  <div class="bill-section">
    <div class="bill-box">
      <h3>Bill To</h3>
      <p class="name">${invoice.client?.name || ''}</p>
      <p>
        ${invoice.client?.address || ''}<br>
        ${invoice.client?.gstin ? `GSTIN: ${invoice.client.gstin}<br>` : ''}
        ${invoice.client?.email || ''}<br>
        ${invoice.client?.phone || ''}
      </p>
    </div>
    ${invoice.bankDetails ? `
    <div class="bill-box">
      <h3>Payment Details</h3>
      <p>
        <strong>Bank:</strong> ${invoice.bankDetails.bankName || ''}<br>
        <strong>A/C No:</strong> ${invoice.bankDetails.accountNumber || ''}<br>
        <strong>IFSC:</strong> ${invoice.bankDetails.ifsc || ''}
      </p>
    </div>` : ''}
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Description</th>
        <th style="width:60px">Unit</th>
        <th style="width:60px;text-align:right">Qty</th>
        <th style="width:100px;text-align:right">Rate</th>
        <th style="width:110px;text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span class="label">Subtotal</span><span>${fmt(invoice.subtotal)}</span></div>
      ${invoice.discount > 0 ? `<div class="totals-row"><span class="label">Discount (${invoice.discount}%)</span><span class="discount">− ${fmt(invoice.discountAmount)}</span></div>` : ''}
      ${invoice.gstRate > 0 ? gstRows() : ''}
      <div class="totals-row total"><span>Total Amount</span><span>${fmt(invoice.total)}</span></div>
    </div>
  </div>

  <!-- Notes -->
  ${invoice.notes ? `
  <div class="notes">
    <h4>Notes</h4>
    <p>${invoice.notes}</p>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for your business! · Generated by InvoiceFlow</p>
  </div>
</div>
</body>
</html>`;
};

// Generate PDF buffer using puppeteer (install separately: npm i puppeteer)
const generatePDF = async (invoice) => {
  const html = generateInvoiceHTML(invoice);
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
  headless: "new", // IMPORTANT
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
    const page = await browser.newPage();
   await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
    await browser.close();
    if (!pdf || pdf.length === 0) {
  throw new Error("PDF generation failed");
}
   return { pdf: Buffer.from(pdf), html };
  } catch (err) {
    // puppeteer not installed — return HTML only
    console.warn('Puppeteer not available, returning HTML:', err.message);
    return { pdf: null, html };
  }
};

module.exports = { generateInvoiceHTML, generatePDF };
const PDFDocument = require('pdfkit');

/**
 * Helper to format currency safely for standard PDFKit fonts (WinAnsi encoding)
 */
function formatBdt(amount) {
  const num = Number(amount) || 0;
  return `BDT ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generates a branded XtraEarn PDF Invoice for a completed task.
 */
function buildTaskInvoicePdf(doc, data) {
  const {
    invoiceNumber = 'INV-2026-0001',
    date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    taskTitle = 'Logo Design & Branding',
    taskId = 1,
    category = 'Design & Graphics',
    clientName = 'Client Partner',
    clientEmail = 'client@example.com',
    workerName = 'Rahat Hasan',
    workerEmail = 'rahat@example.com',
    budget = 1500,
    platformFeePct = 10,
    paymentMethod = 'bKash Escrow Secure',
    txRef = 'TXN-884920194',
    status = 'PAID & SETTLED'
  } = data;

  const grossAmount = Number(budget) || 0;
  const platformFee = (grossAmount * platformFeePct) / 100;
  const netEarnings = grossAmount - platformFee;

  // Background Brand Accent
  doc.rect(0, 0, 595, 95).fill('#0F172A');

  // Brand Logo Header (Left)
  doc.fillColor('#22C55E')
     .font('Helvetica-Bold')
     .fontSize(24)
     .text('XTRA', 40, 30, { continued: true })
     .fillColor('#FFFFFF')
     .text('EARN')
     .fontSize(9)
     .font('Helvetica')
     .fillColor('#94A3B8')
     .text("Bangladesh's Premier Micro-Task & Freelance Marketplace", 40, 58);

  // Official Invoice Label (Right Header - bounded by width)
  doc.fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .fontSize(18)
     .text('OFFICIAL INVOICE', 255, 30, { align: 'right', width: 300 })
     .fontSize(9.5)
     .font('Helvetica-Bold')
     .fillColor('#34D399')
     .text(`Status: ${status}`, 255, 58, { align: 'right', width: 300 });

  // Invoice Metadata Box
  doc.rect(40, 115, 515, 65).fill('#F8FAFC');
  doc.rect(40, 115, 515, 65).stroke('#E2E8F0');

  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica');
  doc.text('INVOICE NUMBER', 55, 126);
  doc.text('DATE ISSUED', 185, 126);
  doc.text('PAYMENT REFERENCE', 315, 126);
  doc.text('ESCROW SECURITY', 440, 126);

  doc.fillColor('#0F172A').fontSize(9.5).font('Helvetica-Bold');
  doc.text(invoiceNumber, 55, 144);
  doc.text(date, 185, 144);
  doc.text(txRef, 315, 144);
  doc.fillColor('#16A34A').text('100% Protected', 440, 144);

  // Client & Worker Split Details
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold');
  doc.text('BILLED TO (CLIENT)', 40, 202);
  doc.text('PERFORMED BY (FREELANCER)', 305, 202);

  doc.rect(40, 218, 245, 78).fill('#FFFFFF').stroke('#E2E8F0');
  doc.rect(305, 218, 250, 78).fill('#FFFFFF').stroke('#E2E8F0');

  // Client details
  doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold').text(clientName, 52, 230);
  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica')
     .text(`Email: ${clientEmail}`, 52, 246)
     .text(`Task Ref: #TASK-${taskId}`, 52, 260)
     .text('Dhaka, Bangladesh', 52, 274);

  // Worker details
  doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold').text(workerName, 318, 230);
  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica')
     .text(`Email: ${workerEmail}`, 318, 246)
     .text(`Profession: ${category}`, 318, 260)
     .text('Verified Identity (NID KYC)', 318, 274);

  // Line Item Table
  doc.rect(40, 316, 515, 26).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
  doc.text('TASK DESCRIPTION / SERVICE', 52, 324);
  doc.text('CATEGORY', 270, 324);
  doc.text('TYPE', 370, 324);
  doc.text('AMOUNT', 445, 324, { align: 'right', width: 95 });

  // Table Row
  doc.rect(40, 342, 515, 45).fill('#FFFFFF').stroke('#E2E8F0');
  doc.fillColor('#0F172A').fontSize(9.5).font('Helvetica-Bold').text(taskTitle, 52, 355, { width: 205 });
  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text(category, 270, 355);
  doc.text('Fixed Milestone', 370, 355);
  doc.fillColor('#0F172A').fontSize(9.5).font('Helvetica-Bold').text(formatBdt(grossAmount), 445, 355, { align: 'right', width: 95 });

  // Financial Breakdown Box (Right)
  const summaryY = 410;
  doc.rect(315, summaryY, 240, 115).fill('#F8FAFC').stroke('#E2E8F0');

  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica');
  doc.text('Subtotal Budget:', 328, summaryY + 14);
  doc.fillColor('#0F172A').font('Helvetica-Bold').text(formatBdt(grossAmount), 430, summaryY + 14, { align: 'right', width: 110 });

  doc.fillColor('#64748B').font('Helvetica').text(`Platform Service Fee (${platformFeePct}%):`, 328, summaryY + 34);
  doc.fillColor('#EF4444').font('Helvetica-Bold').text(`-${formatBdt(platformFee)}`, 430, summaryY + 34, { align: 'right', width: 110 });

  doc.rect(328, summaryY + 54, 214, 1).fill('#E2E8F0');

  doc.fillColor('#0F172A').fontSize(10.5).font('Helvetica-Bold').text('Total Paid Out:', 328, summaryY + 68);
  doc.fillColor('#16A34A').fontSize(11).font('Helvetica-Bold').text(formatBdt(grossAmount), 430, summaryY + 66, { align: 'right', width: 110 });

  doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(`Net to Freelancer: ${formatBdt(netEarnings)}`, 328, summaryY + 92);

  // Security Badge / Payment Method Box (Left of Summary)
  doc.rect(40, summaryY, 260, 115).fill('#F0FDF4').stroke('#BBF7D0');
  doc.fillColor('#166534').fontSize(9.5).font('Helvetica-Bold').text('SECURED BY XTRAEARN ESCROW', 52, summaryY + 14);
  doc.fillColor('#15803D').fontSize(8.5).font('Helvetica')
     .text(`Payment Method: ${paymentMethod}`, 52, summaryY + 34)
     .text(`Reference Tx: ${txRef}`, 52, summaryY + 48)
     .text('Funds were protected in escrow until delivery.', 52, summaryY + 65)
     .text('Official tax compliant digital invoice.', 52, summaryY + 80);

  // Footer & Compliance Note
  doc.rect(40, 710, 515, 55).fill('#F8FAFC').stroke('#E2E8F0');
  doc.fillColor('#64748B').fontSize(8).font('Helvetica')
     .text('XtraEarn Technologies Ltd. • Motijheel C/A, Dhaka-1000, Bangladesh', 50, 720, { align: 'center', width: 495 })
     .text('Website: www.xtraearn.com • Support: support@xtraearn.com • Phone: +880 1711-100000', 50, 733, { align: 'center', width: 495 })
     .fillColor('#94A3B8')
     .text('This is an electronically generated and cryptographically verified digital invoice.', 50, 746, { align: 'center', width: 495 });
}

/**
 * Generates a branded XtraEarn PDF Receipt for a wallet transaction (deposit/payout).
 */
function buildTransactionReceiptPdf(doc, data) {
  const {
    receiptNumber = 'REC-2026-9041',
    date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    type = 'Wallet Deposit',
    userName = 'Rahat Hasan',
    userEmail = 'rahat@example.com',
    amount = 2500,
    fee = 0,
    netAmount = 2500,
    method = 'bKash Mobile Banking',
    txRef = 'BK-TXN-1788002703142',
    status = 'SUCCESSFUL / COMPLETED'
  } = data;

  // Background Brand Accent
  doc.rect(0, 0, 595, 95).fill('#0F172A');

  // Brand Logo Header (Left)
  doc.fillColor('#22C55E')
     .font('Helvetica-Bold')
     .fontSize(24)
     .text('XTRA', 40, 30, { continued: true })
     .fillColor('#FFFFFF')
     .text('EARN')
     .fontSize(9)
     .font('Helvetica')
     .fillColor('#94A3B8')
     .text("Bangladesh's Premier Micro-Task & Freelance Marketplace", 40, 58);

  // Official Receipt Label (Right Header - bounded by width)
  doc.fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .fontSize(18)
     .text('PAYMENT RECEIPT', 255, 30, { align: 'right', width: 300 })
     .fontSize(9.5)
     .font('Helvetica-Bold')
     .fillColor('#34D399')
     .text(`Status: ${status}`, 255, 58, { align: 'right', width: 300 });

  // Receipt Box
  doc.rect(40, 115, 515, 65).fill('#F8FAFC');
  doc.rect(40, 115, 515, 65).stroke('#E2E8F0');

  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica');
  doc.text('RECEIPT NUMBER', 55, 126);
  doc.text('TRANSACTION DATE', 185, 126);
  doc.text('GATEWAY CHANNEL', 315, 126);
  doc.text('SYSTEM REF', 440, 126);

  doc.fillColor('#0F172A').fontSize(9.5).font('Helvetica-Bold');
  doc.text(receiptNumber, 55, 144);
  doc.text(date, 185, 144);
  doc.text(method, 315, 144);
  doc.text(txRef, 440, 144);

  // Account Holder Details Box
  doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('ACCOUNT HOLDER DETAILS', 40, 202);
  doc.rect(40, 218, 515, 65).fill('#FFFFFF').stroke('#E2E8F0');

  doc.fillColor('#1E293B').fontSize(10.5).font('Helvetica-Bold').text(userName, 55, 232);
  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica')
     .text(`Email: ${userEmail}`, 55, 250)
     .text(`Transaction Type: ${type}`, 315, 250);

  // Breakdown Line Item Table
  doc.rect(40, 305, 515, 26).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
  doc.text('TRANSACTION PARTICULARS', 52, 313);
  doc.text('METHOD', 260, 313);
  doc.text('STATUS', 370, 313);
  doc.text('AMOUNT', 445, 313, { align: 'right', width: 95 });

  doc.rect(40, 331, 515, 45).fill('#FFFFFF').stroke('#E2E8F0');
  doc.fillColor('#0F172A').fontSize(9.5).font('Helvetica-Bold').text(type, 52, 345, { width: 195 });
  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text(method, 260, 345);
  doc.fillColor('#16A34A').fontSize(8.5).font('Helvetica-Bold').text('Completed', 370, 345);
  doc.fillColor('#0F172A').fontSize(9.5).font('Helvetica-Bold').text(formatBdt(amount), 445, 345, { align: 'right', width: 95 });

  // Totals Box (Right)
  const summaryY = 398;
  doc.rect(315, summaryY, 240, 100).fill('#F8FAFC').stroke('#E2E8F0');
  doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text('Gross Amount:', 328, summaryY + 14);
  doc.fillColor('#0F172A').font('Helvetica-Bold').text(formatBdt(amount), 430, summaryY + 14, { align: 'right', width: 110 });

  doc.fillColor('#64748B').font('Helvetica').text('Processing Fee:', 328, summaryY + 34);
  doc.fillColor('#0F172A').font('Helvetica-Bold').text(formatBdt(fee), 430, summaryY + 34, { align: 'right', width: 110 });

  doc.rect(328, summaryY + 54, 214, 1).fill('#E2E8F0');
  doc.fillColor('#0F172A').fontSize(10.5).font('Helvetica-Bold').text('Net Amount:', 328, summaryY + 68);
  doc.fillColor('#16A34A').fontSize(11).font('Helvetica-Bold').text(formatBdt(netAmount), 430, summaryY + 66, { align: 'right', width: 110 });

  // Security Note Box (Left)
  doc.rect(40, summaryY, 260, 100).fill('#F0FDF4').stroke('#BBF7D0');
  doc.fillColor('#166534').fontSize(9.5).font('Helvetica-Bold').text('OFFICIAL DIGITAL RECEIPT', 52, summaryY + 14);
  doc.fillColor('#15803D').fontSize(8.5).font('Helvetica')
     .text(`Reference: ${txRef}`, 52, summaryY + 34)
     .text('Instant wallet reconciliation verified.', 52, summaryY + 48)
     .text('Retain this receipt for your accounting records.', 52, summaryY + 64);

  // Footer
  doc.rect(40, 710, 515, 55).fill('#F8FAFC').stroke('#E2E8F0');
  doc.fillColor('#64748B').fontSize(8).font('Helvetica')
     .text('XtraEarn Technologies Ltd. • Motijheel C/A, Dhaka-1000, Bangladesh', 50, 720, { align: 'center', width: 495 })
     .text('Website: www.xtraearn.com • Support: support@xtraearn.com • Phone: +880 1711-100000', 50, 733, { align: 'center', width: 495 })
     .fillColor('#94A3B8')
     .text('This is an electronically generated and cryptographically verified digital receipt.', 50, 746, { align: 'center', width: 495 });
}

module.exports = {
  buildTaskInvoicePdf,
  buildTransactionReceiptPdf,
  formatBdt
};

import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

// Server-side PDF receipt for a persisted DEMO payment (see payments.service.js).
// Built only from database rows; clearly marked as a demonstration document.
// Amounts use "INR" because the built-in PDF fonts have no rupee glyph.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../public/logo.png');
const LOGO = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH) : null;

const BRAND_DARK = '#231f52';
const BRAND = '#3d3793';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const SUCCESS = '#15803d';
const AMBER_BG = '#fffbeb';
const AMBER_LINE = '#fcd34d';
const AMBER_TEXT = '#92400e';

const DISCLAIMER = 'This is a computer-generated demonstration receipt. No actual money was transferred. '
  + 'This document is not proof of a real financial transaction.';

const STATUS_LABELS = {
  pending_chief: 'Pending Chief Warden review',
  pending_dsw: 'Pending DSW review',
  pending_admin: 'Pending final decision',
  resolved: 'Resolved',
};

function formatAmount(amount, currency) {
  const value = Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency || 'INR'} ${value}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  return `${new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })} IST`;
}

// The built-in PDF fonts only cover WinAnsi (Latin-1 plus a few symbols): spell out the rupee
// sign, map smart punctuation, and replace anything else they cannot draw.
const WIN_ANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
export function pdfSafe(value) {
  return String(value ?? '')
    .replace(/₹\s*/g, 'Rs. ')
    .replace(/[\u2010-\u2012]/g, '-')
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, (ch) => (WIN_ANSI_EXTRAS.has(ch) ? ch : '?'));
}

const titleCase = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Renders the receipt and resolves with the PDF bytes. */
export function renderReceiptPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `Demo Payment Receipt ${data.transaction_id}`,
        Author: 'DAC Expert System - BML Munjal University',
        Subject: 'Demonstration payment receipt (no real money transferred)',
      },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width; // 595.28
    const H = doc.page.height; // 841.89
    const M = 48; // side margin
    const contentW = W - M * 2;

    // Watermark, drawn first so all content sits above it.
    doc.save();
    doc.rotate(-32, { origin: [W / 2, H / 2] });
    doc.font('Helvetica-Bold').fontSize(120).fillColor(BRAND).fillOpacity(0.05)
      .text('DEMO', 0, H / 2 - 70, { width: W, align: 'center' });
    doc.restore();
    doc.fillOpacity(1);

    // Header band with the logo (its wordmark is white, so it needs the dark band).
    doc.rect(0, 0, W, 118).fill(BRAND_DARK);
    doc.rect(0, 118, W, 4).fill(BRAND);
    if (LOGO) doc.image(LOGO, M, 30, { height: 52 });
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#ffffff')
      .text('PAYMENT RECEIPT', M, 36, { width: contentW, align: 'right' });
    doc.font('Helvetica').fontSize(9.5).fillColor('#c7c4ec')
      .text('DAC Expert System · BML Munjal University', M, 62, { width: contentW, align: 'right' })
      .text('Disciplinary Action Committee', M, 76, { width: contentW, align: 'right' });

    // Demo notice.
    let y = 146;
    doc.roundedRect(M, y, contentW, 34, 6).fillAndStroke(AMBER_BG, AMBER_LINE);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(AMBER_TEXT)
      .text('DEMO RECEIPT  ·  SIMULATED TRANSACTION  ·  NO MONEY TRANSFERRED', M, y + 12, { width: contentW, align: 'center' });

    // Amount summary.
    y += 56;
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('Amount paid', M, y);
    doc.font('Helvetica-Bold').fontSize(28).fillColor(INK).text(formatAmount(data.amount, data.currency), M, y + 14);
    const pillW = 104;
    doc.roundedRect(W - M - pillW, y + 16, pillW, 24, 12).fill('#dcfce7');
    doc.font('Helvetica-Bold').fontSize(10).fillColor(SUCCESS)
      .text('SUCCESSFUL', W - M - pillW, y + 23, { width: pillW, align: 'center' });
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
      .text(`Transaction ${data.transaction_id}  ·  ${formatDateTime(data.payment_date)}`, M, y + 50);

    y += 80;

    const section = (title, rows) => {
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1).strokeColor(LINE).stroke();
      y += 14;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND).text(title.toUpperCase(), M, y, { characterSpacing: 0.8 });
      y += 20;
      for (const [label, value] of rows) {
        const text = value === null || value === undefined || value === '' ? '—' : pdfSafe(value);
        doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(label, M, y, { width: 150 });
        doc.font('Helvetica').fontSize(10).fillColor(INK);
        const h = doc.heightOfString(text, { width: contentW - 160 });
        doc.text(text, M + 160, y, { width: contentW - 160 });
        y += Math.max(h, 12) + 8;
      }
      y += 8;
    };

    // New page when the next block would run into the footer area.
    const FOOTER_TOP = H - 110; // footer rule is drawn at H - 104
    const ensureSpace = (needed) => {
      if (y + needed <= FOOTER_TOP) return;
      doc.addPage({ size: 'A4', margin: 0 });
      doc.save();
      doc.rotate(-32, { origin: [W / 2, H / 2] });
      doc.font('Helvetica-Bold').fontSize(120).fillColor(BRAND).fillOpacity(0.05)
        .text('DEMO', 0, H / 2 - 70, { width: W, align: 'center' });
      doc.restore();
      doc.fillOpacity(1);
      y = 56;
    };

    // Case-wise lines of a consolidated payment, with a total row.
    const caseTable = (items) => {
      const cols = [
        { label: 'Case reference', x: M, w: 120 },
        { label: 'Offence', x: M + 128, w: 170 },
        { label: 'Case status', x: M + 306, w: 110 },
        { label: 'Amount', x: M + 416, w: contentW - 416, align: 'right' },
      ];
      const header = () => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED);
        cols.forEach((c) => doc.text(c.label.toUpperCase(), c.x, y, { width: c.w, align: c.align || 'left', characterSpacing: 0.4 }));
        y += 16;
        doc.moveTo(M, y - 4).lineTo(W - M, y - 4).lineWidth(0.5).strokeColor(LINE).stroke();
      };
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1).strokeColor(LINE).stroke();
      y += 14;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND).text(`CASES COVERED (${items.length})`, M, y, { characterSpacing: 0.8 });
      y += 20;
      header();
      for (const item of items) {
        const cells = [
          item.external_case_id || `#${item.case_id}`,
          titleCase(item.offense_type) || '—',
          STATUS_LABELS[item.case_status] || titleCase(item.case_status),
          formatAmount(item.amount, data.currency),
        ].map(pdfSafe);
        doc.font('Helvetica').fontSize(9.5);
        const h = Math.max(...cells.map((t, i) => doc.heightOfString(t, { width: cols[i].w })), 11);
        if (y + h + 8 > FOOTER_TOP) {
          ensureSpace(h + 40);
          header();
        }
        cells.forEach((t, i) => doc.fillColor(i === 3 ? INK : '#334155').text(t, cols[i].x, y, { width: cols[i].w, align: cols[i].align || 'left' }));
        y += h + 8;
      }
      ensureSpace(30);
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(LINE).stroke();
      y += 8;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK)
        .text('Total paid', M, y, { width: 300 })
        .text(formatAmount(data.amount, data.currency), cols[3].x - 40, y, { width: cols[3].w + 40, align: 'right' });
      y += 26;
    };

    section('Student information', [
      ['Student name', data.student_name],
      ['Student ID', data.enrollment_no],
      ['Email', data.student_email],
      ['Program', data.program ? String(data.program).toUpperCase() : null],
    ]);
    if (data.consolidated) {
      caseTable(data.items || []);
    } else {
      section('Case information', [
        ['Case reference', data.external_case_id || `#${data.case_id}`],
        ['Offence', titleCase(data.offense_type)],
        ['Case status', STATUS_LABELS[data.case_status] || titleCase(data.case_status)],
        ['Decision', data.decision ? String(data.decision).slice(0, 300) : null],
      ]);
    }
    // Section height: heading (34) + one 20pt row per field + padding.
    ensureSpace(34 + (data.consolidated ? 7 : 6) * 20 + 8);
    section('Transaction information', [
      ['Transaction ID', data.transaction_id],
      ...(data.consolidated ? [['Cases covered', String(data.items?.length || data.case_count)]] : []),
      ['Date and time', formatDateTime(data.payment_date)],
      ['Amount paid', formatAmount(data.amount, data.currency)],
      ['Currency', data.currency],
      ['Payment status', 'SUCCESSFUL'],
      ['Payment type', 'DEMO TRANSACTION'],
    ]);

    // Footer.
    const footerY = H - 104;
    doc.moveTo(M, footerY).lineTo(W - M, footerY).lineWidth(1).strokeColor(LINE).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(AMBER_TEXT).text('Demonstration document', M, footerY + 14);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(DISCLAIMER, M, footerY + 28, { width: contentW, lineGap: 2 });
    doc.fontSize(8).fillColor('#94a3b8')
      .text(`Generated ${formatDateTime(new Date())}  ·  Receipt for ${data.transaction_id}`, M, H - 40, { width: contentW, align: 'center' });

    doc.end();
  });
}

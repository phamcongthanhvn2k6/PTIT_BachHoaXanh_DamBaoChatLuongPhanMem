/**
 * Shared export utilities for generating professional PDF and Word documents
 * for Import Orders and Receiving Orders.
 */
import jsPDF from 'jspdf';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, ShadingType
} from 'docx';
import { saveAs } from 'file-saver';

// ─── Formatting helpers ───
const fmtCurrency = (v: number) => Number(v || 0).toLocaleString('vi-VN') + ' đ';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateTime = (d: any) => d ? new Date(d).toLocaleString('vi-VN') : '—';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp', ordered: 'Đã đặt', partially_received: 'Nhận một phần',
  received: 'Đã nhận', cancelled: 'Đã hủy', confirmed: 'Đã xác nhận',
};
const statusText = (s: string) => STATUS_LABELS[s] || s || '—';

// ─── PDF Export ────────────────────────────────────────
function addPdfHeader(doc: jsPDF, title: string) {
  doc.setFontSize(18);
  doc.setFont('Helvetica', 'bold');
  doc.text('LOTTE MART', 14, 18);
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text('Bách hóa XANH Vietnam — Modern Supermarket Chain', 14, 24);
  doc.setDrawColor(220, 53, 69);
  doc.setLineWidth(0.8);
  doc.line(14, 28, 196, 28);
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'bold');
  doc.text(title, 14, 38);
  return 44;
}

function addInfoRow(doc: jsPDF, label: string, value: string, x: number, y: number): number {
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.text(label + ':', x, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(value || '—', x + 42, y);
  return y + 6;
}

function addTableHeader(doc: jsPDF, cols: { label: string; x: number; w: number }[], y: number): number {
  doc.setFillColor(248, 249, 250);
  doc.rect(14, y - 4, 182, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  cols.forEach(col => doc.text(col.label, col.x, y));
  return y + 8;
}

function checkNewPage(doc: jsPDF, y: number, margin = 30): number {
  if (y > 270) {
    doc.addPage();
    return margin;
  }
  return y;
}

// ──────────── IMPORT ORDER PDF ────────────
export function exportImportOrderPDF(order: any) {
  const doc = new jsPDF();
  let y = addPdfHeader(doc, 'DON NHAP HANG / IMPORT ORDER');

  // Info grid
  y = addInfoRow(doc, 'Ma don', order.order_code || '—', 14, y);
  y = addInfoRow(doc, 'Nha cung cap', order.supplier_id?.name || '—', 14, y);
  y = addInfoRow(doc, 'Chi nhanh', typeof order.branch_id === 'object' ? order.branch_id?.name : String(order.branch_id || '—'), 14, y);
  y = addInfoRow(doc, 'Trang thai', statusText(order.status), 14, y);
  y = addInfoRow(doc, 'Ngay tao', fmtDateTime(order.createdAt || order.created_at), 14, y);
  y = addInfoRow(doc, 'Ngay du kien', fmtDate(order.expected_date), 14, y);
  y = addInfoRow(doc, 'Ghi chu', order.note || '—', 14, y);
  y += 4;

  // Items table
  const cols = [
    { label: '#', x: 14, w: 8 },
    { label: 'San pham', x: 22, w: 68 },
    { label: 'SL Dat', x: 92, w: 20 },
    { label: 'SL Nhan', x: 112, w: 20 },
    { label: 'Don gia', x: 134, w: 28 },
    { label: 'Thanh tien', x: 164, w: 32 },
  ];
  y = addTableHeader(doc, cols, y);

  const items = order.items || [];
  items.forEach((item: any, idx: number) => {
    y = checkNewPage(doc, y);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text(String(idx + 1), 14, y);
    doc.text(String(item.product_name || item.product_id || '—').substring(0, 35), 22, y);
    doc.text(String(item.quantity_ordered || 0), 96, y);
    doc.text(String(item.quantity_received || 0), 116, y);
    doc.text(fmtCurrency(item.unit_cost || 0), 134, y);
    doc.text(fmtCurrency((item.quantity_ordered || 0) * (item.unit_cost || 0)), 164, y);
    y += 5;
  });

  // Total
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y - 2, 196, y - 2);
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'bold');
  doc.text('TONG CONG:', 134, y + 4);
  doc.text(fmtCurrency(order.total_amount || 0), 164, y + 4);

  // Footer
  y += 20;
  y = checkNewPage(doc, y);
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Xuat boi he thong Bách hóa XANH — ${fmtDateTime(new Date())}`, 14, y);

  const fileName = `Don_nhap_${order.order_code || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  return fileName;
}

// ──────────── IMPORT ORDER WORD ────────────
export async function exportImportOrderWord(order: any) {
  const items = order.items || [];

  const headerRow = new TableRow({
    tableHeader: true,
    children: ['#', 'San pham', 'SL Dat', 'SL Nhan', 'Don gia', 'Thanh tien'].map(label =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: 'F8F9FA' },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, font: 'Calibri' })] })],
      })
    ),
  });

  const dataRows = items.map((item: any, idx: number) =>
    new TableRow({
      children: [
        String(idx + 1),
        String(item.product_name || item.product_id || '—'),
        String(item.quantity_ordered || 0),
        String(item.quantity_received || 0),
        fmtCurrency(item.unit_cost || 0),
        fmtCurrency((item.quantity_ordered || 0) * (item.unit_cost || 0)),
      ].map(text =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: 'Calibri' })] })] })
      ),
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: 'LOTTE MART', bold: true, size: 36, font: 'Calibri', color: 'DC3545' })] }),
        new Paragraph({ children: [new TextRun({ text: 'Bách hóa XANH Vietnam — Modern Supermarket Chain', size: 18, font: 'Calibri', italics: true, color: '666666' })] }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'DON NHAP HANG / IMPORT ORDER', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '' }),
        ...[
          ['Ma don', order.order_code || '—'],
          ['Nha cung cap', order.supplier_id?.name || '—'],
          ['Chi nhanh', typeof order.branch_id === 'object' ? order.branch_id?.name : String(order.branch_id || '—')],
          ['Trang thai', statusText(order.status)],
          ['Ngay tao', fmtDateTime(order.createdAt || order.created_at)],
          ['Ngay du kien nhan', fmtDate(order.expected_date)],
          ['Ghi chu', order.note || '—'],
        ].map(([label, value]) =>
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `${label}: `, bold: true, size: 20, font: 'Calibri' }),
              new TextRun({ text: value as string, size: 20, font: 'Calibri' }),
            ],
          })
        ),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: 'Chi tiet san pham', bold: true, size: 22, font: 'Calibri' })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'TONG CONG: ', bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: fmtCurrency(order.total_amount || 0), bold: true, size: 22, font: 'Calibri', color: 'DC3545' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({ text: `Xuat boi he thong Bách hóa XANH — ${fmtDateTime(new Date())}`, size: 16, font: 'Calibri', color: '999999', italics: true })],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Don_nhap_${order.order_code || 'unknown'}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
  return fileName;
}

// ──────────── IMPORT RECEIPT PDF ────────────
export function exportImportReceiptPDF(receipt: any) {
  const doc = new jsPDF();
  let y = addPdfHeader(doc, 'PHIEU NHAN HANG / GOODS RECEIPT');

  y = addInfoRow(doc, 'Ma phieu', receipt.receipt_code || '—', 14, y);
  y = addInfoRow(doc, 'Don nhap lien quan', receipt.import_order_id?.order_code || '—', 14, y);
  y = addInfoRow(doc, 'Nha cung cap', receipt.supplier_id?.name || '—', 14, y);
  y = addInfoRow(doc, 'Chi nhanh', typeof receipt.branch_id === 'object' ? receipt.branch_id?.name : String(receipt.branch_id || '—'), 14, y);
  y = addInfoRow(doc, 'Trang thai', statusText(receipt.status), 14, y);
  y = addInfoRow(doc, 'Ngay nhan', fmtDate(receipt.received_date), 14, y);
  y = addInfoRow(doc, 'Ghi chu', receipt.note || '—', 14, y);
  y += 4;

  const cols = [
    { label: '#', x: 14, w: 8 },
    { label: 'San pham', x: 22, w: 60 },
    { label: 'SL Nhan', x: 84, w: 18 },
    { label: 'Don gia', x: 104, w: 28 },
    { label: 'Thanh tien', x: 134, w: 28 },
    { label: 'Lo SX', x: 164, w: 18 },
    { label: 'HSD', x: 182, w: 14 },
  ];
  y = addTableHeader(doc, cols, y);

  const items = receipt.items || [];
  items.forEach((item: any, idx: number) => {
    y = checkNewPage(doc, y);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text(String(idx + 1), 14, y);
    doc.text(String(item.product_name || item.product_id || '—').substring(0, 30), 22, y);
    doc.text(String(item.quantity_received || 0), 88, y);
    doc.text(fmtCurrency(item.unit_cost || 0), 104, y);
    doc.text(fmtCurrency((item.quantity_received || 0) * (item.unit_cost || 0)), 134, y);
    doc.text(String(item.batch_code || '—').substring(0, 12), 164, y);
    doc.text(item.expiry_date ? fmtDate(item.expiry_date).substring(0, 10) : '—', 182, y);
    y += 5;
  });

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y - 2, 196, y - 2);
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'bold');
  doc.text('TONG CONG:', 134, y + 4);
  doc.text(fmtCurrency(receipt.total_amount || 0), 164, y + 4);

  y += 20;
  y = checkNewPage(doc, y);
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Xuat boi he thong Bách hóa XANH — ${fmtDateTime(new Date())}`, 14, y);

  const fileName = `Phieu_nhan_${receipt.receipt_code || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  return fileName;
}

// ──────────── IMPORT RECEIPT WORD ────────────
export async function exportImportReceiptWord(receipt: any) {
  const items = receipt.items || [];

  const headerRow = new TableRow({
    tableHeader: true,
    children: ['#', 'San pham', 'SL Nhan', 'Don gia', 'Thanh tien', 'Lo SX', 'HSD'].map(label =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: 'F8F9FA' },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, font: 'Calibri' })] })],
      })
    ),
  });

  const dataRows = items.map((item: any, idx: number) =>
    new TableRow({
      children: [
        String(idx + 1),
        String(item.product_name || item.product_id || '—'),
        String(item.quantity_received || 0),
        fmtCurrency(item.unit_cost || 0),
        fmtCurrency((item.quantity_received || 0) * (item.unit_cost || 0)),
        String(item.batch_code || '—'),
        item.expiry_date ? fmtDate(item.expiry_date) : '—',
      ].map(text =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: 'Calibri' })] })] })
      ),
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: 'LOTTE MART', bold: true, size: 36, font: 'Calibri', color: 'DC3545' })] }),
        new Paragraph({ children: [new TextRun({ text: 'Bách hóa XANH Vietnam — Modern Supermarket Chain', size: 18, font: 'Calibri', italics: true, color: '666666' })] }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'PHIEU NHAN HANG / GOODS RECEIPT', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '' }),
        ...[
          ['Ma phieu', receipt.receipt_code || '—'],
          ['Don nhap lien quan', receipt.import_order_id?.order_code || '—'],
          ['Nha cung cap', receipt.supplier_id?.name || '—'],
          ['Chi nhanh', typeof receipt.branch_id === 'object' ? receipt.branch_id?.name : String(receipt.branch_id || '—')],
          ['Trang thai', statusText(receipt.status)],
          ['Ngay nhan hang', fmtDate(receipt.received_date)],
          ['Nguoi nhan', receipt.received_by?.full_name || receipt.received_by || '—'],
          ['Ghi chu', receipt.note || '—'],
        ].map(([label, value]) =>
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `${label}: `, bold: true, size: 20, font: 'Calibri' }),
              new TextRun({ text: value as string, size: 20, font: 'Calibri' }),
            ],
          })
        ),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: 'San pham da nhan', bold: true, size: 22, font: 'Calibri' })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'TONG CONG: ', bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: fmtCurrency(receipt.total_amount || 0), bold: true, size: 22, font: 'Calibri', color: 'DC3545' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({ text: `Xuat boi he thong Bách hóa XANH — ${fmtDateTime(new Date())}`, size: 16, font: 'Calibri', color: '999999', italics: true })],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Phieu_nhan_${receipt.receipt_code || 'unknown'}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
  return fileName;
}

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { docTotals } from './store.jsx'

// jsPDF's built-in fonts lack the ₹ glyph, so render it as "Rs."
const cur = (c) => (c === '₹' ? 'Rs.' : c)
const fmt = (n, c) => `${cur(c)} ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const d = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')

export function generatePDF(doc, client, settings, { save = true } = {}) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = pdf.internal.pageSize.getWidth()
  const M = 48
  const ink = [24, 24, 27], muted = [113, 113, 122], line = [228, 228, 231]
  const c = settings.currency
  let y = M

  pdf.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...ink).text(settings.agencyName || 'Agency', M, y + 6)
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...muted)
  const agencyLines = [settings.tagline, settings.address, [settings.phone, settings.email].filter(Boolean).join('  |  '), settings.gstin && 'GSTIN: ' + settings.gstin].filter(Boolean)
  agencyLines.forEach((l, i) => pdf.text(pdf.splitTextToSize(l, 260), M, y + 22 + i * 12))

  pdf.setFont('helvetica', 'bold').setFontSize(22).setTextColor(...ink).text(doc.type.toUpperCase(), W - M, y + 6, { align: 'right' })
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...muted)
  const metaRows = [
    ['No.', doc.number],
    ['Date', d(doc.date)],
    [doc.type === 'Invoice' ? 'Due' : 'Valid until', d(doc.dueDate)],
  ]
  metaRows.forEach(([k, v], i) => {
    pdf.setTextColor(...muted).text(k, W - M - 110, y + 24 + i * 13)
    pdf.setTextColor(...ink).text(String(v), W - M, y + 24 + i * 13, { align: 'right' })
  })

  y += Math.max(30 + agencyLines.length * 12, 70) + 14
  pdf.setDrawColor(...line).line(M, y, W - M, y)
  y += 22

  pdf.setFontSize(8).setTextColor(...muted).text(doc.type === 'Invoice' ? 'BILL TO' : 'PREPARED FOR', M, y)
  pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...ink).text(client?.name || doc.clientName || '-', M, y + 15)
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...muted)
  const cl = [client?.contact, client?.address, [client?.phone, client?.email].filter(Boolean).join('  |  ')].filter(Boolean)
  let cy = y + 28
  cl.forEach((l) => { const s = pdf.splitTextToSize(l, 300); pdf.text(s, M, cy); cy += s.length * 12 })
  if (doc.subject) {
    pdf.setFontSize(8).text('SUBJECT', W / 2 + 30, y)
    pdf.setFontSize(10).setTextColor(...ink).text(pdf.splitTextToSize(doc.subject, W / 2 - 80), W / 2 + 30, y + 15)
  }
  y = Math.max(cy, y + 40) + 10

  autoTable(pdf, {
    startY: y,
    margin: { left: M, right: M },
    head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
    body: doc.items.map((it, i) => [i + 1, it.desc, it.qty, fmt(it.rate, c), fmt(it.qty * it.rate, c)]),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9.5, textColor: ink, cellPadding: { top: 8, bottom: 8, left: 6, right: 6 }, lineColor: line, lineWidth: { bottom: 0.6 } },
    headStyles: { fillColor: [244, 244, 245], textColor: muted, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 26 }, 2: { halign: 'right', cellWidth: 44 }, 3: { halign: 'right', cellWidth: 90 }, 4: { halign: 'right', cellWidth: 100 } },
    didParseCell: (h) => { if (h.section === 'head' && h.column.index >= 2) h.cell.styles.halign = 'right' },
  })

  const t = docTotals(doc)
  y = pdf.lastAutoTable.finalY + 18
  const rows = [['Subtotal', fmt(t.sub, c)]]
  if (t.disc) rows.push(['Discount', '- ' + fmt(t.disc, c)])
  if (Number(doc.taxPct)) rows.push([`GST / Tax (${doc.taxPct}%)`, fmt(t.tax, c)])
  pdf.setFontSize(9.5)
  rows.forEach(([k, v]) => {
    pdf.setTextColor(...muted).text(k, W - M - 200, y)
    pdf.setTextColor(...ink).text(v, W - M, y, { align: 'right' })
    y += 16
  })
  pdf.setDrawColor(...line).line(W - M - 200, y - 6, W - M, y - 6)
  y += 10
  pdf.setFont('helvetica', 'bold').setFontSize(12).text('Total', W - M - 200, y)
  pdf.text(fmt(t.total, c), W - M, y, { align: 'right' })
  if (doc.type === 'Invoice' && doc.status === 'Paid') {
    pdf.setFontSize(10).setTextColor(22, 163, 74).text('PAID', W - M, y + 18, { align: 'right' })
  }
  y += 40

  const block = (title, text) => {
    if (!text) return
    if (y > 740) { pdf.addPage(); y = M }
    pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...muted).text(title, M, y)
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...ink)
    const s = pdf.splitTextToSize(text, W - M * 2)
    pdf.text(s, M, y + 14)
    y += 26 + s.length * 12
  }
  block('NOTES', doc.notes)
  if (doc.type === 'Invoice') block('PAYMENT DETAILS', settings.bank)
  block('TERMS & CONDITIONS', doc.terms)

  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...muted)
    pdf.text(`${settings.agencyName || ''}  ·  ${doc.number}`, M, 815)
    pdf.text(`Page ${i} of ${pages}`, W - M, 815, { align: 'right' })
  }

  const name = `${doc.number}-${(client?.name || doc.clientName || 'client').replace(/[^a-z0-9]+/gi, '-')}.pdf`
  if (save) pdf.save(name)
  return pdf
}

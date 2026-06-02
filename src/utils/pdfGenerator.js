import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a professional PDF Invoice for a client and selected time entries.
 * 
 * @param {Object} userProfile - The billing contractor's profile details.
 * @param {Object} client - The client being invoiced.
 * @param {Array} entries - The selected time entries to include.
 * @param {Object} invoiceMeta - Metadata (invoiceNumber, invoiceDate, dueDate, taxRate).
 */
export const generateInvoicePDF = (userProfile, client, entries, invoiceMeta) => {
  const doc = new jsPDF();
  
  const { invoiceNumber, invoiceDate, dueDate, taxRate } = invoiceMeta;
  const currentTaxRate = parseFloat(taxRate) || 0;

  // Formatting helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[1]}/${parts[2]}/${parts[0]}`; // MM/DD/YYYY
  };

  // 1. Color Palette / Styling Setup
  const primaryColor = [99, 102, 241]; // Indigo
  const darkTextColor = [30, 41, 59]; // Slate 800
  const lightTextColor = [100, 116, 139]; // Slate 500
  
  // 2. Invoice Title and Header Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(userProfile.company || userProfile.name, 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  
  // Contractor Address Block
  let contractorY = 26;
  if (userProfile.address) {
    const addrLines = doc.splitTextToSize(userProfile.address, 70);
    addrLines.forEach(line => {
      doc.text(line, 14, contractorY);
      contractorY += 4.5;
    });
  }
  doc.text(`Email: ${userProfile.email}`, 14, contractorY);

  // Invoice Meta Block (Top Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('INVOICE', 140, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  
  let metaY = 27;
  const printMetaRow = (label, val) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 140, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(val, 175, metaY);
    metaY += 5;
  };
  
  printMetaRow('Invoice No:', invoiceNumber);
  printMetaRow('Date:', formatDate(invoiceDate));
  printMetaRow('Due Date:', formatDate(dueDate));

  // Divider Line
  doc.setDrawColor(226, 232, 240); // light gray
  doc.setLineWidth(0.5);
  doc.line(14, metaY + 2, 196, metaY + 2);

  // 3. Bill To / Bill From Details
  let billingY = metaY + 12;

  // Bill To (Left Column)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('BILL TO:', 14, billingY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(client.name, 14, billingY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  
  let clientAddrY = billingY + 10.5;
  if (client.address) {
    const clientAddrLines = doc.splitTextToSize(client.address, 80);
    clientAddrLines.forEach(line => {
      doc.text(line, 14, clientAddrY);
      clientAddrY += 4.5;
    });
  }
  if (client.email) {
    doc.text(`Email: ${client.email}`, 14, clientAddrY);
  }

  // 4. Time Logs Table
  const tableHeaders = [['Date', 'Category & Description', 'Rate', 'Hours', 'Line Total']];
  const tableRows = entries.map(e => {
    // Combine category and description for a cleaner invoice layout
    const detail = `${e.category}\n${e.description}`;
    const amount = e.duration * e.rate;
    return [
      formatDate(e.date),
      detail,
      `${formatCurrency(e.rate)}/hr`,
      `${e.duration.toFixed(2)}h`,
      formatCurrency(amount)
    ];
  });

  // Calculate calculations
  let subtotal = 0;
  entries.forEach(e => {
    subtotal += e.duration * e.rate;
  });
  const taxAmount = subtotal * (currentTaxRate / 100);
  const grandTotal = subtotal + taxAmount;

  // Generate Table
  const tableStartY = Math.max(clientAddrY + 10, billingY + 28);
  autoTable(doc, {
    head: tableHeaders,
    body: tableRows,
    startY: tableStartY,
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [51, 65, 85],
      valign: 'middle'
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 22 }, // Date
      1: { cellWidth: 95 }, // Description
      2: { cellWidth: 22, halign: 'right' }, // Rate
      3: { cellWidth: 18, halign: 'center' }, // Hours
      4: { cellWidth: 25, halign: 'right' }  // Total
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // 5. Invoice Calculations Block (Bottom Right)
  const finalY = doc.lastAutoTable.finalY + 10;
  
  const printTotalRow = (label, val, isGrand = false) => {
    let rowY = totalsY;
    doc.setFont('helvetica', isGrand ? 'bold' : 'normal');
    doc.setFontSize(isGrand ? 11 : 9.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(label, 130, rowY, { align: 'right' });
    doc.text(val, 196, rowY, { align: 'right' });
    totalsY += isGrand ? 8 : 5.5;
  };

  let totalsY = finalY;
  
  // Avoid page break collision for totals
  if (totalsY > 260) {
    doc.addPage();
    totalsY = 20;
  }

  printTotalRow('Subtotal:', formatCurrency(subtotal));
  if (currentTaxRate > 0) {
    printTotalRow(`Tax (${currentTaxRate}%):`, formatCurrency(taxAmount));
  }
  printTotalRow('Total Due:', formatCurrency(grandTotal), true);

  // 6. Payment Information and Footer (Bottom Left)
  let footerY = finalY;
  if (footerY > 250) {
    doc.addPage();
    footerY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('PAYMENT INSTRUCTIONS:', 14, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  
  let instructionsY = footerY + 5.5;
  if (userProfile.paymentDetails) {
    const payLines = doc.splitTextToSize(userProfile.paymentDetails, 100);
    payLines.forEach(line => {
      doc.text(line, 14, instructionsY);
      instructionsY += 4;
    });
  } else {
    doc.text('Please transfer funds upon receipt of invoice.', 14, instructionsY);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Thank you for your business!', 14, instructionsY + 8);

  // Save the PDF file
  doc.save(`invoice_${invoiceNumber}_${client.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};

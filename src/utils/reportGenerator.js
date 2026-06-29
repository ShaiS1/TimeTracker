import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Escapes a string value for CSV compatibility.
 */
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Formats a date string MM/DD/YYYY.
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
};

/**
 * Formats a currency value.
 */
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

/**
 * Triggers a browser download of a generated text/blob file.
 */
const downloadFile = (content, filename, contentType) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads a CSV timesheet export.
 * 
 * @param {Object} userProfile - Contractor profile details.
 * @param {Array} entries - The entries to export.
 * @param {Array} clients - Clients list for mapping names.
 */
export const generateTimesheetCSV = (userProfile, entries, clients) => {
  const clientMap = clients.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  // 1. Compute summary stats
  let totalHours = 0;
  let totalEarnings = 0;
  const dates = [];

  entries.forEach(e => {
    totalHours += e.duration;
    totalEarnings += e.duration * e.rate;
    if (e.date) dates.push(e.date);
  });

  dates.sort();
  const startDate = dates.length > 0 ? formatDate(dates[0]) : 'N/A';
  const endDate = dates.length > 0 ? formatDate(dates[dates.length - 1]) : 'N/A';
  const dateRangeStr = dates.length > 0 ? `${startDate} to ${endDate}` : 'All Time';

  // 2. Build CSV Content
  const csvRows = [];
  
  // Header Meta
  csvRows.push(`TEMPO TIMESHEET REPORT`);
  csvRows.push(`Contractor Name,${escapeCSV(userProfile.name)}`);
  if (userProfile.company) csvRows.push(`Company,${escapeCSV(userProfile.company)}`);
  csvRows.push(`Email,${escapeCSV(userProfile.email)}`);
  csvRows.push(`Reporting Period,${escapeCSV(dateRangeStr)}`);
  csvRows.push(`Total Hours,${totalHours.toFixed(2)}`);
  csvRows.push(`Total Earnings,${totalEarnings.toFixed(2)}`);
  csvRows.push(``); // Blank spacing row

  // Table Headers
  csvRows.push(`Date,Client,Category,Description,Hours,Rate ($/hr),Total ($),Status,Invoice Number`);

  // Data Rows
  entries.forEach(e => {
    const clientName = clientMap[e.clientId]?.name || 'Unknown';
    const amount = e.duration * e.rate;
    const row = [
      formatDate(e.date),
      clientName,
      e.category,
      e.description,
      e.duration.toFixed(2),
      e.rate.toFixed(2),
      amount.toFixed(2),
      e.status,
      e.invoiceNumber || ''
    ];
    csvRows.push(row.map(escapeCSV).join(','));
  });

  const csvContent = csvRows.join('\n');
  const filename = `tempo_timesheet_${userProfile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${getLocalDateString()}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};

/**
 * Generates and downloads a professional PDF timesheet summary report.
 * 
 * @param {Object} userProfile - Contractor profile details.
 * @param {Array} entries - The entries to export.
 * @param {Array} clients - Clients list.
 */
export const generateTimesheetPDF = async (userProfile, entries, clients) => {
  const doc = new jsPDF();
  
  const clientMap = clients.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  // Color Palette / Styling
  const primaryColor = [99, 102, 241]; // Indigo brand color
  const darkTextColor = [30, 41, 59]; // Slate 800
  const lightTextColor = [100, 116, 139]; // Slate 500

  // 1. Compute summary and period
  let totalHours = 0;
  let totalEarnings = 0;
  const dates = [];
  const clientTotals = {};

  entries.forEach(e => {
    totalHours += e.duration;
    const lineTotal = e.duration * e.rate;
    totalEarnings += lineTotal;
    if (e.date) dates.push(e.date);
    
    // Group client breakdown totals
    const clientName = clientMap[e.clientId]?.name || 'Unknown';
    if (!clientTotals[clientName]) {
      clientTotals[clientName] = { hours: 0, earnings: 0 };
    }
    clientTotals[clientName].hours += e.duration;
    clientTotals[clientName].earnings += lineTotal;
  });

  dates.sort();
  const startDate = dates.length > 0 ? formatDate(dates[0]) : 'N/A';
  const endDate = dates.length > 0 ? formatDate(dates[dates.length - 1]) : 'N/A';
  const dateRangeStr = dates.length > 0 ? `${startDate} to ${endDate}` : 'All Time';

  // Load Brand Logo
  let logoImg = null;
  try {
    logoImg = await new Promise((resolve) => {
      const img = new Image();
      img.src = '/tempo_logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn("Could not load timesheet brand logo:", e);
  }

  // 2. Timesheet Title & Header Block
  let titleX = 14;
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', 14, 12, 12, 12);
    titleX = 29;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TEMPO TIMESHEET REPORT', titleX, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text(`Generated on: ${formatDate(getLocalDateString())}`, titleX, 26);

  // Contractor details (Top Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(userProfile.name, 196, 20, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  let detailY = 24.5;
  if (userProfile.company) {
    doc.text(userProfile.company, 196, detailY, { align: 'right' });
    detailY += 4.5;
  }
  doc.text(userProfile.email, 196, detailY, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, detailY + 4, 196, detailY + 4);

  // 3. Metadata Grid
  let metaY = detailY + 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('REPORT DETAILS', 14, metaY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  
  let gridY = metaY + 5.5;
  const printGridRow = (label, val, xOffset) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, xOffset, gridY);
    doc.setFont('helvetica', 'normal');
    doc.text(val, xOffset + 32, gridY);
  };

  printGridRow('Reporting Period:', dateRangeStr, 14);
  printGridRow('Total Hours Logged:', `${totalHours.toFixed(2)} hrs`, 110);
  gridY += 5;
  printGridRow('Total Entries:', `${entries.length} items`, 14);
  printGridRow('Total Gross Earnings:', formatCurrency(totalEarnings), 110);

  // Divider Line
  doc.line(14, gridY + 4, 196, gridY + 4);

  // 4. Client Summary Breakdown Table
  let breakdownStartY = gridY + 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('CLIENT HOURS BREAKDOWN', 14, breakdownStartY);

  const clientHeaders = [['Client Name', 'Logged Hours', 'Gross Earnings']];
  const clientRows = Object.keys(clientTotals).map(cName => [
    cName,
    `${clientTotals[cName].hours.toFixed(2)}h`,
    formatCurrency(clientTotals[cName].earnings)
  ]);

  autoTable(doc, {
    head: clientHeaders,
    body: clientRows,
    startY: breakdownStartY + 4,
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [51, 65, 85]
    },
    headStyles: {
      fillColor: [51, 65, 85], // Slate 700 header
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 42, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // 5. Detailed Log Table
  let logsStartY = doc.lastAutoTable.finalY + 10;
  
  // Guard page breaks before logs table header
  if (logsStartY > 240) {
    doc.addPage();
    logsStartY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('DETAILED WORK ENTRIES LOG', 14, logsStartY);

  const entryHeaders = [['Date', 'Client', 'Category & Description', 'Rate', 'Hours', 'Total']];
  const entryRows = entries.map(e => [
    formatDate(e.date),
    clientMap[e.clientId]?.name || 'Unknown',
    `${e.category}\n${e.description}`,
    `${formatCurrency(e.rate)}/hr`,
    `${e.duration.toFixed(2)}h`,
    formatCurrency(e.duration * e.rate)
  ]);

  autoTable(doc, {
    head: entryHeaders,
    body: entryRows,
    startY: logsStartY + 4,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85],
      valign: 'middle'
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 17, halign: 'center' },
      5: { cellWidth: 20, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // 6. Signature Block
  let signatureY = doc.lastAutoTable.finalY + 15;
  if (signatureY > 250) {
    doc.addPage();
    signatureY = 30;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, signatureY, 74, signatureY); // contractor sign line
  doc.line(120, signatureY, 180, signatureY); // client sign line

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('Contractor Signature & Date', 14, signatureY + 4);
  doc.text('Client Representative Signature & Date', 120, signatureY + 4);

  // 7. Add running footers and headers (Page X of Y)
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Running Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.text(`Page ${i} of ${totalPages}`, 196, 287, { align: 'right' });
    doc.text('Tempo | Contract Work Time Tracker', 14, 287);
    
    // Running Header (pages 2+)
    if (i > 1) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 10, 196, 10);
      
      doc.setFont('helvetica', 'bold');
      doc.text('TEMPO TIMESHEET REPORT', 14, 8);
      doc.setFont('helvetica', 'normal');
      doc.text(userProfile.name, 196, 8, { align: 'right' });
    }
  }

  const filename = `tempo_timesheet_${userProfile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${getLocalDateString()}.pdf`;
  doc.save(filename);
};

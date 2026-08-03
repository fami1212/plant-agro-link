import jsPDF from "jspdf";
import "jspdf-autotable";

// Extend jsPDF type for autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

const COLORS = {
  primary: [34, 139, 34],    // Forest green
  accent: [255, 165, 0],     // Orange
  dark: [30, 30, 30],
  muted: [120, 120, 120],
  light: [245, 245, 245],
  white: [255, 255, 255],
  success: [22, 163, 74],
  destructive: [220, 38, 38],
};

function addHeader(doc: jsPDF, title: string) {
  // Green header bar
  doc.setFillColor(...COLORS.primary as [number, number, number]);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PLANTÉRA", 15, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Agriculture Intelligente", 15, 26);

  // Date
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }), 195, 18, { align: "right" });

  // Title
  doc.setTextColor(...COLORS.dark as [number, number, number]);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 15, 50);

  // Divider
  doc.setDrawColor(...COLORS.primary as [number, number, number]);
  doc.setLineWidth(0.5);
  doc.line(15, 54, 195, 54);
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    doc.text(
      `© ${new Date().getFullYear()} PlantErea - Agriculture Intelligente | Page ${i}/${pageCount}`,
      105, 290, { align: "center" }
    );
    doc.setDrawColor(...COLORS.light as [number, number, number]);
    doc.line(15, 285, 195, 285);
  }
}

// ============ TRACEABILITY CERTIFICATE ============
export function generateTraceabilityCertificatePDF(data: {
  lotId: string;
  productName: string;
  variety?: string;
  fieldName?: string;
  fieldLocation?: string;
  soilType?: string;
  sowingDate?: string;
  harvestDate?: string;
  quantity?: number;
  qualityGrade?: string;
  blockchainHash?: string;
  farmerName?: string;
  iotData?: { avgHumidity?: number; avgTemperature?: number; irrigationCount?: number };
}) {
  const doc = new jsPDF();
  addHeader(doc, "Certificat de Traçabilité");

  let y = 65;

  // Product info box
  doc.setFillColor(...COLORS.light as [number, number, number]);
  doc.roundedRect(15, y, 180, 30, 3, 3, "F");
  doc.setTextColor(...COLORS.dark as [number, number, number]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.productName, 22, y + 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted as [number, number, number]);
  if (data.variety) doc.text(`Variété: ${data.variety}`, 22, y + 20);
  doc.setFontSize(8);
  doc.text(`LOT: ${data.lotId.substring(0, 36)}`, 22, y + 26);
  if (data.qualityGrade) {
    doc.setFillColor(...COLORS.success as [number, number, number]);
    doc.roundedRect(155, y + 5, 35, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(data.qualityGrade.toUpperCase(), 172.5, y + 12, { align: "center" });
  }
  y += 40;

  // Origin table
  const originRows: string[][] = [];
  if (data.fieldName) originRows.push(["Parcelle", data.fieldName]);
  if (data.fieldLocation) originRows.push(["Localisation", data.fieldLocation]);
  if (data.soilType) originRows.push(["Type de sol", data.soilType]);
  if (data.farmerName) originRows.push(["Producteur", data.farmerName]);

  if (originRows.length > 0) {
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("📍 Origine", 15, y);
    y += 3;
    doc.autoTable({
      startY: y,
      body: originRows,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50, textColor: COLORS.muted }, 1: { textColor: COLORS.dark } },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Production table
  const prodRows: string[][] = [];
  if (data.sowingDate) prodRows.push(["Date de semis", new Date(data.sowingDate).toLocaleDateString("fr-FR")]);
  if (data.harvestDate) prodRows.push(["Date de récolte", new Date(data.harvestDate).toLocaleDateString("fr-FR")]);
  if (data.quantity) prodRows.push(["Quantité", `${data.quantity} kg`]);

  if (prodRows.length > 0) {
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("📅 Production", 15, y);
    y += 3;
    doc.autoTable({
      startY: y,
      body: prodRows,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50, textColor: COLORS.muted }, 1: { textColor: COLORS.dark } },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // IoT Data
  if (data.iotData) {
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("📊 Données Capteurs IoT", 15, y);
    y += 3;
    const iotRows: string[][] = [];
    if (data.iotData.avgHumidity !== undefined) iotRows.push(["Humidité moyenne", `${data.iotData.avgHumidity}%`]);
    if (data.iotData.avgTemperature !== undefined) iotRows.push(["Température moyenne", `${data.iotData.avgTemperature}°C`]);
    if (data.iotData.irrigationCount !== undefined) iotRows.push(["Nombre d'irrigations", `${data.iotData.irrigationCount}`]);
    doc.autoTable({
      startY: y,
      body: iotRows,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60, textColor: COLORS.muted }, 1: { textColor: COLORS.dark } },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Blockchain hash
  if (data.blockchainHash) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, y, 180, 20, 3, 3, "F");
    doc.setTextColor(...COLORS.success as [number, number, number]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("✅ Signature Blockchain Vérifiée", 22, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    doc.text(data.blockchainHash, 22, y + 15);
  }

  addFooter(doc);
  doc.save(`certificat-${data.lotId.substring(0, 8)}.pdf`);
}

// ============ FINANCIAL REPORT ============
export function generateFinancialReportPDF(data: {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  investmentsReceived: number;
  pendingPayments: number;
  monthlyData: { month: string; revenue: number; expenses: number }[];
  recentTransactions: { type: string; description: string; amount: number; date: string; category: string }[];
}) {
  const doc = new jsPDF();
  addHeader(doc, `Rapport Financier - ${data.period}`);

  let y = 65;

  // Summary cards
  const summaryItems = [
    { label: "Revenus totaux", value: `${data.totalRevenue.toLocaleString()} FCFA`, color: COLORS.success },
    { label: "Dépenses totales", value: `${data.totalExpenses.toLocaleString()} FCFA`, color: COLORS.destructive },
    { label: "Bénéfice net", value: `${data.netProfit.toLocaleString()} FCFA`, color: data.netProfit >= 0 ? COLORS.success : COLORS.destructive },
    { label: "Investissements reçus", value: `${data.investmentsReceived.toLocaleString()} FCFA`, color: COLORS.primary },
    { label: "Paiements en attente", value: `${data.pendingPayments.toLocaleString()} FCFA`, color: COLORS.accent },
  ];

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary as [number, number, number]);
  doc.text("Résumé", 15, y);
  y += 5;

  doc.autoTable({
    startY: y,
    body: summaryItems.map(item => [item.label, item.value]),
    theme: "striped",
    styles: { fontSize: 11, cellPadding: 5 },
    columnStyles: { 
      0: { fontStyle: "bold", cellWidth: 80 }, 
      1: { halign: "right", fontStyle: "bold" } 
    },
    margin: { left: 15, right: 15 },
    headStyles: { fillColor: COLORS.primary as [number, number, number] },
  });
  y = doc.lastAutoTable.finalY + 12;

  // Monthly breakdown
  if (data.monthlyData.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.text("Évolution Mensuelle", 15, y);
    y += 3;

    doc.autoTable({
      startY: y,
      head: [["Mois", "Revenus (FCFA)", "Dépenses (FCFA)", "Balance (FCFA)"]],
      body: data.monthlyData.map(m => [
        m.month,
        m.revenue.toLocaleString(),
        m.expenses.toLocaleString(),
        (m.revenue - m.expenses).toLocaleString(),
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: COLORS.primary as [number, number, number], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  // Recent transactions
  if (data.recentTransactions.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.text("Transactions Récentes", 15, y);
    y += 3;

    doc.autoTable({
      startY: y,
      head: [["Date", "Description", "Catégorie", "Montant (FCFA)"]],
      body: data.recentTransactions.map(t => [
        new Date(t.date).toLocaleDateString("fr-FR"),
        t.description,
        t.category,
        `${t.type === "revenue" ? "+" : "-"}${t.amount.toLocaleString()}`,
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary as [number, number, number], textColor: [255, 255, 255] },
      columnStyles: { 3: { halign: "right" } },
      margin: { left: 15, right: 15 },
    });
  }

  addFooter(doc);
  doc.save(`rapport-financier-${data.period}.pdf`);
}

// ============ AGRICULTURAL REPORT ============
export function generateAgriculturalReportPDF(data: {
  farmerName: string;
  fields: { name: string; area: number; soilType: string; status: string }[];
  crops: { name: string; type: string; field: string; status: string; sowingDate?: string; expectedYield?: number }[];
  livestock: { identifier: string; species: string; breed?: string; health: string; weight?: number }[];
  harvestSummary: { totalKg: number; avgQuality: string; recordCount: number };
}) {
  const doc = new jsPDF();
  addHeader(doc, "Rapport Agricole");

  let y = 60;

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.muted as [number, number, number]);
  doc.text(`Exploitant: ${data.farmerName}`, 15, y);
  y += 10;

  // Fields
  if (data.fields.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.text(`🗺️ Parcelles (${data.fields.length})`, 15, y);
    y += 3;
    doc.autoTable({
      startY: y,
      head: [["Nom", "Surface (ha)", "Type de sol", "Statut"]],
      body: data.fields.map(f => [f.name, f.area.toString(), f.soilType, f.status]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary as [number, number, number], textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Crops
  if (data.crops.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.text(`🌾 Cultures (${data.crops.length})`, 15, y);
    y += 3;
    doc.autoTable({
      startY: y,
      head: [["Nom", "Type", "Parcelle", "Statut", "Semis", "Rendement attendu"]],
      body: data.crops.map(c => [
        c.name, c.type, c.field, c.status,
        c.sowingDate ? new Date(c.sowingDate).toLocaleDateString("fr-FR") : "-",
        c.expectedYield ? `${c.expectedYield} kg` : "-",
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary as [number, number, number], textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Livestock
  if (data.livestock.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary as [number, number, number]);
    doc.text(`🐄 Bétail (${data.livestock.length})`, 15, y);
    y += 3;
    doc.autoTable({
      startY: y,
      head: [["Identifiant", "Espèce", "Race", "Santé", "Poids (kg)"]],
      body: data.livestock.map(l => [l.identifier, l.species, l.breed || "-", l.health, l.weight ? l.weight.toString() : "-"]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary as [number, number, number], textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Harvest summary
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFillColor(...COLORS.light as [number, number, number]);
  doc.roundedRect(15, y, 180, 25, 3, 3, "F");
  doc.setTextColor(...COLORS.dark as [number, number, number]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Résumé des Récoltes", 22, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total: ${data.harvestSummary.totalKg.toLocaleString()} kg | Qualité moyenne: ${data.harvestSummary.avgQuality} | ${data.harvestSummary.recordCount} récoltes`, 22, y + 19);

  addFooter(doc);
  doc.save(`rapport-agricole-${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// Contrat signé (export PDF avec identifiant de traçabilité)
// ─────────────────────────────────────────────────────────────
export interface ContractPdfData {
  traceRef: string;
  transactionId: string;
  type: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  parties: { role: string; name: string }[];
  signatures: {
    signer_name: string;
    signer_role?: string | null;
    signed_at: string;
    ip_address?: string | null;
    device?: string | null;
  }[];
  milestones: {
    label: string;
    amount: number;
    amount_percent: number;
    status: string;
    completed_at?: string | null;
  }[];
  blockchainTx?: string | null;
}

export function generateContractPDF(data: ContractPdfData) {
  const doc = new jsPDF();
  addHeader(doc, "Contrat signé");

  let y = 62;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.dark as [number, number, number]);

  // Traceability box
  doc.setFillColor(...COLORS.light as [number, number, number]);
  doc.roundedRect(15, y, 180, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Identifiant de traçabilité : ${data.traceRef}`, 22, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted as [number, number, number]);
  doc.text(`Réf. interne : ${data.transactionId}`, 22, y + 16);
  y += 32;

  doc.setTextColor(...COLORS.dark as [number, number, number]);
  doc.autoTable({
    startY: y,
    head: [["Objet du contrat", ""]],
    body: [
      ["Intitulé", data.title || "-"],
      ["Type", data.type],
      ["Montant", `${data.amount.toLocaleString()} ${data.currency}`],
      ["Statut", data.status],
      ["Date de création", new Date(data.createdAt).toLocaleString("fr-FR")],
    ],
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COLORS.primary as [number, number, number], textColor: [255, 255, 255] },
    margin: { left: 15, right: 15 },
  });
  y = doc.lastAutoTable.finalY + 10;

  if (data.parties.length) {
    doc.autoTable({
      startY: y,
      head: [["Partie", "Nom"]],
      body: data.parties.map((p) => [p.role, p.name]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary as [number, number, number], textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (data.milestones.length) {
    if (y > 210) { doc.addPage(); y = 20; }
    doc.autoTable({
      startY: y,
      head: [["Étape", "Part", "Montant", "Statut", "Validée le"]],
      body: data.milestones.map((m) => [
        m.label,
        `${m.amount_percent}%`,
        `${Number(m.amount).toLocaleString()} ${data.currency}`,
        m.status,
        m.completed_at ? new Date(m.completed_at).toLocaleDateString("fr-FR") : "-",
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: COLORS.primary as [number, number, number], textColor: [255, 255, 255] },
      margin: { left: 15, right: 15 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (y > 210) { doc.addPage(); y = 20; }
  doc.autoTable({
    startY: y,
    head: [["Signataire", "Rôle", "Date", "IP", "Appareil"]],
    body: data.signatures.length
      ? data.signatures.map((s) => [
          s.signer_name,
          s.signer_role || "-",
          new Date(s.signed_at).toLocaleString("fr-FR"),
          s.ip_address || "-",
          s.device || "-",
        ])
      : [["Aucune signature enregistrée", "-", "-", "-", "-"]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: COLORS.dark as [number, number, number], textColor: [255, 255, 255] },
    margin: { left: 15, right: 15 },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (data.blockchainTx) {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted as [number, number, number]);
    doc.text(`Ancrage blockchain : ${data.blockchainTx}`, 15, y);
    y += 5;
    doc.text(`Vérifiable sur https://amoy.polygonscan.com/tx/${data.blockchainTx}`, 15, y);
  }

  addFooter(doc);
  doc.save(`contrat-${data.traceRef}.pdf`);
}

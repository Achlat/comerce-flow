const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { query } = require('../config/database');

/**
 * Requête commune pour récupérer les mouvements d'inventaire
 */
const fetchMouvements = async (entreprise_id, date_debut, date_fin, type) => {
  let sql = `
    SELECT i.id, i.type, i.quantite, i.prix_unitaire,
           i.date_mouvement, i.commentaire, i.reference,
           p.nom AS produit, p.unite,
           u.nom AS utilisateur,
           f.nom AS fournisseur,
           c.nom AS client
    FROM inventaire i
    JOIN produits p ON i.produit_id = p.id
    JOIN users u ON i.user_id = u.id
    LEFT JOIN fournisseurs f ON i.fournisseur_id = f.id
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.entreprise_id = ?`;

  const params = [entreprise_id];

  if (date_debut) { sql += ' AND DATE(i.date_mouvement) >= ?'; params.push(date_debut); }
  if (date_fin)   { sql += ' AND DATE(i.date_mouvement) <= ?'; params.push(date_fin); }
  if (type)       { sql += ' AND i.type = ?';                  params.push(type); }

  sql += ' ORDER BY i.date_mouvement DESC';
  return query(sql, params);
};

/**
 * Formate une date pour l'affichage
 */
const formatDate = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString('fr-FR', { timeZone: 'UTC' });
};

/** GET /api/export/pdf */
const exportPDF = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const { date_debut, date_fin, type } = req.query;

    const [entreprise, mouvements] = await Promise.all([
      query('SELECT nom FROM entreprises WHERE id = ?', [entreprise_id]),
      fetchMouvements(entreprise_id, date_debut, date_fin, type),
    ]);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rapport_inventaire_${Date.now()}.pdf"`
    );
    doc.pipe(res);

    // ── En-tête ──────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold')
       .text(`${entreprise[0]?.nom || 'Entreprise'} — Rapport Inventaire`, { align: 'center' });
    doc.moveDown(0.5);

    if (date_debut || date_fin) {
      doc.fontSize(11).font('Helvetica')
         .text(`Période: ${date_debut || '...'} → ${date_fin || '...'}`, { align: 'center' });
    }
    doc.text(`Exporté le: ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
    doc.moveDown(1);

    // ── Résumé ───────────────────────────────────────────────
    const entrees = mouvements.filter((m) => m.type === 'entree');
    const sorties = mouvements.filter((m) => m.type === 'sortie');
    const totalEntrees = entrees.reduce((s, m) => s + m.quantite, 0);
    const totalSorties = sorties.reduce((s, m) => s + m.quantite, 0);

    doc.fontSize(12).font('Helvetica-Bold').text('Résumé');
    doc.fontSize(10).font('Helvetica')
       .text(`Entrées: ${entrees.length} mouvements — ${totalEntrees} unités`)
       .text(`Sorties: ${sorties.length} mouvements — ${totalSorties} unités`)
       .text(`Total mouvements: ${mouvements.length}`);
    doc.moveDown(1);

    // ── Tableau ──────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').text('Détail des mouvements');
    doc.moveDown(0.5);

    const colWidths = [30, 55, 80, 50, 60, 80, 80, 80];
    const headers = ['#', 'Type', 'Produit', 'Qté', 'Prix unit.', 'Tiers', 'Réf.', 'Date'];
    const startX = doc.page.margins.left;
    let y = doc.y;

    // Entête tableau
    doc.font('Helvetica-Bold').fontSize(8);
    let x = startX;
    headers.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], 16).fillAndStroke('#2563eb', '#1e40af');
      doc.fillColor('white').text(h, x + 2, y + 4, { width: colWidths[i] - 4, lineBreak: false });
      x += colWidths[i];
    });
    y += 16;

    // Lignes tableau
    doc.font('Helvetica').fontSize(7);
    mouvements.slice(0, 500).forEach((m, idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      const bg = idx % 2 === 0 ? '#f8fafc' : 'white';
      const typeColor = m.type === 'entree' ? '#16a34a' : '#dc2626';
      x = startX;

      const cells = [
        m.id,
        m.type.toUpperCase(),
        m.produit,
        `${m.quantite} ${m.unite}`,
        m.prix_unitaire ? `${parseFloat(m.prix_unitaire).toFixed(0)} F` : '-',
        m.fournisseur || m.client || '-',
        m.reference || '-',
        formatDate(m.date_mouvement).substring(0, 16),
      ];

      cells.forEach((cell, i) => {
        doc.rect(x, y, colWidths[i], 14).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor(i === 1 ? typeColor : '#1e293b')
           .text(String(cell), x + 2, y + 3, { width: colWidths[i] - 4, lineBreak: false });
        x += colWidths[i];
      });
      y += 14;
    });

    if (mouvements.length > 500) {
      doc.moveDown().fillColor('#64748b').fontSize(9)
         .text(`Note: Affichage limité aux 500 premiers résultats. Total: ${mouvements.length}`);
    }

    doc.end();
  } catch (err) {
    console.error('[EXPORT] exportPDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Erreur lors de la génération du PDF' });
    }
  }
};

/** GET /api/export/xlsx */
const exportXLSX = async (req, res) => {
  try {
    const { entreprise_id } = req.user;
    const { date_debut, date_fin, type } = req.query;

    const [entreprise, mouvements] = await Promise.all([
      query('SELECT nom FROM entreprises WHERE id = ?', [entreprise_id]),
      fetchMouvements(entreprise_id, date_debut, date_fin, type),
    ]);

    const wb = XLSX.utils.book_new();

    // ── Feuille Mouvements ────────────────────────────────────
    const wsData = [
      ['#', 'Type', 'Produit', 'Unité', 'Quantité', 'Prix unitaire (F)', 'Valeur totale (F)',
       'Fournisseur', 'Client', 'Référence', 'Commentaire', 'Date'],
      ...mouvements.map((m) => [
        m.id,
        m.type === 'entree' ? 'ENTRÉE' : 'SORTIE',
        m.produit,
        m.unite,
        m.quantite,
        m.prix_unitaire ? parseFloat(m.prix_unitaire) : '',
        m.prix_unitaire ? parseFloat(m.prix_unitaire) * m.quantite : '',
        m.fournisseur || '',
        m.client || '',
        m.reference || '',
        m.commentaire || '',
        formatDate(m.date_mouvement),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Largeurs colonnes
    ws['!cols'] = [
      { wch: 6 }, { wch: 8 }, { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Mouvements');

    // ── Feuille Résumé ────────────────────────────────────────
    const entrees = mouvements.filter((m) => m.type === 'entree');
    const sorties = mouvements.filter((m) => m.type === 'sortie');

    const wsSummary = XLSX.utils.aoa_to_sheet([
      [`Rapport Inventaire — ${entreprise[0]?.nom || ''}`],
      [`Période: ${date_debut || 'Début'} → ${date_fin || 'Aujourd\'hui'}`],
      [`Exporté le: ${new Date().toLocaleString('fr-FR')}`],
      [],
      ['Indicateur', 'Valeur'],
      ['Nb mouvements total', mouvements.length],
      ['Nb entrées', entrees.length],
      ['Quantité totale entrées', entrees.reduce((s, m) => s + m.quantite, 0)],
      ['Valeur entrées (F)', entrees.reduce((s, m) => s + (m.prix_unitaire * m.quantite || 0), 0)],
      ['Nb sorties', sorties.length],
      ['Quantité totale sorties', sorties.reduce((s, m) => s + m.quantite, 0)],
      ['Valeur sorties (F)', sorties.reduce((s, m) => s + (m.prix_unitaire * m.quantite || 0), 0)],
    ]);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rapport_inventaire_${Date.now()}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    console.error('[EXPORT] exportXLSX:', err);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du fichier Excel' });
  }
};

/** GET /api/export/produits/xlsx */
const exportProduitsXLSX = async (req, res) => {
  try {
    const { entreprise_id } = req.user;

    const produits = await query(
      `SELECT p.nom, c.nom AS categorie, p.prix_achat, p.prix_vente,
              p.stock_actuel, p.stock_minimum, p.unite, p.code_barre,
              (p.stock_actuel <= p.stock_minimum) AS stock_faible
       FROM produits p
       LEFT JOIN categories c ON p.categorie_id = c.id
       WHERE p.entreprise_id = ? AND p.actif = 1
       ORDER BY p.nom`,
      [entreprise_id]
    );

    const wsData = [
      ['Produit', 'Catégorie', 'Prix achat (F)', 'Prix vente (F)',
       'Stock actuel', 'Stock minimum', 'Unité', 'Code barre', 'Alerte stock'],
      ...produits.map((p) => [
        p.nom, p.categorie || '', p.prix_achat, p.prix_vente,
        p.stock_actuel, p.stock_minimum, p.unite, p.code_barre || '',
        p.stock_faible ? 'OUI' : 'non',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 15 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produits');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="produits_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error('[EXPORT] exportProduitsXLSX:', err);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du fichier Excel' });
  }
};

module.exports = { exportPDF, exportXLSX, exportProduitsXLSX };

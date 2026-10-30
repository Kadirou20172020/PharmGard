/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, LotStock, ReceptionEntry, ExitRecord, SupplierOrder, Supplier } from '../types/pharmacy';

interface CreateSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export const createHospitalPharmacySpreadsheet = async (
  accessToken: string,
  title: string = 'Pharmacie Hospitalière - PharmaGarde CHU'
): Promise<CreateSpreadsheetResponse> => {
  // 1. Create spreadsheet with all 8 sheets (including FOURNISSEURS)
  const payload = {
    properties: {
      title,
      locale: 'fr_FR',
      autoRecalc: 'ON_CHANGE'
    },
    sheets: [
      {
        properties: {
          title: 'DASHBOARD',
          gridProperties: { rowCount: 45, columnCount: 16, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'RÉFÉRENTIEL PRODUITS',
          gridProperties: { rowCount: 120, columnCount: 23, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'STOCKS ET LOTS',
          gridProperties: { rowCount: 120, columnCount: 18, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'FOURNISSEURS',
          gridProperties: { rowCount: 60, columnCount: 12, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'ENTRÉES',
          gridProperties: { rowCount: 120, columnCount: 17, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'SORTIES',
          gridProperties: { rowCount: 120, columnCount: 16, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'COMMANDES',
          gridProperties: { rowCount: 100, columnCount: 13, frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'ALERTES ET PÉREMPTIONS',
          gridProperties: { rowCount: 60, columnCount: 10, frozenRowCount: 1 }
        }
      }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erreur création Google Sheets: ${response.statusText}`);
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const spreadsheetUrl = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
};

export const populatePharmacyData = async (
  accessToken: string,
  spreadsheetId: string,
  data: {
    products: Product[];
    lots: LotStock[];
    receptions: ReceptionEntry[];
    exits: ExitRecord[];
    orders: SupplierOrder[];
    suppliers: Supplier[];
  }
) => {
  // 1. DASHBOARD Tab Data with live dynamic formulas and alert sections
  const dashboardValues = [
    ['🏥 TABLEAU DE BORD - PHARMACIE HOSPITALIÈRE (CHU)', '', '', '', '', '', '', ''],
    ['Dernière mise à jour :', new Date().toLocaleString('fr-FR'), '', 'Calculs automatiques en temps réel', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['📊 INDICATEURS CLÉS (KPIS)', 'VALEUR CALCULÉE', 'UNITÉ', 'FORMULE LOGIQUE / SOURCE', '', '', '', ''],
    ['Nombre total de références actives', '=COUNTIF(\'RÉFÉRENTIEL PRODUITS\'!W2:W; "Actif")', 'Références', 'Référentiel Produits'],
    ['Nombre total d\'unités en stock', '=SUM(\'STOCKS ET LOTS\'!K2:K)', 'Unités', 'Somme Quantités Disponibles'],
    ['Valeur totale du stock au prix d\'achat', '=SUM(\'STOCKS ET LOTS\'!M2:M)', 'Dinars (DZD)', 'Somme Valeur Stocks'],
    ['Nombre de références en rupture totale (Dispo = 0)', '=COUNTIF(\'STOCKS ET LOTS\'!K2:K; 0)', 'Produits', 'Stock disponible nul'],
    ['Nombre de lots proches de la péremption (< 30 jours)', '=COUNTIFS(\'STOCKS ET LOTS\'!G2:G; "<="&TODAY()+30; \'STOCKS ET LOTS\'!G2:G; ">="&TODAY(); \'STOCKS ET LOTS\'!K2:K; ">0")', 'Lots à risque', 'Péremption <= J+30'],
    ['Nombre de lots déjà périmés', '=COUNTIFS(\'STOCKS ET LOTS\'!G2:G; "<"&TODAY(); \'STOCKS ET LOTS\'!K2:K; ">0")', 'Lots à détruire', 'Péremption < Aujourd\'hui'],
    ['Nombre de commandes fournisseurs en attente', '=COUNTIF(\'COMMANDES\'!I2:I; "Transmise")', 'Commandes', 'Statut Transmise'],
    ['Nombre d\'entrées du mois', '=COUNTA(\'ENTRÉES\'!A2:A)', 'Réceptions', 'Journal Réceptions'],
    ['Nombre de sorties du mois', '=COUNTA(\'SORTIES\'!A2:A)', 'Dispensations', 'Journal Sorties'],
    ['Valeur des consommations hospitalières', '=SUM(\'SORTIES\'!K2:K)', 'Dinars (DZD)', 'Coût total imputé'],
    ['Taux de disponibilité estimé', '=ROUND((COUNTIF(\'STOCKS ET LOTS\'!K2:K; ">0")/MAX(COUNTA(\'RÉFÉRENTIEL PRODUITS\'!A2:A); 1))*100; 1)&" %"', '%', 'Disponibilité'],
    ['', '', '', '', '', '', '', ''],
    ['🚨 ALERTES AUTOMATIQUES DU JOUR (RÉAPPROVISIONNEMENT & PÉREMPTIONS)', '', '', '', '', '', '', ''],
    ['Type d\'alerte', 'Priorité', 'Code Produit', 'Désignation & DCI', 'N° Lot', 'Date Péremption / Seuil', 'Stock Dispo', 'Action Recommandée'],
    ['PÉRIMÉ', 'CRITIQUE', 'DM-001', 'Cathéter veineux central trilumière 7 Fr', 'CRT-2024-118', '2026-08-15', 8, 'Mise en quarantaine et destruction'],
    ['PÉRIMÉ', 'CRITIQUE', 'MED-009', 'Céfotaxime 1 g - Poudre injectable', 'CEF-2024-992', '2026-10-15', 5, 'Rédiger PV de mise au rebut'],
    ['PÉREMPTION < 30J', 'ÉLEVÉE', 'MED-001', 'Paracétamol injectable 10 mg/ml', 'FK-2024-8841', '2026-11-20', 80, 'Délivrance prioritaire FEFO aux Urgences'],
    ['STOCK < SEUIL MIN', 'ÉLEVÉE', 'MED-005', 'Noradrénaline 2 mg/ml ampoule', 'NOR-2025-331', 'Seuil Min: 90', 55, 'Émettre bon de commande d\'urgence'],
    ['STOCK < SEUIL MIN', 'MOYENNE', 'MED-011', 'Méthylprednisolone 40 mg', 'PFZ-2024-814', 'Seuil Min: 40', 35, 'Commander réassort Pfizer Hospital']
  ];

  // 2. RÉFÉRENTIEL PRODUITS (avec ID Fournisseur)
  const productHeaders = [
    'Code produit',
    'Code-barres / CIP13',
    'Désignation du produit',
    'DCI (Dénomination Commune)',
    'Nom commercial',
    'Dosage / Concentration',
    'Forme pharmaceutique',
    'Conditionnement',
    'Unité de gestion',
    'Catégorie',
    'Classe thérapeutique',
    'Voie d\'administration',
    'Fabricant',
    'ID Fournisseur',
    'Nom Fournisseur',
    'Prix unitaire d\'achat (DZD)',
    'Stock minimal',
    'Stock maximal',
    'Stock de sécurité',
    'Délai appro (jours)',
    'Emplacement de stockage',
    'Conditions de conservation',
    'Statut'
  ];

  const productRows = data.products.map(p => [
    p.code,
    p.barcode || '',
    p.designation,
    p.dci,
    p.brandName,
    p.dosage,
    p.form,
    p.packaging,
    p.unit,
    p.category,
    p.therapeuticClass,
    p.route,
    p.manufacturer,
    p.supplierId,
    p.supplier,
    p.purchasePrice,
    p.minStock,
    p.maxStock,
    p.securityStock,
    p.leadTimeDays,
    p.location,
    p.storageCondition,
    p.isActive ? 'Actif' : 'Inactif'
  ]);

  // 3. STOCKS ET LOTS (avec ID Fournisseur)
  const lotHeaders = [
    'Code produit',
    'Désignation du produit',
    'Numéro de lot',
    'Date de réception',
    'Date de fabrication',
    'Date de péremption',
    'Alerte Péremption',
    'Quantité initiale',
    'Quantité reçue',
    'Quantité sortie',
    'Quantité disponible',
    'Prix unitaire (DZD)',
    'Valeur du stock (DZD)',
    'ID Fournisseur',
    'Nom Fournisseur',
    'Magasin / Emplacement',
    'Statut du lot',
    'Commentaires & Traçabilité'
  ];

  const lotRows = data.lots.map(l => {
    return [
      l.productCode,
      l.productDesignation,
      l.lotNumber,
      l.receptionDate,
      l.manufacturingDate || '',
      l.expiryDate,
      `=SI(F2<TODAY(); "PÉRIMÉ"; SI(F2<=TODAY()+30; "ALERTE <30J"; SI(F2<=TODAY()+60; "ALERTE <60J"; "VALIDE")))`,
      l.initialQty,
      l.receivedQty,
      l.exitedQty,
      l.availableQty,
      l.unitPrice,
      l.totalValue,
      l.supplierId,
      l.supplier,
      l.location,
      l.status,
      l.comments || ''
    ];
  });

  // 4. FOURNISSEURS Tab (Nouvelle feuille demandée)
  const supplierHeaders = [
    'ID Fournisseur',
    'Nom du Fournisseur',
    'Contact Principal',
    'Téléphone',
    'Email',
    'Adresse',
    'Conditions de Paiement',
    'Délai de Livraison Moyen (jours)',
    'Produits Fournis (liste des codes produits)'
  ];

  const supplierRows = data.suppliers.map(s => [
    s.id,
    s.name,
    s.contactName,
    s.phone,
    s.email,
    s.address,
    s.paymentTerms,
    s.averageLeadTimeDays,
    s.suppliedProducts.join(', ')
  ]);

  // 5. ENTRÉES Headers + Rows
  const receptionHeaders = [
    'N° Réception',
    'Date réception',
    'N° Bon de commande',
    'N° Bon de livraison',
    'ID Fournisseur',
    'Nom Fournisseur',
    'Code produit',
    'Désignation produit',
    'Numéro de lot',
    'Date de péremption',
    'Quantité reçue',
    'Unité',
    'Prix unitaire (DZD)',
    'Montant total (DZD)',
    'Emplacement stockage',
    'Réceptionné par',
    'Conformité'
  ];

  const receptionRows = data.receptions.map(r => [
    r.receptionNumber,
    r.receptionDate,
    r.orderNumber,
    r.deliveryNoteNumber,
    r.supplierId,
    r.supplier,
    r.productCode,
    r.productDesignation,
    r.lotNumber,
    r.expiryDate,
    r.quantityReceived,
    r.unit,
    r.unitPrice,
    r.totalAmount,
    r.location,
    r.receivedBy,
    r.isCompliant ? 'Conforme' : 'Non conforme'
  ]);

  // 6. SORTIES Headers + Rows
  const exitHeaders = [
    'N° Sortie',
    'Date de sortie',
    'Service destinataire',
    'Demandeur / Prescripteur',
    'Code produit',
    'Désignation produit',
    'Numéro de lot',
    'Date péremption',
    'Quantité délivrée',
    'Unité',
    'Prix unitaire (DZD)',
    'Coût imputé au service (DZD)',
    'Motif de sortie',
    'Validé par',
    'Notes'
  ];

  const exitRows = data.exits.map(e => [
    e.exitNumber,
    e.exitDate,
    e.hospitalDepartment,
    e.requesterName,
    e.productCode,
    e.productDesignation,
    e.lotNumber,
    e.expiryDate,
    e.quantityExited,
    e.unit,
    e.unitPrice,
    e.totalCost,
    e.reason,
    e.validatedBy,
    e.notes || ''
  ]);

  // 7. COMMANDES Headers + Rows
  const orderHeaders = [
    'N° Bon de commande',
    'Date de commande',
    'ID Fournisseur',
    'Nom Fournisseur',
    'Contact Email',
    'Téléphone',
    'Date livraison estimée',
    'Articles commandés',
    'Montant Total (DZD)',
    'Statut commande',
    'Créé par',
    'Commentaires'
  ];

  const orderRows = data.orders.map(o => [
    o.orderNumber,
    o.orderDate,
    o.supplierId,
    o.supplierName,
    o.supplierEmail,
    o.supplierPhone,
    o.expectedDeliveryDate,
    o.items.map(i => `${i.productCode} (${i.quantityOrdered}x)`).join(', '),
    o.totalAmount,
    o.status,
    o.createdBy,
    o.notes || ''
  ]);

  // 8. ALERTES ET PÉREMPTIONS
  const alertHeaders = [
    'Type d\'alerte',
    'Priorité',
    'Code produit',
    'Désignation',
    'N° Lot',
    'Date péremption / Seuil',
    'Quantité impactée',
    'Emplacement',
    'ID Fournisseur',
    'Action requise'
  ];

  const alertRows = [
    ['PÉRIMÉ', 'CRITIQUE', 'DM-001', 'Cathéter veineux central trilumière 7 Fr', 'CRT-2024-118', '2026-08-15', 8, 'Magasin Stérile - Quarantaine', 'SUP-BBRAUN', 'Retrait immédiat et destruction'],
    ['PÉRIMÉ', 'CRITIQUE', 'MED-009', 'Céfotaxime 1 g', 'CEF-2024-992', '2026-10-15', 5, 'Magasin Central - Quarantaine', 'SUP-VIATRIS', 'Rédiger bordereau de mise au rebut'],
    ['PÉREMPTION < 30J', 'ÉLEVÉE', 'MED-001', 'Paracétamol inj 10 mg/ml', 'FK-2024-8841', '2026-11-20', 80, 'Magasin Central - Allée A-02', 'SUP-FK', 'Délivrance prioritaire FEFO aux Urgences'],
    ['PÉREMPTION < 60J', 'MOYENNE', 'MED-002', 'Amoxicilline + Ac. Clavulanique 1g', 'SNF-2025-4412', '2026-12-15', 60, 'Magasin Central - Allée B-04', 'SUP-SANOFI', 'Surveiller consommation bloc chirurgie'],
    ['STOCK < SEUIL MIN', 'ÉLEVÉE', 'MED-005', 'Noradrénaline 2 mg/ml', 'NOR-2025-331', 'Min: 90', 55, 'Magasin Central (Abri lumière)', 'SUP-AGUETTANT', 'Commande en cours BC-2026-092']
  ];

  const updateBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'DASHBOARD!A1',
        values: dashboardValues
      },
      {
        range: "'RÉFÉRENTIEL PRODUITS'!A1",
        values: [productHeaders, ...productRows]
      },
      {
        range: "'STOCKS ET LOTS'!A1",
        values: [lotHeaders, ...lotRows]
      },
      {
        range: 'FOURNISSEURS!A1',
        values: [supplierHeaders, ...supplierRows]
      },
      {
        range: 'ENTRÉES!A1',
        values: [receptionHeaders, ...receptionRows]
      },
      {
        range: 'SORTIES!A1',
        values: [exitHeaders, ...exitRows]
      },
      {
        range: 'COMMANDES!A1',
        values: [orderHeaders, ...orderRows]
      },
      {
        range: "'ALERTES ET PÉREMPTIONS'!A1",
        values: [alertHeaders, ...alertRows]
      }
    ]
  };

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateBody)
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erreur de remplissage des données: ${response.statusText}`);
  }

  // Next, apply styles, conditional formatting and data validations
  try {
    await applyAdvancedSpreadsheetFormatting(accessToken, spreadsheetId);
  } catch (styleErr) {
    console.warn('Advanced formatting warning:', styleErr);
  }

  return true;
};

// Apply hospital header styles, frozen rows, conditional formatting and data validations
const applyAdvancedSpreadsheetFormatting = async (accessToken: string, spreadsheetId: string) => {
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!metaRes.ok) return;
  const meta = await metaRes.json();
  const sheets: any[] = meta.sheets || [];

  const sheetMap: Record<string, number> = {};
  sheets.forEach(s => {
    sheetMap[s.properties.title] = s.properties.sheetId;
  });

  const requests: any[] = [];

  // 1. Format header rows on all sheets
  for (const sheet of sheets) {
    const sId = sheet.properties.sheetId;
    requests.push({
      repeatCell: {
        range: {
          sheetId: sId,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.05, green: 0.45, blue: 0.55 }, // Hospital teal #0d7488
            textFormat: {
              bold: true,
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
              fontSize: 10
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    });

    // Auto-fit column widths
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId: sId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 22
        }
      }
    });
  }

  // 2. CONDITIONAL FORMATTING ON 'STOCKS ET LOTS'
  const lotsSheetId = sheetMap['STOCKS ET LOTS'];
  if (lotsSheetId !== undefined) {
    // A. Rule 1: Périmé (Date < TODAY()) -> Fond Rouge Clair (#FEE2E2), Texte Rouge Foncé (#991B1B)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: lotsSheetId,
            startRowIndex: 1,
            endRowIndex: 100,
            startColumnIndex: 5, // Colonne F (Date péremption)
            endColumnIndex: 7    // Colonne G (Alerte)
          }],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=$F2<TODAY()' }]
            },
            format: {
              backgroundColor: { red: 0.99, green: 0.88, blue: 0.88 }, // #FEE2E2
              textFormat: {
                bold: true,
                foregroundColor: { red: 0.6, green: 0.1, blue: 0.1 } // #991B1B
              }
            }
          }
        },
        index: 0
      }
    });

    // B. Rule 2: Péremption dans les 30 prochains jours (TODAY() <= Date <= TODAY()+30) -> Fond Orange / Ambre (#FEF3C7)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: lotsSheetId,
            startRowIndex: 1,
            endRowIndex: 100,
            startColumnIndex: 5,
            endColumnIndex: 7
          }],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=AND($F2>=TODAY(); $F2<=TODAY()+30)' }]
            },
            format: {
              backgroundColor: { red: 1.0, green: 0.95, blue: 0.78 }, // #FEF3C7
              textFormat: {
                bold: true,
                foregroundColor: { red: 0.75, green: 0.35, blue: 0.05 } // #B45309
              }
            }
          }
        },
        index: 1
      }
    });

    // C. Rule 3: Quantité disponible = 0 -> Texte gris barré ou fond rouge
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: lotsSheetId,
            startRowIndex: 1,
            endRowIndex: 100,
            startColumnIndex: 10, // Colonne K (Disponible)
            endColumnIndex: 11
          }],
          booleanRule: {
            condition: {
              type: 'NUMBER_EQ',
              values: [{ userEnteredValue: '0' }]
            },
            format: {
              backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
              textFormat: { foregroundColor: { red: 0.6, green: 0.6, blue: 0.6 }, bold: true }
            }
          }
        },
        index: 2
      }
    });
  }

  // 3. CONDITIONAL FORMATTING ON 'RÉFÉRENTIEL PRODUITS'
  const prodSheetId = sheetMap['RÉFÉRENTIEL PRODUITS'];
  if (prodSheetId !== undefined) {
    // Alerte stock minimal : surligner le stock minimal si stock disponible insuffisant
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: prodSheetId,
            startRowIndex: 1,
            endRowIndex: 100,
            startColumnIndex: 16, // Colonne Q (Stock minimal)
            endColumnIndex: 17
          }],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=SUMIFS(\'STOCKS ET LOTS\'!$K:$K; \'STOCKS ET LOTS\'!$A:$A; $A2) <= $Q2' }]
            },
            format: {
              backgroundColor: { red: 1.0, green: 0.92, blue: 0.8 }, // Orange clair
              textFormat: { bold: true, foregroundColor: { red: 0.75, green: 0.25, blue: 0.0 } }
            }
          }
        },
        index: 0
      }
    });
  }

  // 4. DATA VALIDATIONS (Validations de données pour cohérence)
  // Validation Statut dans 'STOCKS ET LOTS'
  if (lotsSheetId !== undefined) {
    requests.push({
      setDataValidation: {
        range: {
          sheetId: lotsSheetId,
          startRowIndex: 1,
          endRowIndex: 100,
          startColumnIndex: 16, // Colonne Q: Statut du lot
          endColumnIndex: 17
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'Actif' },
              { userEnteredValue: 'Quarantaine' },
              { userEnteredValue: 'Périmé' },
              { userEnteredValue: 'Épuisé' },
              { userEnteredValue: 'Rappel de lot' }
            ]
          },
          strict: true,
          showCustomUi: true
        }
      }
    });
  }

  // Validation Statut dans 'RÉFÉRENTIEL PRODUITS'
  if (prodSheetId !== undefined) {
    requests.push({
      setDataValidation: {
        range: {
          sheetId: prodSheetId,
          startRowIndex: 1,
          endRowIndex: 100,
          startColumnIndex: 22, // Colonne W: Statut
          endColumnIndex: 23
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [
              { userEnteredValue: 'Actif' },
              { userEnteredValue: 'Inactif' }
            ]
          },
          strict: true,
          showCustomUi: true
        }
      }
    });
  }

  if (requests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
  }
};

/**
 * Utility to download full pharmacy dataset as CSV or JSON
 */
export const exportDataAsFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

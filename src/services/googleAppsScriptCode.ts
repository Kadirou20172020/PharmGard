/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * ============================================================================
 * SYSTÈME EXPERT DE PHARMACIE HOSPITALIÈRE - PHARMAGARDE
 * Automatisation Google Apps Script & Alertes Automatiques
 * Version : 3.0
 * ============================================================================
 */

/**
 * Menu personnalisé créé à l'ouverture du classeur Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🏥 Pharmacie Hospitalière')
    .addItem('📊 Actualiser le Dashboard & Alertes', 'actualiserDashboard')
    .addSeparator()
    .addItem('⚠️ Contrôler les péremptions (30 jours & périmés)', 'controlerPeremptions30Jours')
    .addItem('🚨 Détecter les ruptures et seuils minimaux', 'detecterRupturesEtSeuils')
    .addItem('🏢 Vérifier la cohérence des Fournisseurs', 'verifierCoherenceFournisseurs')
    .addItem('🎨 Appliquer la mise en forme conditionnelle des alertes', 'appliquerMiseEnFormeConditionnelle')
    .addSeparator()
    .addItem('📧 Envoyer le rapport d\\'alerte par e-mail', 'envoyerRapportAlertesEmail')
    .addItem('⏰ Activer le contrôle quotidien automatique (Cron 7h)', 'installerDeclencheurQuotidien')
    .addToUi();
}

/**
 * 1. ACTUALISATION COMPLÈTE DU TABLEAU DE BORD
 */
function actualiserDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.flush();
  
  controlerPeremptions30Jours();
  detecterRupturesEtSeuils();
  
  ss.toast('Tableau de bord et alertes actualisés avec succès !', 'Pharmacie Hospitalière', 5);
}

/**
 * 2. CONTRÔLE DES DÉLAIS DE PÉREMPTION (< 30 JOURS ET PÉRIMÉS)
 */
function controlerPeremptions30Jours() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetLots = ss.getSheetByName('STOCKS ET LOTS');
  if (!sheetLots) return;
  
  var data = sheetLots.getDataRange().getValues();
  var today = new Date();
  var oneDay = 24 * 60 * 60 * 1000;
  
  var nbPerimes = 0;
  var nbMoins30j = 0;
  var alertes = [];
  
  // Colonne F = Date de péremption (index 5)
  // Colonne G = Alerte Péremption (index 6)
  // Colonne K = Quantité disponible (index 10)
  
  for (var i = 1; i < data.length; i++) {
    var rawDate = data[i][5];
    var dispo = Number(data[i][10]) || 0;
    var code = data[i][0];
    var nom = data[i][1];
    var lot = data[i][2];
    
    if (dispo > 0 && rawDate) {
      var expDate = new Date(rawDate);
      var diffDays = Math.round((expDate - today) / oneDay);
      var cellAlerte = sheetLots.getRange(i + 1, 7);
      
      if (diffDays < 0) {
        nbPerimes++;
        cellAlerte.setValue('❌ PÉRIMÉ (' + Math.abs(diffDays) + 'j)')
          .setBackground('#FEE2E2')
          .setFontColor('#991B1B')
          .setFontWeight('bold');
        alertes.push('❌ PÉRIMÉ : ' + code + ' (' + nom + ') - Lot ' + lot + ' - ' + dispo + ' u.');
      } else if (diffDays <= 30) {
        nbMoins30j++;
        cellAlerte.setValue('⚠️ ALERTE < 30J (J-' + diffDays + ')')
          .setBackground('#FEF3C7')
          .setFontColor('#B45309')
          .setFontWeight('bold');
        alertes.push('⚠️ < 30J : ' + code + ' (' + nom + ') - Lot ' + lot + ' - Exp dans ' + diffDays + ' j - ' + dispo + ' u.');
      } else {
        cellAlerte.setValue('VALIDE')
          .setBackground('#ECFDF5')
          .setFontColor('#065F46')
          .setFontWeight('normal');
      }
    }
  }
  
  return { nbPerimes: nbPerimes, nbMoins30j: nbMoins30j, alertes: alertes };
}

/**
 * 3. DÉTECTION DES RUPTURES ET STOCKS INFÉRIEURS AU SEUIL MINIMAL
 */
function detecterRupturesEtSeuils() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetProduits = ss.getSheetByName('RÉFÉRENTIEL PRODUITS');
  var sheetLots = ss.getSheetByName('STOCKS ET LOTS');
  if (!sheetProduits || !sheetLots) return;
  
  var prodData = sheetProduits.getDataRange().getValues();
  var lotData = sheetLots.getDataRange().getValues();
  
  // Calculer stock total disponible par code produit
  var stockMap = {};
  for (var j = 1; j < lotData.length; j++) {
    var code = lotData[j][0];
    var dispo = Number(lotData[j][10]) || 0;
    var statut = lotData[j][16];
    if (statut !== 'Périmé') {
      stockMap[code] = (stockMap[code] || 0) + dispo;
    }
  }
  
  var ruptures = [];
  var sousSeuilMin = [];
  
  // Colonne Q = Stock minimal (index 16)
  for (var i = 1; i < prodData.length; i++) {
    var pCode = prodData[i][0];
    var pNom = prodData[i][2];
    var pMin = Number(prodData[i][16]) || 0;
    var stockDispo = stockMap[pCode] || 0;
    
    var cellMin = sheetProduits.getRange(i + 1, 17);
    
    if (stockDispo === 0) {
      ruptures.push(pCode + ' - ' + pNom);
      cellMin.setBackground('#FEE2E2').setFontColor('#991B1B').setFontWeight('bold');
    } else if (stockDispo < pMin) {
      sousSeuilMin.push(pCode + ' - ' + pNom + ' (Dispo: ' + stockDispo + ' / Min: ' + pMin + ')');
      cellMin.setBackground('#FEF3C7').setFontColor('#B45309').setFontWeight('bold');
    } else {
      cellMin.setBackground('#FFFFFF').setFontColor('#000000').setFontWeight('normal');
    }
  }
  
  return { ruptures: ruptures, sousSeuilMin: sousSeuilMin };
}

/**
 * 4. VÉRIFICATION DE LA COHÉRENCE DE LA FEUILLE 'FOURNISSEURS'
 */
function verifierCoherenceFournisseurs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetSupp = ss.getSheetByName('FOURNISSEURS');
  var sheetProd = ss.getSheetByName('RÉFÉRENTIEL PRODUITS');
  
  if (!sheetSupp || !sheetProd) {
    SpreadsheetApp.getUi().alert('Feuille FOURNISSEURS ou RÉFÉRENTIEL manquante.');
    return;
  }
  
  var suppData = sheetSupp.getDataRange().getValues();
  var validIds = [];
  for (var s = 1; s < suppData.length; s++) {
    if (suppData[s][0]) validIds.push(suppData[s][0]);
  }
  
  var prodData = sheetProd.getDataRange().getValues();
  var anomalies = [];
  for (var p = 1; p < prodData.length; p++) {
    var pCode = prodData[p][0];
    var suppId = prodData[p][13]; // Colonne N: ID Fournisseur
    if (!suppId || validIds.indexOf(suppId) === -1) {
      anomalies.push('Produit ' + pCode + ' : ID Fournisseur invalide ou absent (' + suppId + ')');
    }
  }
  
  if (anomalies.length > 0) {
    SpreadsheetApp.getUi().alert('Anomalies Fournisseurs', anomalies.join('\\n'), SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('Cohérence Validée', 'Tous les produits sont correctement rattachés à un ID Fournisseur existant dans la feuille FOURNISSEURS.', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 5. ENVOI DU RAPPORT D'ALERTE QUOTIDIEN PAR E-MAIL
 */
function envoyerRapportAlertesEmail() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    email = Browser.inputBox('Adresse e-mail', 'Indiquez l\\'adresse pour recevoir le rapport :', Browser.Buttons.OK_CANCEL);
    if (!email || email === 'cancel') return;
  }
  
  var resPeremption = controlerPeremptions30Jours();
  var resStock = detecterRupturesEtSeuils();
  
  var sujet = '🏥 [PharmaGarde] Alertes Stock & Péremptions Hospitalières - ' + Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');
  var corps = 'SYNTHÈSE QUOTIDIENNE DES ALERTES PHARMACIE HOSPITALIÈRE :\\n\\n' +
    '1. DÉTECTION DES RISQUES DE PÉREMPTION :\\n' +
    '- Lots déjà périmés : ' + resPeremption.nbPerimes + '\\n' +
    '- Lots à moins de 30 jours : ' + resPeremption.nbMoins30j + '\\n\\n' +
    '2. CONTRÔLE DES NIVEAUX DE STOCK :\\n' +
    '- Références en rupture totale : ' + resStock.ruptures.length + '\\n' +
    '- Références sous le seuil minimal : ' + resStock.sousSeuilMin.length + '\\n\\n' +
    'DÉTAIL DES ACTIONS URGENTES :\\n' +
    (resPeremption.alertes.length > 0 ? resPeremption.alertes.join('\\n') : 'Aucun lot à risque immédiat.') + '\\n\\n' +
    'RÉASSORTS À PRÉVOIR :\\n' +
    (resStock.sousSeuilMin.length > 0 ? resStock.sousSeuilMin.join('\\n') : 'Stocks conformes.');
    
  MailApp.sendEmail(email, sujet, corps);
  SpreadsheetApp.getUi().alert('Rapport expédié avec succès à : ' + email);
}

/**
 * 6. INSTALLATION D'UN DÉCLENCHEUR QUOTIDIEN (Cron automatique 7h)
 */
function installerDeclencheurQuotidien() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'actualiserDashboard') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger('actualiserDashboard')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
    
  SpreadsheetApp.getUi().alert('Contrôle automatique programmé chaque jour à 7h00.');
}
`;

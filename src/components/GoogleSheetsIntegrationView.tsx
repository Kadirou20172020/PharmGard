/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  Code2, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  HelpCircle,
  FileJson,
  FileText
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../services/googleAppsScriptCode';
import { 
  Product, 
  LotStock, 
  ReceptionEntry, 
  ExitRecord, 
  SupplierOrder,
  Supplier
} from '../types/pharmacy';
import { exportDataAsFile } from '../services/googleSheetsApi';

interface GoogleSheetsIntegrationViewProps {
  user: User | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  onLogin: () => void;
  onCreateOrSyncSpreadsheet: () => void;
  products: Product[];
  lots: LotStock[];
  receptions: ReceptionEntry[];
  exits: ExitRecord[];
  orders: SupplierOrder[];
  suppliers: Supplier[];
}

export const GoogleSheetsIntegrationView: React.FC<GoogleSheetsIntegrationViewProps> = ({
  user,
  spreadsheetId,
  spreadsheetUrl,
  lastSyncedAt,
  isSyncing,
  onLogin,
  onCreateOrSyncSpreadsheet,
  products,
  lots,
  receptions,
  exits,
  orders,
  suppliers
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'script' | 'export'>('sync');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['Code', 'Désignation', 'DCI', 'Catégorie', 'PU Achat', 'Stock Min', 'Stock Max', 'Emplacement'];
    const rows = products.map(p => [
      p.code,
      `"${p.designation}"`,
      `"${p.dci}"`,
      p.category,
      p.purchasePrice,
      p.minStock,
      p.maxStock,
      `"${p.location}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    exportDataAsFile(csvContent, `pharmacie_hopital_produits_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJSON = () => {
    const fullBackup = {
      hospital: 'Centre Hospitalier Universitaire - PUI Pharmacie Centrale',
      exportedAt: new Date().toISOString(),
      products,
      lots,
      receptions,
      exits,
      orders
    };
    exportDataAsFile(JSON.stringify(fullBackup, null, 2), `pharmagarde_sauvegarde_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl border border-teal-700/50 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight">
                  Intégration Google Sheets & Automatisation Apps Script
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Synchronisez en temps réel les 7 feuilles du système hospitalier (Dashboard, Référentiel, Lots, Entrées, Sorties, Commandes, Alertes) dans votre Google Drive avec formules de calcul et automatisation.
              </p>
            </div>
          </div>

          {/* Quick status & open button */}
          <div className="flex items-center space-x-3">
            {spreadsheetUrl ? (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-colors whitespace-nowrap"
              >
                <span>Ouvrir dans Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'sync'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 mr-1.5" />
          Synchronisation Google Sheets
        </button>
        <button
          onClick={() => setActiveTab('script')}
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'script'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-4 h-4 mr-1.5" />
          Code Google Apps Script Hospitalier
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'export'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Download className="w-4 h-4 mr-1.5" />
          Exports de Secours (CSV / JSON)
        </button>
      </div>

      {/* TAB 1: SYNCHRONIZATION */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Card: Connection Status */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-teal-600" />
              État de la Connexion Google Workspace
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-400 block font-medium">Compte Google Connecté</span>
                {user ? (
                  <div className="mt-1">
                    <span className="text-xs font-bold text-slate-800 block truncate">{user.displayName || 'Utilisateur'}</span>
                    <span className="text-[10px] text-teal-700 font-mono truncate block">{user.email}</span>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-amber-700 font-medium">Non connecté</span>
                    <button
                      onClick={onLogin}
                      className="px-2.5 py-1 bg-teal-600 text-white text-[11px] font-semibold rounded-lg hover:bg-teal-700"
                    >
                      Se connecter
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-400 block font-medium">Classeur Hospitalier Lié</span>
                {spreadsheetId ? (
                  <div className="mt-1">
                    <span className="text-xs font-mono font-bold text-emerald-700 block truncate">
                      {spreadsheetId}
                    </span>
                    <span className="text-[10px] text-slate-500">7 feuilles prêtes & formatées</span>
                  </div>
                ) : (
                  <div className="mt-1">
                    <span className="text-xs text-slate-500">Aucun classeur lié pour le moment</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-400 block font-medium">Dernière Synchronisation</span>
                <div className="mt-1">
                  <span className="text-xs font-semibold text-slate-800">
                    {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('fr-FR') : 'En attente de synchronisation'}
                  </span>
                  <div className="text-[10px] text-slate-400">Mode bidirectionnel</div>
                </div>
              </div>
            </div>

            {/* Sync trigger button */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Cette action synchronise le référentiel complet ({products.length} produits), les {lots.length} lots avec FEFO, les réceptions, sorties et commandes.
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isSyncing}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {spreadsheetId ? 'Mettre à jour Google Sheets' : 'Créer et Lier mon Google Sheet'}
              </button>
            </div>
          </div>

          {/* Structure overview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-teal-600" />
              Architecture des 8 Feuilles & Alertes Automatiques Google Sheets
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-teal-800 block">1. DASHBOARD</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  12 KPIs clés + Bloc d'Alertes automatiques (Stock &lt; Min et Péremptions &le; 30j).
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-teal-800 block">2. RÉFÉRENTIEL PRODUITS</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Base unique avec ID Fournisseur, Stock minimal, mise en forme conditionnelle et validations.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-teal-800 block">3. STOCKS ET LOTS</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Gestion fine par lot, ID Fournisseur, alerte dynamique FEFO et surbrillance automatique rouge (&lt;J) et orange (&le;30j).
                </p>
              </div>

              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                <span className="font-bold text-teal-900 block">4. FOURNISSEURS</span>
                <p className="text-[11px] text-teal-700 mt-1">
                  ID Fournisseur unique, Contact, Téléphone, Email, Adresse, Conditions de Paiement et Codes Produits.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-teal-800 block">5. ENTRÉES</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Journal des réceptions fournisseurs avec ID Fournisseur, bons de livraison et conformité.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-teal-800 block">6. SORTIES</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dispensations aux pôles de soins avec imputation budgétaire et règle FEFO.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-teal-800 block">7. COMMANDES</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bons de commande fournisseurs (BC) et délais moyens d'approvisionnement.
                </p>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="font-bold text-rose-800 block">8. ALERTES ET PÉREMPTIONS</span>
                <p className="text-[11px] text-rose-700 mt-1">
                  Registre des lots périmés (&lt;30j, 60j, 90j), ruptures et bordereaux de destruction.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE APPS SCRIPT CODE */}
      {activeTab === 'script' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center">
                <Code2 className="w-4 h-4 mr-2 text-teal-600" />
                Script d'Automatisation Google Apps Script Hospitalier
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ajoute le menu « 🏥 Pharmacie Hospitalière », recalcule le FEFO, envoie les alertes email et planifie les alertes du matin.
              </p>
            </div>

            <button
              onClick={handleCopyScript}
              className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              {copiedScript ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  <span>Copié dans le presse-papier !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  <span>Copier le Script Apps Script</span>
                </>
              )}
            </button>
          </div>

          {/* Installation guide */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center">
              <HelpCircle className="w-4 h-4 mr-1 text-teal-600" />
              Comment installer ce script dans Google Sheets :
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] pl-2">
              <li>Ouvrez votre classeur Google Sheets (via le bouton « Ouvrir dans Google Sheets » ci-dessus).</li>
              <li>Dans la barre de menu de Google Sheets, cliquez sur <strong className="text-slate-800">Extensions</strong> &gt; <strong className="text-slate-800">Apps Script</strong>.</li>
              <li>Effacez le code existant dans l'éditeur et collez le script ci-dessous.</li>
              <li>Cliquez sur l'icône <strong className="text-slate-800">Enregistrer</strong> (disquette).</li>
              <li>Rechargez la page de votre Google Sheets : le menu <strong className="text-teal-700">« 🏥 Pharmacie Hospitalière »</strong> apparaîtra automatiquement dans la barre d'outils !</li>
            </ol>
          </div>

          {/* Code Viewer */}
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              {GOOGLE_APPS_SCRIPT_TEMPLATE}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP EXPORTS */}
      {activeTab === 'export' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center">
              <Download className="w-4 h-4 mr-2 text-teal-600" />
              Sauvegarde & Exportation Hors-Ligne des Données
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Exportez à tout moment l'intégralité de la base de données pharmaceutique hospitalière pour archivage ou audit réglementaire.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <div className="flex items-center space-x-2 text-teal-800 font-bold text-xs">
                <FileText className="w-5 h-5 text-teal-600" />
                <span>Export CSV - Référentiel & Stocks</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Fichier tabulaire standard contenant les codes, DCI, prix d'achat et seuils de réapprovisionnement, compatible Excel et LibreOffice.
              </p>
              <button
                onClick={handleExportCSV}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Télécharger Référentiel CSV
              </button>
            </div>

            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-800 font-bold text-xs">
                <FileJson className="w-5 h-5 text-indigo-600" />
                <span>Sauvegarde Complète JSON (Snapshot)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Archive exhaustive incluant produits, lots, mouvements d'entrées, sorties par service et commandes avec horodatage.
              </p>
              <button
                onClick={handleExportJSON}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Télécharger Sauvegarde Complète JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR WORKSPACE API ACTIONS (MANDATORY REQUIREMENT) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {spreadsheetId ? 'Mettre à jour le Google Sheet ?' : 'Créer le Google Sheet ?'}
                </h3>
                <p className="text-xs text-slate-500">Autorisation Google Workspace</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 py-2">
              <p>
                Cette action va écrire dans votre compte Google Drive :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium pl-1 text-[11px]">
                <li>{products.length} références du Référentiel Produits</li>
                <li>{lots.length} lots avec gestion FEFO et dates de péremption</li>
                <li>{receptions.length} entrées et {exits.length} sorties hospitalières</li>
                <li>Les formules automatiques du Dashboard hospitalier</li>
              </ul>
              <p className="text-[11px] text-slate-500">
                Vous pourrez consulter, modifier ou partager ce classeur directement dans Google Drive.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  onCreateOrSyncSpreadsheet();
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Confirmer l'écriture dans Google Sheets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

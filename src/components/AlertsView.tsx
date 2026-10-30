/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  LotStock, 
  Product, 
  LotStatus 
} from '../types/pharmacy';
import { formatDZD } from '../utils/currency';
import { 
  AlertTriangle, 
  XOctagon, 
  Clock, 
  ShieldAlert, 
  FileCheck2, 
  Printer, 
  CheckCircle2, 
  Search, 
  Lock, 
  Download,
  X
} from 'lucide-react';

interface AlertsViewProps {
  lots: LotStock[];
  products: Product[];
  onUpdateLotStatus: (lotId: string, status: LotStatus) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  lots,
  products,
  onUpdateLotStatus
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expired' | 'under30' | 'under60' | 'under90' | 'stupefiants'>('all');
  const [isDestructionModalOpen, setIsDestructionModalOpen] = useState(false);

  const now = new Date('2026-10-26T13:49:27');

  // Categorize lots by risk
  const categorized = useMemo(() => {
    const expired: LotStock[] = [];
    const under30: LotStock[] = [];
    const under60: LotStock[] = [];
    const under90: LotStock[] = [];
    const stupefiants: LotStock[] = [];

    lots.forEach(l => {
      const prod = products.find(p => p.code === l.productCode);
      const isStup = prod?.category === 'Stupéfiant & Assimilé';

      if (isStup) {
        stupefiants.push(l);
      }

      if (l.availableQty > 0) {
        const exp = new Date(l.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (diffDays < 0 || l.status === 'Périmé') {
          expired.push(l);
        } else if (diffDays <= 30) {
          under30.push(l);
        } else if (diffDays <= 60) {
          under60.push(l);
        } else if (diffDays <= 90) {
          under90.push(l);
        }
      }
    });

    return { expired, under30, under60, under90, stupefiants };
  }, [lots, products, now]);

  // Active list based on filter
  const displayedLots = useMemo(() => {
    if (filterType === 'expired') return categorized.expired;
    if (filterType === 'under30') return categorized.under30;
    if (filterType === 'under60') return categorized.under60;
    if (filterType === 'under90') return categorized.under90;
    if (filterType === 'stupefiants') return categorized.stupefiants;
    return [...categorized.expired, ...categorized.under30, ...categorized.under60, ...categorized.under90];
  }, [filterType, categorized]);

  const totalDestructionValue = categorized.expired.reduce((acc, l) => acc + (l.availableQty * l.unitPrice), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">
              Centre de Vigilance Sanitaire, Péremptions & Traçabilité
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
              {categorized.expired.length + categorized.under30.length} alertes prioritaires
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Surveillance continue des délais de péremption, mise en quarantaine immédiate, bordereaux de destruction et traçabilité des stupéfiants.
          </p>
        </div>

        {categorized.expired.length > 0 && (
          <button
            onClick={() => setIsDestructionModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-colors"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Bordereau de Destruction ({categorized.expired.length} lots)
          </button>
        )}
      </div>

      {/* Alert Level Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Tous */}
        <button
          onClick={() => setFilterType('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] block font-medium opacity-80">Toutes Alertes</span>
          <span className="text-lg font-bold">
            {categorized.expired.length + categorized.under30.length + categorized.under60.length + categorized.under90.length}
          </span>
        </button>

        {/* Périmés */}
        <button
          onClick={() => setFilterType('expired')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'expired'
              ? 'bg-red-600 text-white border-red-600 shadow-md'
              : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] block font-bold">❌ Déjà Périmés</span>
            <XOctagon className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-extrabold">{categorized.expired.length} lot(s)</span>
          <span className="text-[10px] block opacity-80">Quarantaine / Rebut</span>
        </button>

        {/* < 30 jours */}
        <button
          onClick={() => setFilterType('under30')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'under30'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] block font-bold">⚠️ &lt; 30 Jours</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-extrabold">{categorized.under30.length} lot(s)</span>
          <span className="text-[10px] block opacity-80">Dispensation urgente</span>
        </button>

        {/* 31 - 60 jours */}
        <button
          onClick={() => setFilterType('under60')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'under60'
              ? 'bg-yellow-600 text-white border-yellow-600 shadow-md'
              : 'bg-yellow-50 text-yellow-900 border-yellow-200 hover:bg-yellow-100'
          }`}
        >
          <span className="text-[10px] block font-medium">🟡 31 à 60 Jours</span>
          <span className="text-lg font-bold">{categorized.under60.length} lot(s)</span>
          <span className="text-[10px] block opacity-80">Rotation de stock</span>
        </button>

        {/* Stupéfiants */}
        <button
          onClick={() => setFilterType('stupefiants')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterType === 'stupefiants'
              ? 'bg-purple-700 text-white border-purple-700 shadow-md'
              : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] block font-bold">🔒 Stupéfiants</span>
            <Lock className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-extrabold">{categorized.stupefiants.length} lot(s)</span>
          <span className="text-[10px] block opacity-80">Coffre sécurisé</span>
        </button>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800">
            Détail des Lots Nécessitant une Vigilance Particulière
          </h3>
          <span className="text-xs text-slate-500">
            {displayedLots.length} lot(s) affiché(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Produit & DCI</th>
                <th className="py-3 px-4">N° Lot Fabricant</th>
                <th className="py-3 px-4 text-center">Date Péremption</th>
                <th className="py-3 px-4 text-center">Niveau de Risque</th>
                <th className="py-3 px-4 text-right">Quantité Impactée</th>
                <th className="py-3 px-4 text-right">Valeur Financière (DZD)</th>
                <th className="py-3 px-4">Emplacement Actuel</th>
                <th className="py-3 px-4 text-center">Action Recommandée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedLots.map(l => {
                const exp = new Date(l.expiryDate);
                const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
                const isExpired = diffDays < 0 || l.status === 'Périmé';
                const isUnder30 = diffDays >= 0 && diffDays <= 30;

                return (
                  <tr key={l.id} className={`hover:bg-slate-50/80 transition-colors ${
                    isExpired ? 'bg-red-50/30' : isUnder30 ? 'bg-amber-50/30' : ''
                  }`}>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-1">{l.productDesignation}</div>
                      <div className="text-[10px] font-mono font-bold text-teal-700">{l.productCode}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                      {l.lotNumber}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap font-semibold">
                      {l.expiryDate}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isExpired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800">
                          PÉRIMÉ (J+{Math.abs(diffDays)})
                        </span>
                      ) : isUnder30 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          J-{diffDays} (&lt; 30j)
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-600">
                          J-{diffDays}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-extrabold text-slate-800">
                      {l.availableQty}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                      {formatDZD(l.availableQty * l.unitPrice)}
                    </td>

                    <td className="py-3 px-4 text-slate-600 text-[11px] truncate max-w-[150px]">
                      {l.location}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isExpired ? (
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded">
                          Destruction immédiate
                        </span>
                      ) : isUnder30 ? (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-1 rounded">
                          Délivrance FEFO prioritaire
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          Surveillance normale
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE DESTRUCTION SLIP MODAL */}
      {isDestructionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-800">
                  Procès-Verbal de Mise au Rebut & Destruction de Médicaments
                </h3>
              </div>
              <button onClick={() => setIsDestructionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document body for print / official hospital record */}
            <div className="mt-4 p-5 border border-slate-300 rounded-xl bg-slate-50 space-y-4 text-xs font-serif print:p-0">
              <div className="flex justify-between border-b border-slate-300 pb-3">
                <div>
                  <div className="font-bold text-sm tracking-wide text-slate-900">CENTRE HOSPITALIER UNIVERSITAIRE (CHU)</div>
                  <div className="text-[11px] text-slate-600">Pharmacie à Usage Intérieur (PUI)</div>
                  <div className="text-[10px] text-slate-500">Service de Gestion des Stocks & Assurance Qualité</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-red-700">PV-DEST-2026-018</div>
                  <div className="text-[10px] text-slate-500">Date : {new Date().toLocaleDateString('fr-FR')}</div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-800">
                  Le présent bordereau certifie la mise en quarantaine et la destruction réglementaire des lots périmés ou non conformes ci-dessous désignés, conformément aux Bonnes Pratiques de Pharmacie Hospitalière (BPPH) :
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border border-slate-300 divide-y divide-slate-300 bg-white">
                  <thead className="bg-slate-100 font-bold text-[10px]">
                    <tr>
                      <th className="p-2 border-r border-slate-300">Code</th>
                      <th className="p-2 border-r border-slate-300">Désignation Produit</th>
                      <th className="p-2 border-r border-slate-300">N° Lot</th>
                      <th className="p-2 border-r border-slate-300">Péremption</th>
                      <th className="p-2 text-right border-r border-slate-300">Qté Rebut</th>
                      <th className="p-2 text-right">Valeur (DZD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {categorized.expired.map(l => (
                      <tr key={l.id}>
                        <td className="p-2 font-mono border-r border-slate-200">{l.productCode}</td>
                        <td className="p-2 font-medium border-r border-slate-200">{l.productDesignation}</td>
                        <td className="p-2 font-mono font-bold border-r border-slate-200">{l.lotNumber}</td>
                        <td className="p-2 text-red-700 font-semibold border-r border-slate-200">{l.expiryDate}</td>
                        <td className="p-2 text-right font-bold border-r border-slate-200">{l.availableQty}</td>
                        <td className="p-2 text-right font-mono">{formatDZD(l.availableQty * l.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-red-50 p-2.5 rounded-lg border border-red-200">
                <span className="font-bold text-red-900">Valeur Totale des Produits Détruits :</span>
                <span className="font-mono font-bold text-sm text-red-900">{formatDZD(totalDestructionValue)}</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300">
                <div className="border border-dashed border-slate-300 p-3 rounded-lg h-24">
                  <span className="text-[10px] text-slate-500 block font-sans">Le Pharmacien Responsable PUI</span>
                  <div className="mt-8 text-[11px] font-sans text-slate-700 italic">Dr. Hélène Mercier (Signé)</div>
                </div>
                <div className="border border-dashed border-slate-300 p-3 rounded-lg h-24">
                  <span className="text-[10px] text-slate-500 block font-sans">Le Témoin / Préparateur en Pharmacie</span>
                  <div className="mt-8 text-[11px] font-sans text-slate-700 italic">Laurent V. (Signé)</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsDestructionModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Imprimer le Bordereau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

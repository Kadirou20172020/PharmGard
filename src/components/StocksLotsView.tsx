/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  LotStock, 
  Product, 
  Supplier, 
  LotStatus 
} from '../types/pharmacy';
import { formatDZD } from '../utils/currency';
import { 
  Boxes, 
  Search, 
  Plus, 
  AlertTriangle, 
  Calendar, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  DollarSign, 
  Tag, 
  CheckCircle2, 
  XOctagon, 
  HelpCircle,
  X,
  FileCheck
} from 'lucide-react';

interface StocksLotsViewProps {
  lots: LotStock[];
  products: Product[];
  suppliers: Supplier[];
  onAddLot: (lot: LotStock) => void;
  onUpdateLotStatus: (lotId: string, newStatus: LotStatus) => void;
}

export const StocksLotsView: React.FC<StocksLotsViewProps> = ({
  lots,
  products,
  suppliers,
  onAddLot,
  onUpdateLotStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const now = new Date('2026-10-26T13:49:27');

  // Identify FEFO priority lots (the active lot with the earliest expiry date for each product)
  const fefoLotIds = useMemo(() => {
    const priorityMap: Record<string, { lotId: string; expiry: number }> = {};
    lots.forEach(l => {
      if (l.status === 'Actif' && l.availableQty > 0) {
        const expTime = new Date(l.expiryDate).getTime();
        if (!priorityMap[l.productCode] || expTime < priorityMap[l.productCode].expiry) {
          priorityMap[l.productCode] = { lotId: l.id, expiry: expTime };
        }
      }
    });
    return new Set(Object.values(priorityMap).map(v => v.lotId));
  }, [lots]);

  // Filter lots
  const filteredLots = useMemo(() => {
    return lots.filter(l => {
      const matchesSearch = 
        l.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.productDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;

      // Expiry tranche filter
      let matchesExpiry = true;
      if (expiryFilter !== 'all') {
        const exp = new Date(l.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (expiryFilter === 'perime') matchesExpiry = diffDays < 0 || l.status === 'Périmé';
        else if (expiryFilter === '30j') matchesExpiry = diffDays >= 0 && diffDays <= 30;
        else if (expiryFilter === '60j') matchesExpiry = diffDays > 30 && diffDays <= 60;
        else if (expiryFilter === '90j') matchesExpiry = diffDays > 60 && diffDays <= 90;
        else if (expiryFilter === 'sain') matchesExpiry = diffDays > 90;
      }

      return matchesSearch && matchesStatus && matchesExpiry;
    });
  }, [lots, searchQuery, statusFilter, expiryFilter, now]);

  // Total summary of filtered lots
  const summary = useMemo(() => {
    const available = filteredLots.reduce((acc, l) => acc + l.availableQty, 0);
    const value = filteredLots.reduce((acc, l) => acc + (l.availableQty * l.unitPrice), 0);
    return { available, value };
  }, [filteredLots]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">
              Traçabilité des Stocks par Lot & Gestion FEFO
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
              {filteredLots.length} lot(s)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contrôle strict des dates de péremption, priorisation automatique First Expired, First Out et suivi des quantités physiques.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-[10px] text-slate-400">Total Disponible Filtré</div>
            <div className="text-sm font-extrabold text-slate-800">
              {summary.available} u. ({formatDZD(summary.value)})
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Enregistrer un Nouveau Lot
          </button>
        </div>
      </div>

      {/* FEFO Banner */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200/80 p-4 rounded-xl flex items-center justify-between text-xs text-teal-900">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-teal-600 text-white rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-teal-950">Règle FEFO Hospitalière Active (First Expired, First Out)</span>
            <p className="text-teal-700 text-[11px] mt-0.5">
              Les lots marqués du badge <span className="font-bold text-teal-900 bg-teal-200/70 px-1.5 py-0.2 rounded">Priorité FEFO</span> ont la date de péremption la plus proche et sont automatiquement présélectionnés lors des dispensations aux services hospitaliers pour éliminer le risque de péremption en rayon.
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par Code, Produit, N° Lot, Emplacement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-teal-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border-slate-200 bg-slate-50 px-3 py-2 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
          >
            <option value="all">Tous Statuts</option>
            <option value="Actif">Actif</option>
            <option value="Quarantaine">En Quarantaine</option>
            <option value="Périmé">Périmé</option>
            <option value="Épuisé">Épuisé (0 dispo)</option>
          </select>

          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="text-xs rounded-lg border-slate-200 bg-slate-50 px-3 py-2 focus:border-teal-500 focus:ring-teal-500 text-slate-700 font-medium"
          >
            <option value="all">Toutes Échéances</option>
            <option value="perime">❌ Déjà Périmés</option>
            <option value="30j">⚠️ Alerte &lt; 30 jours</option>
            <option value="60j">🟡 Échéance 31-60 jours</option>
            <option value="90j">🔵 Échéance 61-90 jours</option>
            <option value="sain">✅ Valides (&gt; 90 jours)</option>
          </select>
        </div>
      </div>

      {/* Lots Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Produit & Code</th>
                <th className="py-3 px-4">N° Lot & Réception</th>
                <th className="py-3 px-4 text-center">Péremption & Délai</th>
                <th className="py-3 px-4 text-center">Règle FEFO</th>
                <th className="py-3 px-4 text-right">Initial</th>
                <th className="py-3 px-4 text-right">Reçu</th>
                <th className="py-3 px-4 text-right">Sorti</th>
                <th className="py-3 px-4 text-right">Disponible</th>
                <th className="py-3 px-4 text-right">Valeur Stock (DZD)</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLots.map((l) => {
                const expDate = new Date(l.expiryDate);
                const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                const isExpired = diffDays < 0 || l.status === 'Périmé';
                const isUnder30 = diffDays >= 0 && diffDays <= 30;
                const isUnder60 = diffDays > 30 && diffDays <= 60;
                const isUnder90 = diffDays > 60 && diffDays <= 90;
                const isFefoPriority = fefoLotIds.has(l.id);

                return (
                  <tr key={l.id} className={`hover:bg-slate-50/80 transition-colors ${
                    isExpired ? 'bg-red-50/40' : isUnder30 ? 'bg-amber-50/30' : ''
                  }`}>
                    {/* Product & Code */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-1">{l.productDesignation}</div>
                      <div className="text-[10px] font-mono font-bold text-teal-700">{l.productCode}</div>
                      <div className="text-[10px] text-slate-400 truncate">{l.location}</div>
                    </td>

                    {/* Lot Number & Reception */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded inline-block">
                        {l.lotNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                          {l.supplierId}
                        </span>
                        <span className="truncate">{l.supplier}</span>
                      </div>
                    </td>

                    {/* Expiry Date & Countdown */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{l.expiryDate}</div>
                      <div className="mt-0.5">
                        {isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800">
                            <XOctagon className="w-3 h-3 mr-1 text-red-600" />
                            PÉRIMÉ ({Math.abs(diffDays)} j)
                          </span>
                        ) : isUnder30 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            <Clock className="w-3 h-3 mr-1 text-amber-700" />
                            J-{diffDays} (&lt; 30j)
                          </span>
                        ) : isUnder60 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800">
                            J-{diffDays} (31-60j)
                          </span>
                        ) : isUnder90 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                            J-{diffDays} (61-90j)
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">
                            J-{diffDays} (Valide)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* FEFO Badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isFefoPriority && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-teal-500 text-white shadow-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Priorité FEFO
                        </span>
                      )}
                    </td>

                    {/* Initial */}
                    <td className="py-3 px-4 text-right text-slate-500 font-mono">
                      {l.initialQty}
                    </td>

                    {/* Received */}
                    <td className="py-3 px-4 text-right text-teal-700 font-mono font-medium">
                      +{l.receivedQty}
                    </td>

                    {/* Exited */}
                    <td className="py-3 px-4 text-right text-rose-600 font-mono font-medium">
                      -{l.exitedQty}
                    </td>

                    {/* Available */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className={`font-mono font-extrabold text-sm ${
                        l.availableQty === 0 ? 'text-slate-400' : 'text-slate-900'
                      }`}>
                        {l.availableQty}
                      </span>
                    </td>

                    {/* Total Value */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold text-emerald-700">
                      {formatDZD(l.availableQty * l.unitPrice)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        l.status === 'Actif'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'Quarantaine'
                          ? 'bg-amber-100 text-amber-800'
                          : l.status === 'Périmé'
                          ? 'bg-red-100 text-red-800 font-bold'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {l.status}
                      </span>
                    </td>

                    {/* Quick action: quarantine toggle */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {l.status === 'Actif' ? (
                        <button
                          onClick={() => onUpdateLotStatus(l.id, 'Quarantaine')}
                          className="px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                          title="Mettre ce lot en quarantaine"
                        >
                          Quarantaine
                        </button>
                      ) : l.status === 'Quarantaine' ? (
                        <button
                          onClick={() => onUpdateLotStatus(l.id, 'Actif')}
                          className="px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                          title="Remettre en circulation"
                        >
                          Libérer
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD LOT MODAL */}
      {isAddModalOpen && (
        <AddLotModal
          products={products}
          suppliers={suppliers}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={(lot) => {
            onAddLot(lot);
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface AddLotModalProps {
  products: Product[];
  suppliers: Supplier[];
  onClose: () => void;
  onSubmit: (lot: LotStock) => void;
}

const AddLotModal: React.FC<AddLotModalProps> = ({
  products,
  suppliers,
  onClose,
  onSubmit
}) => {
  const [productCode, setProductCode] = useState(products[0]?.code || '');
  const [lotNumber, setLotNumber] = useState(`LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [receptionDate, setReceptionDate] = useState('2026-10-26');
  const [expiryDate, setExpiryDate] = useState('2028-06-30');
  const [initialQty, setInitialQty] = useState(100);
  const [supplier, setSupplier] = useState(suppliers[0]?.name || '');
  const [location, setLocation] = useState('Magasin Central - Allée A-02');
  const [comments, setComments] = useState('');

  const selectedProduct = products.find(p => p.code === productCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const newLot: LotStock = {
      id: `LOT-${Date.now()}`,
      productCode,
      productDesignation: selectedProduct.designation,
      lotNumber,
      receptionDate,
      expiryDate,
      initialQty,
      receivedQty: initialQty,
      exitedQty: 0,
      availableQty: initialQty,
      unitPrice: selectedProduct.purchasePrice,
      totalValue: initialQty * selectedProduct.purchasePrice,
      supplierId: selectedProduct.supplierId,
      supplier: supplier || selectedProduct.supplier,
      location: location || selectedProduct.location,
      status: 'Actif',
      comments
    };

    onSubmit(newLot);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800">
            Enregistrer un Nouveau Lot de Stock
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Sélectionner la Référence</label>
            <select
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
            >
              {products.map(p => (
                <option key={p.code} value={p.code}>
                  {p.code} - {p.designation} ({p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Numéro de Lot Fabricant</label>
              <input
                type="text"
                required
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Quantité Initiale</label>
              <input
                type="number"
                min="1"
                required
                value={initialQty}
                onChange={(e) => setInitialQty(parseInt(e.target.value) || 0)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Date de Réception</label>
              <input
                type="date"
                required
                value={receptionDate}
                onChange={(e) => setReceptionDate(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Date de Péremption</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Emplacement de Stockage</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Commentaires / Traçabilité</label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ex: Certificat de conformité vérifié"
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Créer le Lot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

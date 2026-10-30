/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ReceptionEntry, 
  Product, 
  Supplier, 
  LotStock 
} from '../types/pharmacy';
import { formatDZD } from '../utils/currency';
import { 
  ArrowDownToLine, 
  Search, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Plus, 
  Calendar, 
  DollarSign, 
  Building, 
  ShieldCheck,
  AlertCircle,
  Camera
} from 'lucide-react';

interface ReceptionsViewProps {
  receptions: ReceptionEntry[];
  products: Product[];
  suppliers: Supplier[];
  onAddReception: (reception: ReceptionEntry, updatedLot?: LotStock) => void;
  onOpenScanner?: () => void;
}

export const ReceptionsView: React.FC<ReceptionsViewProps> = ({
  receptions,
  products,
  suppliers,
  onAddReception,
  onOpenScanner
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Form states
  const [receptionNumber, setReceptionNumber] = useState(`REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [receptionDate, setReceptionDate] = useState('2026-10-26');
  const [orderNumber, setOrderNumber] = useState('BC-2026-092');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState(`BL-${Math.floor(10000 + Math.random() * 90000)}`);
  const [selectedProductCode, setSelectedProductCode] = useState(products[0]?.code || '');
  const [supplier, setSupplier] = useState(suppliers[0]?.name || '');
  const [lotNumber, setLotNumber] = useState(`LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [expiryDate, setExpiryDate] = useState('2028-06-30');
  const [quantityReceived, setQuantityReceived] = useState<number>(100);
  const [location, setLocation] = useState('Magasin Central - Allée A-02');
  const [receivedBy, setReceivedBy] = useState('Dr. Hélène Mercier (Pharmacien)');
  const [isCompliant, setIsCompliant] = useState(true);
  const [notes, setNotes] = useState('Contrôle visuel et chaîne du froid validés');

  const selectedProduct = products.find(p => p.code === selectedProductCode);
  const unitPrice = selectedProduct?.purchasePrice || 1.50;
  const unit = selectedProduct?.unit || 'Unité';
  const totalAmount = quantityReceived * unitPrice;

  // Handle product selection change
  const handleProductChange = (code: string) => {
    setSelectedProductCode(code);
    const prod = products.find(p => p.code === code);
    if (prod) {
      setSupplier(prod.supplier);
      setLocation(prod.location);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const newReception: ReceptionEntry = {
      id: `REC-${Date.now()}`,
      receptionNumber,
      receptionDate,
      orderNumber,
      deliveryNoteNumber,
      supplierId: selectedProduct.supplierId,
      supplier,
      productCode: selectedProduct.code,
      productDesignation: selectedProduct.designation,
      lotNumber,
      expiryDate,
      quantityReceived,
      unit,
      unitPrice,
      totalAmount,
      location,
      receivedBy,
      isCompliant,
      notes
    };

    onAddReception(newReception);

    // Reset form
    setReceptionNumber(`REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setDeliveryNoteNumber(`BL-${Math.floor(10000 + Math.random() * 90000)}`);
    setIsFormVisible(false);
  };

  const filteredReceptions = receptions.filter(r => 
    r.receptionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.deliveryNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.productDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">
              Journal des Réceptions & Entrées de Marchandises
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              {receptions.length} réception(s)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Formulaire tabulaire de saisie pour les arrivages laboratoires : contrôle de conformité, numéro de BL, lots et dates de péremption.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="inline-flex items-center px-4 py-2 text-xs font-bold bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white rounded-xl shadow-md shadow-teal-500/20 transition-all border border-teal-400/30 whitespace-nowrap"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              <span>Scanner un Bon de Livraison</span>
            </button>
          )}

          <button
            onClick={() => setIsFormVisible(!isFormVisible)}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-sm transition-colors whitespace-nowrap"
          >
            {isFormVisible ? 'Masquer le formulaire' : 'Saisie Manuelle'}
            <Plus className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      </div>

      {/* FORMULAIRE DE SAISIE TABULAIRE POUR RÉCEPTIONS (FEUILLE 4) */}
      {isFormVisible && (
        <div className="bg-gradient-to-br from-slate-50 to-teal-50/40 p-6 rounded-2xl border border-teal-200 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-teal-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-teal-600 text-white rounded-lg">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Formulaire Tabulaire de Réception Hospitalière
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded">
              {receptionNumber}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Row 1: Identifiants administratifs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">N° Bon de Commande (BC)</label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">N° Bon de Livraison (BL)</label>
                <input
                  type="text"
                  required
                  value={deliveryNoteNumber}
                  onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
                />
              </div>

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
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Fournisseur</label>
                <input
                  type="text"
                  required
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-semibold"
                />
              </div>
            </div>

            {/* Row 2: Produit & Données Médicales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Code Produit & DCI</label>
                <select
                  value={selectedProductCode}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-medium"
                >
                  {products.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.designation} ({p.unit})
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    DCI: <span className="font-semibold text-slate-700">{selectedProduct.dci}</span> • {selectedProduct.category}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Numéro de Lot Reçu</label>
                <input
                  type="text"
                  required
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold"
                  placeholder="Ex: FK-2026-9921"
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

            {/* Row 3: Quantités, Prix et Calculs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Quantité Reçue</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityReceived}
                    onChange={(e) => setQuantityReceived(parseInt(e.target.value) || 0)}
                    className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400">{unit}s</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Prix Unitaire d'Achat (DZD)</label>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  value={unitPrice}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-100 p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Montant Total Calculé</label>
                <div className="p-2 bg-emerald-50 text-emerald-800 font-mono font-extrabold text-sm rounded-lg border border-emerald-200">
                  {formatDZD(totalAmount)}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Emplacement de Stockage</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                />
              </div>
            </div>

            {/* Row 4: Contrôleur & Conformité */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Réceptionnaire / Contrôleur</label>
                <input
                  type="text"
                  required
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Contrôle de Conformité</label>
                <div className="flex items-center space-x-3 mt-2">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="conformite"
                      checked={isCompliant}
                      onChange={() => setIsCompliant(true)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-emerald-700 font-semibold">Conforme</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="conformite"
                      checked={!isCompliant}
                      onChange={() => setIsCompliant(false)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-red-700 font-semibold">Non conforme / Quarantaine</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Notes & Certificat d'analyse</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFormVisible(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Valider l'Entrée & Incrémenter le Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par N° Réception, BL, BC, Produit, Lot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-teal-500 text-slate-800"
          />
        </div>
      </div>

      {/* Receptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Réception & Date</th>
                <th className="py-3 px-4">Bons (BC / BL)</th>
                <th className="py-3 px-4">Fournisseur</th>
                <th className="py-3 px-4">Produit Reçu</th>
                <th className="py-3 px-4">Lot & Péremption</th>
                <th className="py-3 px-4 text-right">Quantité</th>
                <th className="py-3 px-4 text-right">Montant Total (DZD)</th>
                <th className="py-3 px-4 text-center">Conformité</th>
                <th className="py-3 px-4">Réceptionnaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceptions.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-teal-700">{r.receptionNumber}</span>
                    <div className="text-[10px] text-slate-400">{r.receptionDate}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                    <div className="text-slate-800 font-medium">BC: {r.orderNumber}</div>
                    <div className="text-slate-500 text-[10px]">BL: {r.deliveryNoteNumber}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                    {r.supplier}
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-800 line-clamp-1">{r.productDesignation}</div>
                    <div className="text-[10px] font-mono text-slate-400">{r.productCode}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                    <div className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded inline-block">{r.lotNumber}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Exp: {r.expiryDate}</div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-teal-700">
                    +{r.quantityReceived} {r.unit}s
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                    {formatDZD(r.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {r.isCompliant ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                        Conforme
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1 text-red-600" />
                        Non conforme
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                    {r.receivedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

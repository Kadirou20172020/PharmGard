/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ExitRecord, 
  Product, 
  LotStock, 
  HospitalDepartment, 
  ExitReason 
} from '../types/pharmacy';
import { formatDZD } from '../utils/currency';
import { 
  ArrowUpFromLine, 
  Search, 
  ShieldCheck, 
  Plus, 
  Calendar, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  FileText
} from 'lucide-react';

interface ExitsViewProps {
  exits: ExitRecord[];
  products: Product[];
  lots: LotStock[];
  departments: HospitalDepartment[];
  onAddExit: (exit: ExitRecord) => void;
}

export const ExitsView: React.FC<ExitsViewProps> = ({
  exits,
  products,
  lots,
  departments,
  onAddExit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Form states
  const [exitNumber, setExitNumber] = useState(`SORT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [exitDate, setExitDate] = useState('2026-10-26');
  const [department, setDepartment] = useState(departments[0]?.name || 'Réanimation & Soins Intensifs');
  const [requesterName, setRequesterName] = useState(departments[0]?.headDoctor || 'Pr. Alain Martin');
  const [selectedProductCode, setSelectedProductCode] = useState(products[0]?.code || '');
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [quantityExited, setQuantityExited] = useState<number>(10);
  const [reason, setReason] = useState<ExitReason>('Dispensation standard');
  const [validatedBy, setValidatedBy] = useState('Dr. Hélène Mercier (Pharmacien)');
  const [notes, setNotes] = useState('Délivrance conforme sur prescription');

  const selectedProduct = products.find(p => p.code === selectedProductCode);

  // Available lots for the selected product (only active with stock > 0)
  const productLots = useMemo(() => {
    return lots
      .filter(l => l.productCode === selectedProductCode && l.availableQty > 0 && l.status !== 'Périmé')
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [lots, selectedProductCode]);

  // Priority FEFO lot is the first one in the sorted list!
  const fefoLot = productLots[0];

  // Auto-select FEFO lot when product changes
  React.useEffect(() => {
    if (fefoLot) {
      setSelectedLotId(fefoLot.id);
    } else {
      setSelectedLotId('');
    }
  }, [selectedProductCode, fefoLot]);

  const currentChosenLot = lots.find(l => l.id === selectedLotId) || fefoLot;
  const unitPrice = selectedProduct?.purchasePrice || 1.50;
  const totalCost = quantityExited * unitPrice;

  // Handle department change -> auto update default doctor
  const handleDepartmentChange = (deptName: string) => {
    setDepartment(deptName);
    const d = departments.find(dep => dep.name === deptName);
    if (d) setRequesterName(d.headDoctor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !currentChosenLot) {
      alert('Veuillez sélectionner un produit et un lot valide avec du stock disponible.');
      return;
    }

    if (quantityExited > currentChosenLot.availableQty) {
      alert(`Quantité demandée (${quantityExited}) supérieure au stock disponible du lot (${currentChosenLot.availableQty} ${selectedProduct.unit}s).`);
      return;
    }

    const newExit: ExitRecord = {
      id: `SORT-${Date.now()}`,
      exitNumber,
      exitDate,
      hospitalDepartment: department,
      requesterName,
      productCode: selectedProduct.code,
      productDesignation: selectedProduct.designation,
      lotNumber: currentChosenLot.lotNumber,
      expiryDate: currentChosenLot.expiryDate,
      quantityExited,
      unit: selectedProduct.unit,
      unitPrice,
      totalCost,
      reason,
      validatedBy,
      notes
    };

    onAddExit(newExit);

    // Reset Form
    setExitNumber(`SORT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setIsFormVisible(false);
  };

  const filteredExits = exits.filter(e =>
    e.exitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.hospitalDepartment.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.productDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.lotNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">
              Dispensations & Sorties vers les Services Hospitaliers
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
              {exits.length} dispensation(s)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Délivrance sécurisée avec suggestion automatique du lot FEFO (First Expired, First Out) et imputation financière par pôle de soins.
          </p>
        </div>

        <button
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          {isFormVisible ? 'Masquer le formulaire' : 'Nouvelle Dispensation Service'}
          <Plus className="w-4 h-4 ml-1.5" />
        </button>
      </div>

      {/* FORMULAIRE DE SAISIE TABULAIRE POUR SORTIES / DISPENSATIONS (FEUILLE 5) */}
      {isFormVisible && (
        <div className="bg-gradient-to-br from-slate-50 to-rose-50/30 p-6 rounded-2xl border border-rose-200 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-rose-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-rose-600 text-white rounded-lg">
                <ArrowUpFromLine className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Formulaire de Dispensation Hospitalière aux Services
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
              {exitNumber}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Service demandeur & Prescripteur */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Service Hospitalier Destinataire</label>
                <select
                  value={department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-semibold text-slate-800"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name} ({d.floor})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Demandeur / Médecin Prescripteur</label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Date de Sortie / Délivrance</label>
                <input
                  type="date"
                  required
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                />
              </div>
            </div>

            {/* Produit & Algorithme FEFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Produit Demandé</label>
                <select
                  value={selectedProductCode}
                  onChange={(e) => setSelectedProductCode(e.target.value)}
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
                    DCI: <span className="font-semibold text-slate-700">{selectedProduct.dci}</span> • Emplacement : {selectedProduct.location}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-600">Sélection du Lot Hospitalier (FEFO)</label>
                  {fefoLot && selectedLotId === fefoLot.id && (
                    <span className="inline-flex items-center text-[10px] text-teal-700 bg-teal-50 font-bold px-1.5 py-0.2 rounded border border-teal-200">
                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                      Recommandation FEFO Optimale
                    </span>
                  )}
                </div>

                {productLots.length > 0 ? (
                  <select
                    value={selectedLotId}
                    onChange={(e) => setSelectedLotId(e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold text-slate-800"
                  >
                    {productLots.map((l, idx) => (
                      <option key={l.id} value={l.id}>
                        {l.lotNumber} - Exp: {l.expiryDate} (Dispo: {l.availableQty} {selectedProduct?.unit}s) {idx === 0 ? '⭐ [PRIORITAIRE FEFO]' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-200">
                    ❌ Aucun lot disponible en stock pour ce produit !
                  </div>
                )}
              </div>
            </div>

            {/* Quantités, Prix et Imputation analytique */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Quantité Délivrée</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={currentChosenLot?.availableQty || 9999}
                    required
                    value={quantityExited}
                    onChange={(e) => setQuantityExited(parseInt(e.target.value) || 0)}
                    className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400">{selectedProduct?.unit}s</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Prix Unitaire (DZD)</label>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  value={unitPrice}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-100 p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Coût Imputé au Service (DZD)</label>
                <div className="p-2 bg-rose-50 text-rose-800 font-mono font-extrabold text-sm rounded-lg border border-rose-200">
                  {formatDZD(totalCost)}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Motif de Sortie</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ExitReason)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                >
                  <option value="Dispensation standard">Dispensation standard</option>
                  <option value="Urgence vitale">Urgence vitale</option>
                  <option value="Dotation de service">Dotation de service</option>
                  <option value="Renouvellement armoire">Renouvellement armoire</option>
                  <option value="Mise au rebut / Périmé">Mise au rebut / Périmé</option>
                  <option value="Retour laboratoire">Retour laboratoire</option>
                </select>
              </div>
            </div>

            {/* Validation par le pharmacien */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Pharmacien / Préparateur Valideur</label>
                <input
                  type="text"
                  required
                  value={validatedBy}
                  onChange={(e) => setValidatedBy(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Notes / Traçabilité Ordonnance</label>
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
                disabled={!currentChosenLot || productLots.length === 0}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                Valider la Dispensation & Déduire du Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par N° Sortie, Service, Demandeur, Produit, Lot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-teal-500 text-slate-800"
          />
        </div>
      </div>

      {/* Exits Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Sortie & Date</th>
                <th className="py-3 px-4">Service Destinataire</th>
                <th className="py-3 px-4">Prescripteur / Demandeur</th>
                <th className="py-3 px-4">Produit Délivré</th>
                <th className="py-3 px-4">Lot Prélevé (FEFO)</th>
                <th className="py-3 px-4 text-right">Quantité</th>
                <th className="py-3 px-4 text-right">Coût Imputé (DZD)</th>
                <th className="py-3 px-4 text-center">Motif</th>
                <th className="py-3 px-4">Valideur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExits.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-rose-700">{e.exitNumber}</span>
                    <div className="text-[10px] text-slate-400">{e.exitDate}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                    {e.hospitalDepartment}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                    {e.requesterName}
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-800 line-clamp-1">{e.productDesignation}</div>
                    <div className="text-[10px] font-mono text-slate-400">{e.productCode}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                    <div className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded inline-block">{e.lotNumber}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Exp: {e.expiryDate}</div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-rose-600">
                    -{e.quantityExited} {e.unit}s
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                    {formatDZD(e.totalCost)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      e.reason === 'Urgence vitale'
                        ? 'bg-red-100 text-red-800 font-bold'
                        : e.reason === 'Dotation de service'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {e.reason}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                    {e.validatedBy}
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

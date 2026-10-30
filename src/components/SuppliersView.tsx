/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Supplier, Product } from '../types/pharmacy';
import { 
  Building2, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Clock, 
  Package, 
  X,
  FileCheck2,
  Tag
} from 'lucide-react';

interface SuppliersViewProps {
  suppliers: Supplier[];
  products: Product[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  products,
  onAddSupplier,
  onUpdateSupplier
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = suppliers.filter(s =>
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.suppliedProducts.some(pCode => pCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">
              Répertoire des Fournisseurs Hospitaliers (Feuille FOURNISSEURS)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700">
              {suppliers.length} laboratoires & distributeurs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestion centrale des identifiants uniques (ID Fournisseur), contacts, délais d'approvisionnement, conditions de règlement et références catalogue associées.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau Fournisseur
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par ID Fournisseur, Nom, Contact, Code produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-teal-500 text-slate-800"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ID Fournisseur (Unique)</th>
                <th className="py-3 px-4">Nom du Fournisseur</th>
                <th className="py-3 px-4">Contact Principal</th>
                <th className="py-3 px-4">Coordonnées (Tél & Email)</th>
                <th className="py-3 px-4">Conditions de Paiement</th>
                <th className="py-3 px-4 text-center">Délai Moyen (j)</th>
                <th className="py-3 px-4">Produits Fournis</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* ID */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {s.id}
                    </span>
                  </td>

                  {/* Name & Address */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center mt-0.5">
                      <MapPin className="w-2.5 h-2.5 mr-1 text-slate-400" />
                      {s.address}
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                    {s.contactName}
                  </td>

                  {/* Phone & Email */}
                  <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                    <div className="flex items-center text-slate-700 font-mono">
                      <Phone className="w-3 h-3 mr-1 text-slate-400" />
                      {s.phone}
                    </div>
                    <div className="flex items-center text-teal-700 mt-0.5">
                      <Mail className="w-3 h-3 mr-1 text-teal-600" />
                      {s.email}
                    </div>
                  </td>

                  {/* Payment Terms */}
                  <td className="py-3 px-4 text-slate-600 text-[11px]">
                    <div className="flex items-center font-medium">
                      <CreditCard className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                      <span>{s.paymentTerms}</span>
                    </div>
                  </td>

                  {/* Lead Time */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                      <Clock className="w-3 h-3 mr-1 text-teal-600" />
                      {s.averageLeadTimeDays} jours
                    </span>
                  </td>

                  {/* Products Supplied */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {s.suppliedProducts.length > 0 ? (
                        s.suppliedProducts.map(pCode => (
                          <span
                            key={pCode}
                            className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200"
                          >
                            {pCode}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Aucun code rattaché</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="px-2.5 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <SupplierModal
          isOpen={isModalOpen}
          initialData={editingSupplier}
          allProducts={products}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(saved) => {
            if (editingSupplier) {
              onUpdateSupplier(saved);
            } else {
              onAddSupplier(saved);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface SupplierModalProps {
  isOpen: boolean;
  initialData: Supplier | null;
  allProducts: Product[];
  onClose: () => void;
  onSubmit: (s: Supplier) => void;
}

const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  initialData,
  allProducts,
  onClose,
  onSubmit
}) => {
  const [id, setId] = useState(initialData?.id || `SUP-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState(initialData?.name || '');
  const [contactName, setContactName] = useState(initialData?.contactName || '');
  const [phone, setPhone] = useState(initialData?.phone || '+33 1 ');
  const [email, setEmail] = useState(initialData?.email || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms || '45 jours fin de mois (Mandat administratif CHU)');
  const [averageLeadTimeDays, setAverageLeadTimeDays] = useState(initialData?.averageLeadTimeDays || 3);
  const [selectedProductCodes, setSelectedProductCodes] = useState<string[]>(initialData?.suppliedProducts || []);

  const toggleProduct = (code: string) => {
    if (selectedProductCodes.includes(code)) {
      setSelectedProductCodes(selectedProductCodes.filter(c => c !== code));
    } else {
      setSelectedProductCodes([...selectedProductCodes, code]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name) {
      alert('Veuillez renseigner au minimum l\'ID Fournisseur et le Nom.');
      return;
    }

    const savedSupplier: Supplier = {
      id: id.trim().toUpperCase(),
      name,
      contactName,
      phone,
      email,
      address,
      paymentTerms,
      averageLeadTimeDays,
      suppliedProducts: selectedProductCodes
    };

    onSubmit(savedSupplier);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800">
            {initialData ? 'Modifier la Fiche Fournisseur' : 'Nouveau Fournisseur Hospitalier'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">ID Fournisseur (Unique)</label>
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Ex: SUP-FK"
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Nom du Fournisseur</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Fresenius Kabi France"
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Contact Principal</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: M. Jean Vidal"
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Téléphone Direct</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Email Commandes</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Délai Moyen de Livraison (Jours)</label>
              <input
                type="number"
                min="1"
                value={averageLeadTimeDays}
                onChange={(e) => setAverageLeadTimeDays(parseInt(e.target.value) || 1)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Adresse Siège / Expédition</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Conditions de Paiement</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Produits Fournis (Cliquer pour associer)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
              {allProducts.map(p => {
                const isSelected = selectedProductCodes.includes(p.code);
                return (
                  <button
                    type="button"
                    key={p.code}
                    onClick={() => toggleProduct(p.code)}
                    className={`text-left p-1.5 rounded text-[11px] transition-colors border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-mono block text-[10px]">{p.code}</span>
                    <span className="truncate block">{p.dci}</span>
                  </button>
                );
              })}
            </div>
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
              Enregistrer le Fournisseur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

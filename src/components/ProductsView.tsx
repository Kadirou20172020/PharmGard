/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Product, 
  LotStock, 
  ProductCategory, 
  StorageCondition, 
  Supplier 
} from '../types/pharmacy';
import { formatDZD } from '../utils/currency';
import { 
  Pill, 
  Search, 
  Plus, 
  Filter, 
  ThermometerSnowflake, 
  ShieldAlert, 
  Lock, 
  CheckCircle, 
  AlertTriangle, 
  Edit3, 
  X,
  Package,
  Layers,
  ArrowUpDown,
  Tag
} from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  lots: LotStock[];
  suppliers: Supplier[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  lots,
  suppliers,
  onAddProduct,
  onUpdateProduct
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStorage, setSelectedStorage] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);

  // Calculate live available stock per product code
  const stockByProduct = useMemo(() => {
    const map: Record<string, { available: number; totalValue: number; lotsCount: number }> = {};
    lots.forEach(l => {
      if (l.status !== 'Périmé') {
        if (!map[l.productCode]) {
          map[l.productCode] = { available: 0, totalValue: 0, lotsCount: 0 };
        }
        map[l.productCode].available += l.availableQty;
        map[l.productCode].totalValue += l.availableQty * l.unitPrice;
        map[l.productCode].lotsCount += 1;
      }
    });
    return map;
  }, [lots]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.dci.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesStorage = selectedStorage === 'all' || p.storageCondition === selectedStorage;

      return matchesSearch && matchesCat && matchesStorage;
    });
  }, [products, searchQuery, selectedCategory, selectedStorage]);

  // Handle open modal for add or edit
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">
              Référentiel Central des Produits & Médicaments
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
              {filteredProducts.length} référence(s)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Base de données hospitalière unique : DCI, formes galéniques, seuils min/max, emplacements et conditions de conservation.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau Produit Hospitalier
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par Code, CIP13, DCI, Nom commercial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-teal-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs rounded-lg border-slate-200 bg-slate-50 px-3 py-2 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
          >
            <option value="all">Toutes Catégories</option>
            <option value="Médicament">Médicaments</option>
            <option value="Dispositif Médical Stérile">Dispositifs Médicaux Stériles</option>
            <option value="Soluté & Perfusion">Solutés & Perfusion</option>
            <option value="Stupéfiant & Assimilé">Stupéfiants (Sécurisés)</option>
            <option value="Antiseptique & Désinfectant">Antiseptiques</option>
          </select>

          <select
            value={selectedStorage}
            onChange={(e) => setSelectedStorage(e.target.value)}
            className="text-xs rounded-lg border-slate-200 bg-slate-50 px-3 py-2 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
          >
            <option value="all">Toutes Conservations</option>
            <option value="Température ambiante (15-25°C)">Température ambiante</option>
            <option value="Chaîne du froid (2-8°C)">Chaîne du froid (2-8°C)</option>
            <option value="Coffre sécurisé (Stupéfiants)">Coffre Stupéfiants</option>
            <option value="À l'abri de la lumière">À l'abri de la lumière</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code / CIP</th>
                <th className="py-3 px-4">Désignation & DCI</th>
                <th className="py-3 px-4">Catégorie & Classe</th>
                <th className="py-3 px-4">Forme & Dosage</th>
                <th className="py-3 px-4 text-center">Conservation</th>
                <th className="py-3 px-4 text-right">Stock Dispo</th>
                <th className="py-3 px-4 text-center">Seuils (Min/Max)</th>
                <th className="py-3 px-4 text-right">Prix Unitaire (DZD)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const stock = stockByProduct[p.code]?.available ?? 0;
                const isUnderMin = stock <= p.minStock && stock > 0;
                const isRupture = stock === 0;

                return (
                  <tr key={p.code} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code & Barcode */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-teal-700">{p.code}</div>
                      {p.barcode && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center">
                          <Tag className="w-2.5 h-2.5 mr-1" />
                          {p.barcode}
                        </div>
                      )}
                    </td>

                    {/* Designation & DCI */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-1">{p.designation}</div>
                      <div className="text-[11px] text-slate-500 italic">DCI : {p.dci}</div>
                      <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                        <span>Marque : {p.brandName}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                          {p.supplierId}
                        </span>
                      </div>
                    </td>

                    {/* Category & Therapeutic class */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mb-0.5 ${
                        p.category === 'Stupéfiant & Assimilé'
                          ? 'bg-purple-100 text-purple-800 font-bold'
                          : p.category === 'Dispositif Médical Stérile'
                          ? 'bg-blue-100 text-blue-800'
                          : p.category === 'Soluté & Perfusion'
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.category}
                      </span>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{p.therapeuticClass}</div>
                    </td>

                    {/* Form & Dosage */}
                    <td className="py-3 px-4">
                      <div className="text-slate-700 font-medium">{p.form}</div>
                      <div className="text-[10px] text-slate-400">{p.dosage} • {p.route}</div>
                    </td>

                    {/* Storage Condition */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {p.storageCondition === 'Chaîne du froid (2-8°C)' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800">
                          <ThermometerSnowflake className="w-3 h-3 mr-1 text-sky-600" />
                          2-8°C Froid
                        </span>
                      ) : p.storageCondition === 'Coffre sécurisé (Stupéfiants)' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                          <Lock className="w-3 h-3 mr-1 text-purple-600" />
                          Coffre-fort
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">15-25°C Ambiante</span>
                      )}
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{p.location}</div>
                    </td>

                    {/* Available Stock */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className={`font-extrabold text-sm ${
                        isRupture ? 'text-red-600' : isUnderMin ? 'text-amber-600' : 'text-slate-800'
                      }`}>
                        {stock} {p.unit}s
                      </div>
                      <div className="text-[10px]">
                        {isRupture ? (
                          <span className="text-red-600 font-bold bg-red-50 px-1 rounded">Rupture totale</span>
                        ) : isUnderMin ? (
                          <span className="text-amber-600 font-semibold bg-amber-50 px-1 rounded">Seuil critique</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Stock suffisant</span>
                        )}
                      </div>
                    </td>

                    {/* Min / Max / Security */}
                    <td className="py-3 px-4 text-center whitespace-nowrap text-[11px]">
                      <span className="text-slate-500">Min: <strong className="text-slate-700">{p.minStock}</strong></span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="text-slate-500">Max: <strong className="text-slate-700">{p.maxStock}</strong></span>
                      <div className="text-[10px] text-slate-400">Sécu: {p.securityStock}</div>
                    </td>

                    {/* Purchase Price */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-medium text-slate-800">
                      {formatDZD(p.purchasePrice)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setSelectedProductDetails(p)}
                          className="px-2 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                        >
                          Détails
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedProductDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-50 text-teal-800">
                  {selectedProductDetails.code}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-1">
                  {selectedProductDetails.designation}
                </h3>
                <p className="text-xs text-slate-500">
                  DCI : {selectedProductDetails.dci} • Nom commercial : {selectedProductDetails.brandName}
                </p>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Catégorie</span>
                <span className="font-semibold text-slate-800">{selectedProductDetails.category}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Classe thérapeutique</span>
                <span className="font-semibold text-slate-800">{selectedProductDetails.therapeuticClass}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Forme & Dosage</span>
                <span className="font-semibold text-slate-800">{selectedProductDetails.dosage} ({selectedProductDetails.form})</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Voie d'administration</span>
                <span className="font-semibold text-slate-800">{selectedProductDetails.route}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Conservation</span>
                <span className="font-semibold text-slate-800">{selectedProductDetails.storageCondition}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Emplacement physique</span>
                <span className="font-semibold text-slate-800">{selectedProductDetails.location}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Prix d'achat unitaire</span>
                <span className="font-semibold text-emerald-700">{formatDZD(selectedProductDetails.purchasePrice)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Seuils Min / Max</span>
                <span className="font-semibold text-slate-800">{selectedProductDetails.minStock} / {selectedProductDetails.maxStock} {selectedProductDetails.unit}s</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Fournisseur principal</span>
                <span className="font-semibold text-slate-800">{selectedProductDetails.supplier}</span>
              </div>
            </div>

            {/* Associated Lots */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-700 mb-2">Lots hospitaliers en stock pour cette référence :</h4>
              <div className="space-y-2">
                {lots.filter(l => l.productCode === selectedProductDetails.code).length > 0 ? (
                  lots.filter(l => l.productCode === selectedProductDetails.code).map(lot => (
                    <div key={lot.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-800 mr-2">Lot: {lot.lotNumber}</span>
                        <span className="text-slate-500">Exp: {lot.expiryDate}</span>
                        {lot.comments && <span className="text-[10px] text-teal-700 ml-2">({lot.comments})</span>}
                      </div>
                      <div className="font-bold text-slate-800">
                        {lot.availableQty} {selectedProductDetails.unit}s
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-red-500 italic">Aucun lot actif disponible.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <ProductFormModal
          isOpen={isModalOpen}
          initialData={editingProduct}
          suppliers={suppliers}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(p) => {
            if (editingProduct) {
              onUpdateProduct(p);
            } else {
              onAddProduct(p);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface ProductFormModalProps {
  isOpen: boolean;
  initialData: Product | null;
  suppliers: Supplier[];
  onClose: () => void;
  onSubmit: (p: Product) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  initialData,
  suppliers,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Product>(() => initialData || {
    code: `MED-${Math.floor(100 + Math.random() * 900)}`,
    barcode: '',
    designation: '',
    dci: '',
    brandName: '',
    dosage: '',
    form: 'Flacon injectable',
    packaging: 'Boîte de 10',
    unit: 'Flacon',
    category: 'Médicament',
    therapeuticClass: '',
    route: 'Intraveineuse (IV)',
    manufacturer: '',
    supplierId: suppliers[0]?.id || 'SUP-FK',
    supplier: suppliers[0]?.name || 'Fresenius Kabi France',
    purchasePrice: 1.50,
    minStock: 50,
    maxStock: 300,
    securityStock: 25,
    leadTimeDays: 4,
    location: 'Magasin Central - Allée A',
    storageCondition: 'Température ambiante (15-25°C)',
    isActive: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.designation) {
      alert('Veuillez renseigner le code et la désignation.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800">
            {initialData ? 'Modifier le Produit' : 'Créer une Nouvelle Référence Hospitalière'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Code Produit Unique</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Code-barres / CIP13</label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
                placeholder="Ex: 3400936087912"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              >
                <option value="Médicament">Médicament</option>
                <option value="Dispositif Médical Stérile">Dispositif Médical Stérile</option>
                <option value="DM Implantable">DM Implantable</option>
                <option value="Soluté & Perfusion">Soluté & Perfusion</option>
                <option value="Stupéfiant & Assimilé">Stupéfiant & Assimilé</option>
                <option value="Antiseptique & Désinfectant">Antiseptique & Désinfectant</option>
                <option value="Consommable de Soins">Consommable de Soins</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Désignation Complète</label>
            <input
              type="text"
              required
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              placeholder="Ex: Paracétamol injectable 10 mg/ml - Flacon 100 ml"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Dénomination Commune (DCI)</label>
              <input
                type="text"
                required
                value={formData.dci}
                onChange={(e) => setFormData({ ...formData, dci: e.target.value })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                placeholder="Ex: Paracétamol"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Nom Commercial</label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                placeholder="Ex: Perfalgan"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Dosage / Concentration</label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                placeholder="Ex: 10 mg/ml"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Forme Pharmaceutique</label>
              <input
                type="text"
                value={formData.form}
                onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Unité de Gestion</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              >
                <option value="Flacon">Flacon</option>
                <option value="Ampoule">Ampoule</option>
                <option value="Seringue">Seringue</option>
                <option value="Poche">Poche</option>
                <option value="Unité">Unité</option>
                <option value="Boîte">Boîte</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Conditions de Conservation</label>
              <select
                value={formData.storageCondition}
                onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value as StorageCondition })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              >
                <option value="Température ambiante (15-25°C)">Température ambiante (15-25°C)</option>
                <option value="Chaîne du froid (2-8°C)">Chaîne du froid (2-8°C)</option>
                <option value="Coffre sécurisé (Stupéfiants)">Coffre sécurisé (Stupéfiants)</option>
                <option value="À l'abri de la lumière">À l'abri de la lumière</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Emplacement de Stockage</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
                placeholder="Ex: Magasin Central - Allée B-04"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Fournisseur Rattaché (ID Fournisseur)</label>
              <select
                value={formData.supplierId}
                onChange={(e) => {
                  const sId = e.target.value;
                  const supp = suppliers.find(s => s.id === sId);
                  setFormData({
                    ...formData,
                    supplierId: sId,
                    supplier: supp?.name || formData.supplier,
                    leadTimeDays: supp?.averageLeadTimeDays || formData.leadTimeDays
                  });
                }}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-medium"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.id}] {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Fabricant / Laboratoire</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="Ex: Fresenius Kabi"
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Prix Achat (DZD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Stock Minimal</label>
              <input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Stock Maximal</label>
              <input
                type="number"
                value={formData.maxStock}
                onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Délai Appro (j)</label>
              <input
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
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
              Enregistrer la Référence
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

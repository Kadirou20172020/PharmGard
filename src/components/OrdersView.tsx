/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  SupplierOrder, 
  Product, 
  Supplier, 
  LotStock, 
  OrderStatus 
} from '../types/pharmacy';
import { formatDZD } from '../utils/currency';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Sparkles, 
  Truck, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X,
  FileCheck2
} from 'lucide-react';

interface OrdersViewProps {
  orders: SupplierOrder[];
  products: Product[];
  suppliers: Supplier[];
  lots: LotStock[];
  onAddOrder: (order: SupplierOrder) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  products,
  suppliers,
  lots,
  onAddOrder,
  onUpdateOrderStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SupplierOrder | null>(null);

  // Compute live available stock per product
  const stockByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    lots.forEach(l => {
      if (l.status !== 'Périmé') {
        map[l.productCode] = (map[l.productCode] || 0) + l.availableQty;
      }
    });
    return map;
  }, [lots]);

  // Products needing replenishment (available <= minStock)
  const productsNeedingReorder = useMemo(() => {
    return products.filter(p => {
      const currentStock = stockByProduct[p.code] || 0;
      return currentStock <= p.minStock && p.isActive;
    });
  }, [products, stockByProduct]);

  // Automatic Replenishment Generator
  const handleGenerateSmartOrders = () => {
    if (productsNeedingReorder.length === 0) {
      alert('Tous les produits sont actuellement au-dessus de leur seuil minimal de réapprovisionnement.');
      return;
    }

    // Group by supplier
    const grouped: Record<string, { product: Product; qtyToOrder: number }[]> = {};
    productsNeedingReorder.forEach(p => {
      const currentStock = stockByProduct[p.code] || 0;
      const qtyToOrder = Math.max(p.maxStock - currentStock, p.securityStock);
      if (!grouped[p.supplier]) grouped[p.supplier] = [];
      grouped[p.supplier].push({ product: p, qtyToOrder });
    });

    let createdCount = 0;
    Object.entries(grouped).forEach(([suppName, items]) => {
      const supp = suppliers.find(s => s.name === suppName);
      const orderDate = new Date().toISOString().split('T')[0];
      const leadDays = supp?.averageLeadTimeDays || 4;
      const deliveryDate = new Date(Date.now() + leadDays * 24 * 3600 * 1000).toISOString().split('T')[0];

      const orderItems = items.map(item => ({
        productCode: item.product.code,
        productDesignation: item.product.designation,
        quantityOrdered: item.qtyToOrder,
        quantityReceived: 0,
        unitPrice: item.product.purchasePrice,
        totalPrice: item.qtyToOrder * item.product.purchasePrice
      }));

      const totalAmount = orderItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

      const newOrder: SupplierOrder = {
        id: `ORD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        orderNumber: `BC-2026-${Math.floor(100 + Math.random() * 900)}`,
        orderDate,
        supplierId: supp?.id || 'SUP-FK',
        supplierName: suppName,
        supplierEmail: supp?.email || 'commandes@laboratoire.fr',
        supplierPhone: supp?.phone || '+33 1 00 00 00 00',
        expectedDeliveryDate: deliveryDate,
        items: orderItems,
        totalAmount,
        status: 'Transmise',
        notes: 'Commande automatique générée suite au franchissement du seuil minimal',
        createdBy: 'Système PharmaGarde'
      };

      onAddOrder(newOrder);
      createdCount++;
    });

    alert(`${createdCount} bon(s) de commande fournisseur généré(s) et transmis avec succès !`);
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some(i => i.productDesignation.toLowerCase().includes(searchQuery.toLowerCase()) || i.productCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-800">
              Commandes Fournisseurs & Approvisionnements
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">
              {orders.length} commande(s)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestion des bons de commande hospitaliers (BC), suivi des livraisons attendues et génération automatique des réassorts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {productsNeedingReorder.length > 0 && (
            <button
              onClick={handleGenerateSmartOrders}
              className="inline-flex items-center px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm transition-colors"
              title="Générer les commandes pour les produits sous le seuil minimal"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Réapprovisionner ({productsNeedingReorder.length} seuils min)
            </button>
          )}

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouveau Bon de Commande
          </button>
        </div>
      </div>

      {/* Low Stock Alert if any */}
      {productsNeedingReorder.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">
                {productsNeedingReorder.length} référence(s) hospitalière(s) sont sous le seuil minimal de stock
              </span>
              <p className="text-amber-700 text-[11px] mt-0.5">
                {productsNeedingReorder.map(p => `${p.code} (${stockByProduct[p.code] || 0} / Min: ${p.minStock})`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateSmartOrders}
            className="px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 text-xs whitespace-nowrap"
          >
            Commander en 1 clic
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par N° Bon de Commande, Fournisseur, Article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-teal-500 text-slate-800"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs rounded-lg border-slate-200 bg-slate-50 px-3 py-2 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
        >
          <option value="all">Tous Statuts</option>
          <option value="Transmise">Transmise (En attente)</option>
          <option value="Partiellement reçue">Partiellement reçue</option>
          <option value="Soldée">Soldée (Reçue à 100%)</option>
          <option value="Brouillon">Brouillon</option>
          <option value="Annulée">Annulée</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Commande & Date</th>
                <th className="py-3 px-4">Fournisseur & Contact</th>
                <th className="py-3 px-4">Articles Commandés</th>
                <th className="py-3 px-4 text-center">Livraison Estimée</th>
                <th className="py-3 px-4 text-right">Montant Total (DZD)</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-violet-700">{o.orderNumber}</span>
                    <div className="text-[10px] text-slate-400">{o.orderDate}</div>
                    <div className="text-[10px] text-slate-500">Par: {o.createdBy}</div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{o.supplierName}</div>
                    <div className="text-[10px] text-slate-400 flex items-center">
                      <Mail className="w-2.5 h-2.5 mr-1" />
                      {o.supplierEmail}
                    </div>
                  </td>

                  <td className="py-3 px-4 max-w-sm">
                    <div className="space-y-0.5">
                      {o.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                          <span className="font-medium truncate mr-2">• {i.productDesignation}</span>
                          <span className="font-mono font-bold text-slate-900 whitespace-nowrap">{i.quantityOrdered}x</span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="font-medium text-slate-800">{o.expectedDeliveryDate}</div>
                    <div className="text-[10px] text-slate-400">Délai estimé</div>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                    {formatDZD(o.totalAmount)}
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      o.status === 'Soldée'
                        ? 'bg-emerald-100 text-emerald-800'
                        : o.status === 'Transmise'
                        ? 'bg-amber-100 text-amber-800'
                        : o.status === 'Partiellement reçue'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {o.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => setSelectedOrderDetails(o)}
                        className="px-2 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                      >
                        Voir BC
                      </button>
                      {o.status === 'Transmise' && (
                        <button
                          onClick={() => onUpdateOrderStatus(o.id, 'Soldée')}
                          className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          title="Marquer comme reçue / soldée"
                        >
                          Solder
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BC Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono font-bold text-sm text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  {selectedOrderDetails.orderNumber}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  Bon de Commande Hospitalier
                </h3>
              </div>
              <button onClick={() => setSelectedOrderDetails(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Fournisseur</span>
                  <span className="font-bold text-slate-800">{selectedOrderDetails.supplierName}</span>
                  <div className="text-[10px] text-slate-500">{selectedOrderDetails.supplierEmail}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date d'émission</span>
                  <span className="font-semibold text-slate-800">{selectedOrderDetails.orderDate}</span>
                  <div className="text-[10px] text-teal-700 font-medium">Livraison prévue : {selectedOrderDetails.expectedDeliveryDate}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-2">Détail des articles commandés :</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedOrderDetails.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{it.productDesignation}</div>
                        <div className="text-[10px] text-slate-400">{it.productCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold">{it.quantityOrdered}x @ {formatDZD(it.unitPrice)}</div>
                        <div className="text-[10px] font-bold text-emerald-700">{formatDZD(it.totalPrice)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl border border-teal-100">
                <span className="font-bold text-teal-900">Total Commande HT :</span>
                <span className="font-mono font-extrabold text-base text-teal-900">
                  {formatDZD(selectedOrderDetails.totalAmount)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual New Order Modal */}
      {isManualModalOpen && (
        <ManualOrderModal
          products={products}
          suppliers={suppliers}
          onClose={() => setIsManualModalOpen(false)}
          onSubmit={(newOrd) => {
            onAddOrder(newOrd);
            setIsManualModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface ManualOrderModalProps {
  products: Product[];
  suppliers: Supplier[];
  onClose: () => void;
  onSubmit: (o: SupplierOrder) => void;
}

const ManualOrderModal: React.FC<ManualOrderModalProps> = ({
  products,
  suppliers,
  onClose,
  onSubmit
}) => {
  const [supplierName, setSupplierName] = useState(suppliers[0]?.name || '');
  const [selectedProductCode, setSelectedProductCode] = useState(products[0]?.code || '');
  const [quantity, setQuantity] = useState(100);
  const [expectedDate, setExpectedDate] = useState('2026-11-02');
  const [notes, setNotes] = useState('Commande directe pharmacien');

  const selectedSupplier = suppliers.find(s => s.name === supplierName);
  const selectedProduct = products.find(p => p.code === selectedProductCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const totalPrice = quantity * selectedProduct.purchasePrice;

    const newOrder: SupplierOrder = {
      id: `ORD-${Date.now()}`,
      orderNumber: `BC-2026-${Math.floor(100 + Math.random() * 900)}`,
      orderDate: new Date().toISOString().split('T')[0],
      supplierId: selectedSupplier?.id || 'SUP-FK',
      supplierName,
      supplierEmail: selectedSupplier?.email || 'commandes@fournisseur.fr',
      supplierPhone: selectedSupplier?.phone || '+33 1 00 00 00 00',
      expectedDeliveryDate: expectedDate,
      items: [
        {
          productCode: selectedProduct.code,
          productDesignation: selectedProduct.designation,
          quantityOrdered: quantity,
          quantityReceived: 0,
          unitPrice: selectedProduct.purchasePrice,
          totalPrice
        }
      ],
      totalAmount: totalPrice,
      status: 'Transmise',
      notes,
      createdBy: 'Dr. Hélène Mercier (Pharmacien)'
    };

    onSubmit(newOrder);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800">
            Nouveau Bon de Commande Fournisseur
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Fournisseur</label>
            <select
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Article à Commander</label>
            <select
              value={selectedProductCode}
              onChange={(e) => setSelectedProductCode(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
            >
              {products.map(p => (
                <option key={p.code} value={p.code}>
                  {p.code} - {p.designation} ({formatDZD(p.purchasePrice)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Quantité à Commander</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Date Livraison Estimée</label>
              <input
                type="date"
                required
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Commentaires / Références Marché</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              Émettre le Bon de Commande
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

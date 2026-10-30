/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  Product, 
  LotStock, 
  ReceptionEntry, 
  ExitRecord, 
  SupplierOrder, 
  HospitalDepartment, 
  Supplier,
  DashboardFilter
} from '../types/pharmacy';
import { MONTHLY_TRENDS } from '../data/mockPharmacyData';
import { formatDZD } from '../utils/currency';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  Package, 
  Activity, 
  ArrowDownRight, 
  ArrowUpRight, 
  Layers, 
  Building, 
  Filter,
  BarChart3,
  PieChart as PieIcon,
  ChevronRight,
  ShieldCheck,
  AlertOctagon,
  Calendar,
  Camera
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface DashboardViewProps {
  products: Product[];
  lots: LotStock[];
  receptions: ReceptionEntry[];
  exits: ExitRecord[];
  orders: SupplierOrder[];
  departments: HospitalDepartment[];
  suppliers: Supplier[];
  onNavigateToTab: (tab: any) => void;
  onOpenScanner?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  lots,
  receptions,
  exits,
  orders,
  departments,
  suppliers,
  onNavigateToTab,
  onOpenScanner
}) => {
  // Global interactive filters
  const [filters, setFilters] = useState<DashboardFilter>({
    period: 'all',
    category: 'all',
    department: 'all',
    location: 'all',
    supplier: 'all',
    alertLevel: 'all'
  });

  // Calculate current date reference
  const now = new Date('2026-10-26T13:49:27'); // reference date

  // 1. Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (filters.category !== 'all' && p.category !== filters.category) return false;
      if (filters.supplier !== 'all' && p.supplier !== filters.supplier) return false;
      if (filters.location !== 'all' && !p.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      return true;
    });
  }, [products, filters]);

  // 2. Filtered lots
  const filteredLots = useMemo(() => {
    return lots.filter(l => {
      // Find associated product
      const prod = products.find(p => p.code === l.productCode);
      if (!prod) return false;

      if (filters.category !== 'all' && prod.category !== filters.category) return false;
      if (filters.supplier !== 'all' && l.supplier !== filters.supplier) return false;
      if (filters.location !== 'all' && !l.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      
      // Alert level filter
      if (filters.alertLevel !== 'all') {
        const expDate = new Date(l.expiryDate);
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (filters.alertLevel === 'perime' && diffDays >= 0) return false;
        if (filters.alertLevel === 'expire_30' && (diffDays < 0 || diffDays > 30)) return false;
        if (filters.alertLevel === 'expire_60' && (diffDays <= 30 || diffDays > 60)) return false;
        if (filters.alertLevel === 'expire_90' && (diffDays <= 60 || diffDays > 90)) return false;
      }
      return true;
    });
  }, [lots, products, filters, now]);

  // 3. Filtered exits
  const filteredExits = useMemo(() => {
    return exits.filter(e => {
      if (filters.department !== 'all' && e.hospitalDepartment !== filters.department) return false;
      const prod = products.find(p => p.code === e.productCode);
      if (filters.category !== 'all' && prod && prod.category !== filters.category) return false;
      return true;
    });
  }, [exits, products, filters]);

  // --- CALCULATION OF THE 12 HOSPITAL KPIS ---

  // 1. Total Active References
  const totalActiveRefs = useMemo(() => {
    return filteredProducts.filter(p => p.isActive).length;
  }, [filteredProducts]);

  // 2. Total units in stock & by unit breakdown
  const { totalUnits, unitsBreakdown } = useMemo(() => {
    let sum = 0;
    const breakdown: Record<string, number> = {};
    filteredLots.forEach(l => {
      sum += l.availableQty;
      const prod = products.find(p => p.code === l.productCode);
      const unit = prod?.unit || 'Unité';
      breakdown[unit] = (breakdown[unit] || 0) + l.availableQty;
    });
    return { totalUnits: sum, unitsBreakdown: breakdown };
  }, [filteredLots, products]);

  // 3. Total stock purchase value (DZD)
  const totalStockValue = useMemo(() => {
    return filteredLots.reduce((acc, l) => acc + (l.availableQty * l.unitPrice), 0);
  }, [filteredLots]);

  // 4 & 5. Ruptures & Sous seuil minimal
  const { stockRuptures, stockUnderMin } = useMemo(() => {
    // Sum stock available per product
    const availableMap: Record<string, number> = {};
    lots.forEach(l => {
      if (l.status !== 'Périmé') {
        availableMap[l.productCode] = (availableMap[l.productCode] || 0) + l.availableQty;
      }
    });

    let ruptures = 0;
    let underMin = 0;

    filteredProducts.forEach(p => {
      const avail = availableMap[p.code] || 0;
      if (avail === 0) {
        ruptures++;
      } else if (avail <= p.minStock) {
        underMin++;
      }
    });

    return { stockRuptures: ruptures, stockUnderMin: underMin };
  }, [filteredProducts, lots]);

  // 6 & 7. Expiry tranches (<30j, 31-60j, 61-90j, and périmés)
  const expiryStats = useMemo(() => {
    let expired = 0;
    let under30 = 0;
    let under60 = 0;
    let under90 = 0;
    let safeOver90 = 0;

    filteredLots.forEach(l => {
      if (l.availableQty > 0) {
        const expDate = new Date(l.expiryDate);
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0 || l.status === 'Périmé') {
          expired++;
        } else if (diffDays <= 30) {
          under30++;
        } else if (diffDays <= 60) {
          under60++;
        } else if (diffDays <= 90) {
          under90++;
        } else {
          safeOver90++;
        }
      }
    });

    return { expired, under30, under60, under90, safeOver90 };
  }, [filteredLots, now]);

  // 8. Pending orders
  const pendingOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Transmise' || o.status === 'Partiellement reçue').length;
  }, [orders]);

  // 9. Receptions of the month
  const currentMonthReceptions = useMemo(() => {
    const monthPrefix = '2026-10';
    const monthRecs = receptions.filter(r => r.receptionDate.startsWith(monthPrefix));
    const qty = monthRecs.reduce((sum, r) => sum + r.quantityReceived, 0);
    const val = monthRecs.reduce((sum, r) => sum + r.totalAmount, 0);
    return { count: monthRecs.length, qty, val };
  }, [receptions]);

  // 10. Exits of the month & 11. Monthly consumption value
  const currentMonthExits = useMemo(() => {
    const monthPrefix = '2026-10';
    const monthEx = filteredExits.filter(e => e.exitDate.startsWith(monthPrefix));
    const qty = monthEx.reduce((sum, e) => sum + e.quantityExited, 0);
    const val = monthEx.reduce((sum, e) => sum + e.totalCost, 0);
    return { count: monthEx.length, qty, val };
  }, [filteredExits]);

  // 12. Global availability rate & Dormant products
  const availabilityRate = useMemo(() => {
    if (filteredProducts.length === 0) return 100;
    const availableCount = filteredProducts.length - stockRuptures;
    return Math.round((availableCount / filteredProducts.length) * 1000) / 10;
  }, [filteredProducts, stockRuptures]);

  const dormantProducts = useMemo(() => {
    // Products with no exit in the current exit list
    const productCodesWithExits = new Set(exits.map(e => e.productCode));
    return filteredProducts.filter(p => !productCodesWithExits.has(p.code)).length;
  }, [filteredProducts, exits]);

  // --- CHART 1: Stock Value by Category ---
  const stockByCategory = useMemo(() => {
    const map: Record<string, { value: number; count: number }> = {};
    filteredLots.forEach(l => {
      const prod = products.find(p => p.code === l.productCode);
      const cat = prod?.category || 'Autre';
      if (!map[cat]) map[cat] = { value: 0, count: 0 };
      map[cat].value += l.availableQty * l.unitPrice;
      map[cat].count += l.availableQty;
    });

    const totalVal = Object.values(map).reduce((acc, curr) => acc + curr.value, 0) || 1;
    return Object.entries(map).map(([category, info]) => ({
      category,
      value: Math.round(info.value * 100) / 100,
      percentage: Math.round((info.value / totalVal) * 100)
    })).sort((a, b) => b.value - a.value);
  }, [filteredLots, products]);

  // --- CHART 2: Consumptions by Hospital Department ---
  const consumptionByDepartment = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExits.forEach(e => {
      map[e.hospitalDepartment] = (map[e.hospitalDepartment] || 0) + e.totalCost;
    });

    return Object.entries(map)
      .map(([dept, cost]) => ({
        department: dept,
        cost: Math.round(cost * 100) / 100
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [filteredExits]);

  // --- CHART 3: Top 10 Most Consumed Products ---
  const topConsumedProducts = useMemo(() => {
    const map: Record<string, { code: string; name: string; qty: number; cost: number; unit: string }> = {};
    filteredExits.forEach(e => {
      if (!map[e.productCode]) {
        map[e.productCode] = {
          code: e.productCode,
          name: e.productDesignation,
          qty: 0,
          cost: 0,
          unit: e.unit
        };
      }
      map[e.productCode].qty += e.quantityExited;
      map[e.productCode].cost += e.totalCost;
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [filteredExits]);

  // --- CHART 4: Top 10 Highest Stock Value ---
  const topStockValueProducts = useMemo(() => {
    const map: Record<string, { code: string; name: string; value: number; qty: number; unit: string }> = {};
    filteredLots.forEach(l => {
      if (!map[l.productCode]) {
        const prod = products.find(p => p.code === l.productCode);
        map[l.productCode] = {
          code: l.productCode,
          name: l.productDesignation,
          value: 0,
          qty: 0,
          unit: prod?.unit || 'Unité'
        };
      }
      map[l.productCode].value += l.availableQty * l.unitPrice;
      map[l.productCode].qty += l.availableQty;
    });

    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredLots, products]);

  // Unique categories & locations for filters
  const uniqueCategories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);
  const uniqueLocations = useMemo(() => [
    'Magasin Central',
    'Chambre Froide PUI 2-8°C',
    'Coffre-fort Stupéfiants',
    'Magasin Stérile',
    'Zone Solutés Palettes'
  ], []);

  return (
    <div className="space-y-6 pb-12">
      {/* Android Mobile Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* 1. Header & Quick Context Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 rounded-2xl border border-slate-700/60 shadow-lg text-white">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Pharmacie à Usage Intérieur (PUI)
            </span>
            <span className="text-xs text-slate-400 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Semaine 44 - Exercice 2026
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Tableau de Bord Stratégique & Opérationnel
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Surveillance en temps réel des stocks, traçabilité FEFO, péremptions critiques et consommations des services.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick Scanner Action */}
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-teal-500/20 border border-teal-400/40 transition-all transform active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Scanner un BL</span>
            </button>
          )}

          {/* Global Stock Health Pill */}
          <div className="flex items-center space-x-3 bg-slate-800/90 p-3 rounded-xl border border-slate-700">
            <div className={`p-2.5 rounded-lg ${stockRuptures > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Taux de Disponibilité</div>
              <div className="text-xl font-extrabold text-white">
                {availabilityRate}%
              </div>
              <div className="text-[10px] text-slate-400">
                {stockRuptures === 0 ? 'Aucune rupture critique' : `${stockRuptures} référence(s) en rupture`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Filters Bar (FEUILLE 1 - C) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-slate-700 font-semibold text-sm">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>Filtres Interactifs Dynamiques</span>
          </div>
          {(filters.category !== 'all' || filters.department !== 'all' || filters.location !== 'all' || filters.supplier !== 'all' || filters.alertLevel !== 'all') && (
            <button
              onClick={() => setFilters({
                period: 'all',
                category: 'all',
                department: 'all',
                location: 'all',
                supplier: 'all',
                alertLevel: 'all'
              })}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Période */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Période</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 px-2.5 py-1.5 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
            >
              <option value="all">Toutes périodes</option>
              <option value="month">Mois en cours (Octobre)</option>
              <option value="quarter">4e Trimestre</option>
              <option value="year">Année 2026</option>
            </select>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Catégorie</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 px-2.5 py-1.5 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
            >
              <option value="all">Toutes catégories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Service Hospitalier */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Service hospitalier</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 px-2.5 py-1.5 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
            >
              <option value="all">Tous les services</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Magasin ou emplacement */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Emplacement / Magasin</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 px-2.5 py-1.5 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
            >
              <option value="all">Tous les magasins</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Fournisseur</label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 px-2.5 py-1.5 focus:border-teal-500 focus:ring-teal-500 text-slate-700"
            >
              <option value="all">Tous fournisseurs</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Niveau d'alerte */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Niveau d'alerte</label>
            <select
              value={filters.alertLevel}
              onChange={(e) => setFilters({ ...filters, alertLevel: e.target.value as any })}
              className="w-full text-xs rounded-lg border-slate-200 bg-slate-50 px-2.5 py-1.5 focus:border-teal-500 focus:ring-teal-500 text-slate-700 font-medium"
            >
              <option value="all">Tous niveaux</option>
              <option value="perime">❌ Périmés uniquement</option>
              <option value="expire_30">⚠️ Péremption &lt; 30 jours</option>
              <option value="expire_60">🟡 Péremption 31-60 jours</option>
              <option value="expire_90">🔵 Péremption 61-90 jours</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Automatic Real-Time Alert Center (Under min stock & Expiry <= 30 days) */}
      {(expiryStats.expired > 0 || expiryStats.under30 > 0 || stockUnderMin > 0 || stockRuptures > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-rose-600 text-white rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Alertes Automatiques de Pharmacie Hospitalière (Synchronisées Google Sheets)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Déclenchées automatiquement lorsque Stock Dispo &lt; Stock Minimal ou Péremption &le; 30 Jours
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('alerts')}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
            >
              <span>Centre de Vigilance Complet</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Alert Category 1: Stock < Stock Minimal */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Alerte Réapprovisionnement : Stock &lt; Seuil Minimal</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900">
                  {stockUnderMin + stockRuptures} produit(s)
                </span>
              </div>
              <p className="text-[11px] text-amber-700">
                Seuil de commande franchi d'après la colonne « Stock minimal » de la feuille RÉFÉRENTIEL PRODUITS :
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {products
                  .filter(p => {
                    const avail = lots
                      .filter(l => l.productCode === p.code && l.status !== 'Périmé')
                      .reduce((sum, l) => sum + l.availableQty, 0);
                    return avail <= p.minStock;
                  })
                  .map(p => {
                    const avail = lots
                      .filter(l => l.productCode === p.code && l.status !== 'Périmé')
                      .reduce((sum, l) => sum + l.availableQty, 0);
                    const isZero = avail === 0;

                    return (
                      <div key={p.code} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200/60 text-xs shadow-xs">
                        <div>
                          <span className="font-mono font-bold text-slate-800 mr-1.5">{p.code}</span>
                          <span className="text-slate-700 line-clamp-1">{p.designation}</span>
                          <span className="text-[10px] text-slate-400">Fournisseur : {p.supplierId} ({p.supplier})</span>
                        </div>
                        <div className="text-right whitespace-nowrap pl-2">
                          <span className={`font-mono font-extrabold text-xs block ${isZero ? 'text-red-600' : 'text-amber-700'}`}>
                            {avail} / {p.minStock} {p.unit}s
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {isZero ? 'Rupture' : 'Sous seuil'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Alert Category 2: Expiry within 30 days & expired */}
            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-900 font-bold text-xs">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>Alerte Péremption : Lots &le; 30 Jours & Périmés</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-900">
                  {expiryStats.expired + expiryStats.under30} lot(s)
                </span>
              </div>
              <p className="text-[11px] text-rose-700">
                Lots à évincer ou délivrer en priorité absolue FEFO d'après la feuille STOCKS ET LOTS :
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {lots
                  .filter(l => {
                    if (l.availableQty <= 0) return false;
                    const diffDays = Math.ceil((new Date(l.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
                    return diffDays <= 30 || l.status === 'Périmé';
                  })
                  .map(l => {
                    const diffDays = Math.ceil((new Date(l.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
                    const isExp = diffDays < 0 || l.status === 'Périmé';

                    return (
                      <div key={l.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-rose-200/60 text-xs shadow-xs">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-slate-800">{l.lotNumber}</span>
                            <span className="text-slate-500 text-[10px]">({l.productCode})</span>
                            <span className="text-[10px] text-teal-700 font-medium">[{l.supplierId}]</span>
                          </div>
                          <span className="text-slate-600 line-clamp-1 text-[11px]">{l.productDesignation}</span>
                        </div>
                        <div className="text-right whitespace-nowrap pl-2">
                          <span className={`font-bold text-[11px] block ${isExp ? 'text-red-700' : 'text-amber-800'}`}>
                            {isExp ? `PÉRIMÉ (${Math.abs(diffDays)}j)` : `J-${diffDays}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {l.availableQty} dispo ({l.expiryDate})
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. THE 12 HOSPITAL KPIS (FEUILLE 1 - A) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* KPI 1: Références actives */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Références Actives</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{totalActiveRefs}</span>
            <span className="text-[10px] text-slate-400 font-medium">Médicaments & DM</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            100% enregistrés
          </div>
        </div>

        {/* KPI 2: Total Unités en stock (avec détail par unité) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Unités Physiques</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{totalUnits.toLocaleString('fr-FR')}</span>
            <span className="text-[10px] text-slate-400 font-medium">Unités totales</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 truncate" title={Object.entries(unitsBreakdown).map(([u, q]) => `${q} ${u}s`).join(', ')}>
            {Object.entries(unitsBreakdown).slice(0, 3).map(([u, q]) => `${q} ${u}s`).join(' • ')}
          </div>
        </div>

        {/* KPI 3: Valeur totale du stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Valeur Totale Stock</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">
              {formatDZD(totalStockValue)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Prix d'achat</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center">
            <Building className="w-3 h-3 mr-1 text-slate-400" />
            Immobilisation active
          </div>
        </div>

        {/* KPI 4: Références en rupture */}
        <div className={`p-4 rounded-xl border shadow-sm transition-shadow ${
          stockRuptures > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${stockRuptures > 0 ? 'text-red-700' : 'text-slate-500'}`}>
              Ruptures de Stock
            </span>
            <div className={`p-2 rounded-lg ${stockRuptures > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-bold ${stockRuptures > 0 ? 'text-red-700' : 'text-slate-800'}`}>
              {stockRuptures}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Stock = 0</span>
          </div>
          <div className={`mt-1 text-[11px] font-medium ${stockRuptures > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {stockRuptures > 0 ? 'Réassort d\'urgence requis' : 'Aucune rupture'}
          </div>
        </div>

        {/* KPI 5: Références sous seuil minimal */}
        <div className={`p-4 rounded-xl border shadow-sm transition-shadow ${
          stockUnderMin > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${stockUnderMin > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
              Sous Seuil Minimal
            </span>
            <div className={`p-2 rounded-lg ${stockUnderMin > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-bold ${stockUnderMin > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {stockUnderMin}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">À commander</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-600 font-medium">
            Seuil de réapprovisionnement
          </div>
        </div>

        {/* KPI 6: Lots proches péremption (30, 60, 90j) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Péremptions Prévues</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">
              {expiryStats.under30 + expiryStats.under60 + expiryStats.under90}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Lots &lt; 90 jours</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-600 font-medium flex items-center space-x-1">
            <span className="text-red-600 font-bold">{expiryStats.under30} &lt;30j</span>
            <span>•</span>
            <span className="text-amber-600">{expiryStats.under60} 60j</span>
            <span>•</span>
            <span className="text-blue-600">{expiryStats.under90} 90j</span>
          </div>
        </div>

        {/* KPI 7: Lots déjà périmés */}
        <div className={`p-4 rounded-xl border shadow-sm transition-shadow ${
          expiryStats.expired > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${expiryStats.expired > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              Lots Déjà Périmés
            </span>
            <div className={`p-2 rounded-lg ${expiryStats.expired > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-bold ${expiryStats.expired > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
              {expiryStats.expired}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">À mettre au rebut</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-rose-600">
            {expiryStats.expired > 0 ? 'Quarantaine obligatoire' : 'Aucun produit périmé'}
          </div>
        </div>

        {/* KPI 8: Commandes en attente */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Commandes en Cours</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{pendingOrdersCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">Fournisseurs</span>
          </div>
          <div className="mt-1 text-[11px] text-violet-600 font-medium">
            En attente de livraison BL
          </div>
        </div>

        {/* KPI 9: Entrées du mois */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Entrées du Mois</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">
              {currentMonthReceptions.qty.toLocaleString('fr-FR')}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {currentMonthReceptions.count} réceptions
            </span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium">
            Valeur : {formatDZD(currentMonthReceptions.val, { decimals: 0 })}
          </div>
        </div>

        {/* KPI 10: Sorties du mois */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sorties du Mois</span>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">
              {currentMonthExits.qty.toLocaleString('fr-FR')}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {currentMonthExits.count} dispensations
            </span>
          </div>
          <div className="mt-1 text-[11px] text-cyan-700 font-medium">
            Délivrances services
          </div>
        </div>

        {/* KPI 11: Valeur des consommations mensuelles */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Coût Consommations</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">
              {formatDZD(currentMonthExits.val)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Octobre 2026</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Imputation budgétaire
          </div>
        </div>

        {/* KPI 12: Produits sans mouvement (dormants > 60j) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Stock Sans Mouvement</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{dormantProducts}</span>
            <span className="text-[10px] text-slate-400 font-medium">Références</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Dormants (&gt; 60 jours)
          </div>
        </div>
      </div>

      {/* 5. DYNAMIC CHARTS & VISUALIZATIONS (FEUILLE 1 - B) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Évolution mensuelle Entrées vs Sorties (12 derniers mois) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-teal-600" />
                Évolution Mensuelle : Entrées vs Sorties (12 Mois)
              </h3>
              <p className="text-xs text-slate-400">Flux logistique hospitalier en volume (unités délivrées)</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-teal-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 mr-1.5"></span>
                Entrées (BL)
              </span>
              <span className="flex items-center text-rose-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 mr-1.5"></span>
                Sorties (Services)
              </span>
            </div>
          </div>

          {/* SVG Bar Chart with values */}
          <div className="h-64 flex items-end justify-between pt-6 px-2 gap-2">
            {MONTHLY_TRENDS.map((item, idx) => {
              const maxVal = 2600;
              const hEntree = (item.entreesQty / maxVal) * 100;
              const hSortie = (item.sortiesQty / maxVal) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute -top-12 bg-slate-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-xl">
                    <p className="font-bold">{item.month}</p>
                    <p className="text-teal-300">Entrées: {item.entreesQty} u ({formatDZD(item.entreesValue, { decimals: 0 })})</p>
                    <p className="text-rose-300">Sorties: {item.sortiesQty} u ({formatDZD(item.sortiesValue, { decimals: 0 })})</p>
                  </div>

                  {/* Bars Container */}
                  <div className="w-full flex items-end justify-center gap-1 h-48">
                    <div
                      style={{ height: `${hEntree}%` }}
                      className="w-1/2 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-sm transition-all duration-300 hover:brightness-110"
                    />
                    <div
                      style={{ height: `${hSortie}%` }}
                      className="w-1/2 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-sm transition-all duration-300 hover:brightness-110"
                    />
                  </div>
                  {/* Month Label */}
                  <span className="text-[10px] font-medium text-slate-500 mt-2 block rotate-0 truncate text-center w-full">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Valeur du stock par catégorie (Donut & Breakdown) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center">
                  <PieIcon className="w-4 h-4 mr-2 text-teal-600" />
                  Valeur du Stock par Catégorie Pharmaceutique
                </h3>
                <p className="text-xs text-slate-400">Répartition financière des capitaux immobilisés</p>
              </div>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                {formatDZD(totalStockValue, { decimals: 0 })}
              </span>
            </div>

            <div className="space-y-3 mt-2">
              {stockByCategory.map((item, idx) => {
                const colors = [
                  'bg-teal-500',
                  'bg-cyan-500',
                  'bg-indigo-500',
                  'bg-emerald-500',
                  'bg-amber-500',
                  'bg-rose-500',
                  'bg-violet-500'
                ];
                const color = colors[idx % colors.length];

                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 flex items-center">
                        <span className={`w-2 h-2 rounded-full ${color} mr-2`}></span>
                        {item.category}
                      </span>
                      <span className="text-slate-500">
                        <span className="font-bold text-slate-800">{formatDZD(item.value, { decimals: 0 })}</span> ({item.percentage}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(item.percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Données synchronisées avec le référentiel</span>
            <button
              onClick={() => onNavigateToTab('products')}
              className="text-teal-600 hover:text-teal-800 font-semibold flex items-center"
            >
              Voir le catalogue
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>

        {/* CHART 3: Répartition des consommations par service hospitalier */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <Building className="w-4 h-4 mr-2 text-teal-600" />
                Dépenses & Consommations par Service Hospitalier
              </h3>
              <p className="text-xs text-slate-400">Imputation budgétaire des médicaments délivrés</p>
            </div>
          </div>

          <div className="space-y-3.5">
            {consumptionByDepartment.length > 0 ? (
              consumptionByDepartment.map((dept, idx) => {
                const maxCost = consumptionByDepartment[0]?.cost || 1;
                const widthPercent = (dept.cost / maxCost) * 100;
                const departmentInfo = departments.find(d => d.name === dept.department);

                return (
                  <div key={dept.department} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 flex items-center">
                        <span
                          className="w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: departmentInfo?.color || '#0d9488' }}
                        />
                        {dept.department}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatDZD(dept.cost)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(widthPercent, 5)}%`,
                          backgroundColor: departmentInfo?.color || '#0d9488'
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Aucune consommation pour les filtres sélectionnés</p>
            )}
          </div>
        </div>

        {/* CHART 4: Tranches de péremption (Alertes Sanitarires) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-teal-600" />
                  Lots par Tranche de Délai de Péremption
                </h3>
                <p className="text-xs text-slate-400">Prévention du gaspillage & application stricte du FEFO</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Périmé */}
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-center justify-between text-xs text-red-700 font-semibold">
                  <span>Périmés</span>
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-2xl font-black text-red-800 mt-1">{expiryStats.expired} lot(s)</div>
                <p className="text-[10px] text-red-600 mt-0.5">Destruction & mise en quarantaine</p>
              </div>

              {/* < 30 jours */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
                  <span>&lt; 30 Jours</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-800 mt-1">{expiryStats.under30} lot(s)</div>
                <p className="text-[10px] text-amber-700 mt-0.5">Dispensation prioritaire FEFO</p>
              </div>

              {/* 31 - 60 jours */}
              <div className="p-3.5 rounded-xl bg-yellow-50 border border-yellow-200">
                <div className="flex items-center justify-between text-xs text-yellow-800 font-semibold">
                  <span>31 - 60 Jours</span>
                  <Activity className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="text-2xl font-black text-yellow-800 mt-1">{expiryStats.under60} lot(s)</div>
                <p className="text-[10px] text-yellow-700 mt-0.5">Surveillance rotation</p>
              </div>

              {/* 61 - 90 jours */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-between text-xs text-blue-800 font-semibold">
                  <span>61 - 90 Jours</span>
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-800 mt-1">{expiryStats.under90} lot(s)</div>
                <p className="text-[10px] text-blue-600 mt-0.5">Anticipation réapprovisionnement</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total lots sains (&gt;90j) : <strong className="text-emerald-700">{expiryStats.safeOver90} lots</strong>
            </span>
            <button
              onClick={() => onNavigateToTab('lots')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center"
            >
              Gérer les lots
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>

        {/* CHART 5: Top 10 Most Consumed Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-teal-600" />
                Top 10 : Produits les Plus Consommés
              </h3>
              <p className="text-xs text-slate-400">Classés par volume délivré aux services</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="py-2 px-3 rounded-l-lg">Rang</th>
                  <th className="py-2 px-3">Produit & DCI</th>
                  <th className="py-2 px-3 text-right">Quantité</th>
                  <th className="py-2 px-3 text-right rounded-r-lg">Montant Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topConsumedProducts.map((p, idx) => (
                  <tr key={p.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800 line-clamp-1">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-teal-700 whitespace-nowrap">
                      {p.qty} {p.unit}s
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                      {formatDZD(p.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CHART 6: Top 10 Highest Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-teal-600" />
                Top 10 : Produits à Valeur de Stock Élevée
              </h3>
              <p className="text-xs text-slate-400">Immobilisation financière prioritaire</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="py-2 px-3 rounded-l-lg">Rang</th>
                  <th className="py-2 px-3">Produit & DCI</th>
                  <th className="py-2 px-3 text-right">En Stock</th>
                  <th className="py-2 px-3 text-right rounded-r-lg">Valeur (DZD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topStockValueProducts.map((p, idx) => (
                  <tr key={p.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800 line-clamp-1">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                      {p.qty} {p.unit}s
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      {formatDZD(p.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

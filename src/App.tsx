/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './services/firebaseAuth';
import { 
  createHospitalPharmacySpreadsheet, 
  populatePharmacyData 
} from './services/googleSheetsApi';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_LOTS, 
  INITIAL_RECEPTIONS, 
  INITIAL_EXITS, 
  INITIAL_ORDERS, 
  INITIAL_DEPARTMENTS, 
  INITIAL_SUPPLIERS 
} from './data/mockPharmacyData';
import { 
  Product, 
  LotStock, 
  ReceptionEntry, 
  ExitRecord, 
  SupplierOrder, 
  Supplier,
  LotStatus, 
  OrderStatus 
} from './types/pharmacy';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { StocksLotsView } from './components/StocksLotsView';
import { ReceptionsView } from './components/ReceptionsView';
import { ExitsView } from './components/ExitsView';
import { OrdersView } from './components/OrdersView';
import { AlertsView } from './components/AlertsView';
import { SuppliersView } from './components/SuppliersView';
import { GoogleSheetsIntegrationView } from './components/GoogleSheetsIntegrationView';
import { DeliveryNoteScannerModal } from './components/DeliveryNoteScannerModal';
import { 
  CheckCircle, 
  ExternalLink, 
  AlertCircle, 
  X, 
  Sparkles, 
  RefreshCw,
  Camera 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Application Data States
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pharmagarde_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [lots, setLots] = useState<LotStock[]>(() => {
    const saved = localStorage.getItem('pharmagarde_lots');
    return saved ? JSON.parse(saved) : INITIAL_LOTS;
  });

  const [receptions, setReceptions] = useState<ReceptionEntry[]>(() => {
    const saved = localStorage.getItem('pharmagarde_receptions');
    return saved ? JSON.parse(saved) : INITIAL_RECEPTIONS;
  });

  const [exits, setExits] = useState<ExitRecord[]>(() => {
    const saved = localStorage.getItem('pharmagarde_exits');
    return saved ? JSON.parse(saved) : INITIAL_EXITS;
  });

  const [orders, setOrders] = useState<SupplierOrder[]>(() => {
    const saved = localStorage.getItem('pharmagarde_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('pharmagarde_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [departments] = useState(INITIAL_DEPARTMENTS);

  // Authentication & Google Sheets states
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('pharmagarde_sheet_id') || null;
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('pharmagarde_sheet_url') || null;
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('pharmagarde_last_synced') || null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Success toast message
  const [notification, setNotification] = useState<{ message: string; url?: string } | null>(null);

  // Local persistence
  useEffect(() => {
    localStorage.setItem('pharmagarde_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pharmagarde_lots', JSON.stringify(lots));
  }, [lots]);

  useEffect(() => {
    localStorage.setItem('pharmagarde_receptions', JSON.stringify(receptions));
  }, [receptions]);

  useEffect(() => {
    localStorage.setItem('pharmagarde_exits', JSON.stringify(exits));
  }, [exits]);

  useEffect(() => {
    localStorage.setItem('pharmagarde_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('pharmagarde_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Login handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setNotification({
          message: `Connexion réussie avec ${res.user.email} ! Votre compte est prêt pour Google Sheets.`
        });
      }
    } catch (err: any) {
      console.error('Erreur authentification:', err);
      alert(`Erreur de connexion Google: ${err?.message || 'Vérifiez la configuration'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNotification({ message: 'Vous avez été déconnecté avec succès.' });
  };

  // Calculate critical alert count for header badge
  const criticalAlertCount = useMemo(() => {
    const now = new Date('2026-10-26T13:49:27');
    let count = 0;

    // Expired lots or under 30 days
    lots.forEach(l => {
      if (l.availableQty > 0) {
        const diffDays = Math.ceil((new Date(l.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 30 || l.status === 'Périmé') {
          count++;
        }
      }
    });

    // Ruptures
    const stockMap: Record<string, number> = {};
    lots.forEach(l => {
      if (l.status !== 'Périmé') {
        stockMap[l.productCode] = (stockMap[l.productCode] || 0) + l.availableQty;
      }
    });

    products.forEach(p => {
      if ((stockMap[p.code] || 0) === 0) {
        count++;
      }
    });

    return count;
  }, [lots, products]);

  // Product actions
  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
    setNotification({ message: `Référence ${newProduct.code} (${newProduct.dci}) ajoutée au catalogue.` });
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => p.code === updated.code ? updated : p));
    setNotification({ message: `Référence ${updated.code} mise à jour.` });
  };

  // Lot actions
  const handleAddLot = (newLot: LotStock) => {
    setLots(prev => [newLot, ...prev]);
    setNotification({ message: `Lot ${newLot.lotNumber} pour ${newLot.productCode} enregistré avec succès.` });
  };

  const handleUpdateLotStatus = (lotId: string, newStatus: LotStatus) => {
    setLots(prev => prev.map(l => l.id === lotId ? { ...l, status: newStatus } : l));
    setNotification({ message: `Statut du lot modifié : ${newStatus}.` });
  };

  // Reception action: records entry and automatically updates lots
  const handleAddReception = (reception: ReceptionEntry) => {
    setReceptions(prev => [reception, ...prev]);

    // Update or create corresponding lot
    setLots(prev => {
      const existingLotIndex = prev.findIndex(l => l.lotNumber === reception.lotNumber && l.productCode === reception.productCode);
      if (existingLotIndex >= 0) {
        const updated = [...prev];
        const lot = updated[existingLotIndex];
        const newReceived = lot.receivedQty + reception.quantityReceived;
        const newAvailable = lot.availableQty + reception.quantityReceived;
        updated[existingLotIndex] = {
          ...lot,
          receivedQty: newReceived,
          availableQty: newAvailable,
          totalValue: newAvailable * lot.unitPrice,
          status: reception.isCompliant ? 'Actif' : 'Quarantaine'
        };
        return updated;
      } else {
        // Create new lot
        const newLot: LotStock = {
          id: `LOT-${Date.now()}`,
          productCode: reception.productCode,
          productDesignation: reception.productDesignation,
          lotNumber: reception.lotNumber,
          receptionDate: reception.receptionDate,
          expiryDate: reception.expiryDate,
          initialQty: reception.quantityReceived,
          receivedQty: reception.quantityReceived,
          exitedQty: 0,
          availableQty: reception.quantityReceived,
          unitPrice: reception.unitPrice,
          totalValue: reception.quantityReceived * reception.unitPrice,
          supplierId: reception.supplierId,
          supplier: reception.supplier,
          location: reception.location,
          status: reception.isCompliant ? 'Actif' : 'Quarantaine',
          comments: `Créé automatiquement lors de la réception ${reception.receptionNumber}`
        };
        return [newLot, ...prev];
      }
    });

    setNotification({
      message: `Réception ${reception.receptionNumber} enregistrée. Stock incrémenté de +${reception.quantityReceived} ${reception.unit}s.`
    });
  };

  // Commit scanned delivery note (BL) items
  const handleCommitDeliveryNote = (
    newReceptions: ReceptionEntry[],
    newLots: LotStock[],
    newProducts: Product[]
  ) => {
    if (newProducts.length > 0) {
      setProducts(prev => [...newProducts, ...prev]);
    }
    setReceptions(prev => [...newReceptions, ...prev]);
    setLots(prev => {
      const existingMap = new Map(prev.map(l => [l.lotNumber + '_' + l.productCode, l]));
      newLots.forEach(nl => {
        const key = nl.lotNumber + '_' + nl.productCode;
        if (existingMap.has(key)) {
          const existing = existingMap.get(key)!;
          const totalReceived = existing.receivedQty + nl.receivedQty;
          const totalAvailable = existing.availableQty + nl.availableQty;
          existingMap.set(key, {
            ...existing,
            receivedQty: totalReceived,
            availableQty: totalAvailable,
            totalValue: totalAvailable * existing.unitPrice,
            status: 'Actif'
          });
        } else {
          existingMap.set(key, nl);
        }
      });
      return Array.from(existingMap.values());
    });

    const blNumber = newReceptions[0]?.deliveryNoteNumber || 'BL';
    setNotification({
      message: `Bon de Livraison ${blNumber} validé avec succès ! ${newReceptions.length} arrivage(s) et ${newLots.length} lot(s) intégrés au stock.`
    });
  };

  // Exit action: records exit and deducts from lot
  const handleAddExit = (exit: ExitRecord) => {
    setExits(prev => [exit, ...prev]);

    // Deduct from specified lot
    setLots(prev => {
      return prev.map(l => {
        if (l.lotNumber === exit.lotNumber && l.productCode === exit.productCode) {
          const newExited = l.exitedQty + exit.quantityExited;
          const newAvailable = Math.max(0, l.availableQty - exit.quantityExited);
          return {
            ...l,
            exitedQty: newExited,
            availableQty: newAvailable,
            totalValue: newAvailable * l.unitPrice,
            status: newAvailable === 0 ? 'Épuisé' : l.status
          };
        }
        return l;
      });
    });

    setNotification({
      message: `Dispensation ${exit.exitNumber} validée pour ${exit.hospitalDepartment}. Stock déduit (-${exit.quantityExited} ${exit.unit}s).`
    });
  };

  // Order actions
  const handleAddOrder = (order: SupplierOrder) => {
    setOrders(prev => [order, ...prev]);
    setNotification({ message: `Bon de commande ${order.orderNumber} émis chez ${order.supplierName}.` });
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    setNotification({ message: `Commande mise à jour : Statut ${status}.` });
  };

  // Supplier actions
  const handleAddSupplier = (newSupplier: Supplier) => {
    setSuppliers(prev => [newSupplier, ...prev]);
    setNotification({ message: `Fournisseur [${newSupplier.id}] ${newSupplier.name} enregistré.` });
  };

  const handleUpdateSupplier = (updated: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
    setNotification({ message: `Fournisseur [${updated.id}] mis à jour.` });
  };

  // Google Sheets Create or Sync
  const handleCreateOrSyncSpreadsheet = useCallback(async () => {
    let token = await getAccessToken();

    if (!token) {
      // Must authenticate first
      setIsLoggingIn(true);
      try {
        const signinResult = await googleSignIn();
        if (!signinResult) {
          alert('Veuillez vous connecter avec votre compte Google pour synchroniser Google Sheets.');
          return;
        }
        token = signinResult.accessToken;
        setUser(signinResult.user);
      } catch (err: any) {
        alert(`Erreur d'authentification Google: ${err?.message}`);
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    if (!token) return;

    setIsSyncing(true);
    try {
      let targetId = spreadsheetId;
      let targetUrl = spreadsheetUrl;

      // If no spreadsheet exists yet, create one with all 8 sheets
      if (!targetId) {
        const creation = await createHospitalPharmacySpreadsheet(
          token,
          'Pharmacie Hospitalière - PharmaGarde CHU'
        );
        targetId = creation.spreadsheetId;
        targetUrl = creation.spreadsheetUrl;

        setSpreadsheetId(targetId);
        setSpreadsheetUrl(targetUrl);
        localStorage.setItem('pharmagarde_sheet_id', targetId);
        localStorage.setItem('pharmagarde_sheet_url', targetUrl);
      }

      // Populate sheets with data and formatting
      await populatePharmacyData(token, targetId, {
        products,
        lots,
        receptions,
        exits,
        orders,
        suppliers
      });

      const syncTime = new Date().toISOString();
      setLastSyncedAt(syncTime);
      localStorage.setItem('pharmagarde_last_synced', syncTime);

      setNotification({
        message: 'Toutes les données ont été synchronisées avec succès dans votre classeur Google Sheets !',
        url: targetUrl || undefined
      });
    } catch (err: any) {
      console.error('Erreur synchronisation Sheets:', err);
      alert(`Erreur de synchronisation Google Sheets: ${err?.message || 'Une erreur est survenue'}`);
    } finally {
      setIsSyncing(false);
    }
  }, [spreadsheetId, spreadsheetUrl, products, lots, receptions, exits, orders]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        spreadsheetUrl={spreadsheetUrl}
        isSyncing={isSyncing}
        onSync={handleCreateOrSyncSpreadsheet}
        criticalAlertCount={criticalAlertCount}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Floating Notification Banner */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 bg-teal-900 text-teal-50 rounded-xl shadow-lg border border-teal-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="font-medium">{notification.message}</span>
              {notification.url && (
                <a
                  href={notification.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-teal-300 hover:text-white underline font-semibold ml-2"
                >
                  <span>Ouvrir la feuille</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 text-teal-300 hover:text-white rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full">
        {activeTab === 'dashboard' && (
          <DashboardView
            products={products}
            lots={lots}
            receptions={receptions}
            exits={exits}
            orders={orders}
            departments={departments}
            suppliers={suppliers}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            lots={lots}
            suppliers={suppliers}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
          />
        )}

        {activeTab === 'lots' && (
          <StocksLotsView
            lots={lots}
            products={products}
            suppliers={suppliers}
            onAddLot={handleAddLot}
            onUpdateLotStatus={handleUpdateLotStatus}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersView
            suppliers={suppliers}
            products={products}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
          />
        )}

        {activeTab === 'receptions' && (
          <ReceptionsView
            receptions={receptions}
            products={products}
            suppliers={suppliers}
            onAddReception={handleAddReception}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'exits' && (
          <ExitsView
            exits={exits}
            products={products}
            lots={lots}
            departments={departments}
            onAddExit={handleAddExit}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            products={products}
            suppliers={suppliers}
            lots={lots}
            onAddOrder={handleAddOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            lots={lots}
            products={products}
            onUpdateLotStatus={handleUpdateLotStatus}
          />
        )}

        {activeTab === 'sheets' && (
          <GoogleSheetsIntegrationView
            user={user}
            spreadsheetId={spreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            lastSyncedAt={lastSyncedAt}
            isSyncing={isSyncing}
            onLogin={handleLogin}
            onCreateOrSyncSpreadsheet={handleCreateOrSyncSpreadsheet}
            products={products}
            lots={lots}
            receptions={receptions}
            exits={exits}
            orders={orders}
            suppliers={suppliers}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">PharmaGarde CHU</span>
            <span>•</span>
            <span>Système Expert de Pharmacie Hospitalière & Logistique Médicale</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Traçabilité FEFO & Bonnes Pratiques BPPH</span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('sheets')}
              className="text-teal-700 hover:text-teal-900 font-medium underline"
            >
              Google Sheets & Apps Script
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Camera Scanner Action on Android / Mobile */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-2xl shadow-teal-500/50 flex items-center justify-center border-2 border-white/60 active:scale-95 transition-transform"
          title="Scanner un Bon de Livraison (BL)"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* Delivery Note (BL) Scanner Modal */}
      <DeliveryNoteScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        suppliers={suppliers}
        onCommitDeliveryNote={handleCommitDeliveryNote}
      />
    </div>
  );
}

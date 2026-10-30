/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductCategory = 
  | 'Médicament'
  | 'Dispositif Médical Stérile'
  | 'DM Implantable'
  | 'Soluté & Perfusion'
  | 'Stupéfiant & Assimilé'
  | 'Antiseptique & Désinfectant'
  | 'Consommable de Soins';

export type StorageCondition = 
  | 'Température ambiante (15-25°C)'
  | 'Chaîne du froid (2-8°C)'
  | 'Congélateur (-20°C)'
  | 'Coffre sécurisé (Stupéfiants)'
  | 'À l\'abri de la lumière';

export type LotStatus = 
  | 'Actif'
  | 'Quarantaine'
  | 'Périmé'
  | 'Épuisé'
  | 'Rappel de lot';

export type OrderStatus = 
  | 'Brouillon'
  | 'Transmise'
  | 'Partiellement reçue'
  | 'Soldée'
  | 'Annulée';

export type ExitReason = 
  | 'Dispensation standard'
  | 'Urgence vitale'
  | 'Dotation de service'
  | 'Renouvellement armoire'
  | 'Mise au rebut / Périmé'
  | 'Retour laboratoire';

export interface Product {
  code: string; // Ex: MED-001
  barcode?: string; // CIP13 ou UDI
  designation: string;
  dci: string; // Dénomination Commune Internationale
  brandName: string; // Nom commercial
  dosage: string;
  form: string; // Forme galénique (ex: Flacon injectable, Comprimé...)
  packaging: string; // Ex: Boîte de 10 flacons
  unit: string; // Unité de gestion: Flacon, Ampoule, Boîte, Poche, Seringue
  category: ProductCategory;
  therapeuticClass: string;
  route: string; // Voie: IV, PO, SC, IM, Inhalation
  manufacturer: string;
  supplierId: string; // ID Fournisseur unique (ex: SUP-FK)
  supplier: string; // Nom du Fournisseur
  purchasePrice: number; // Prix unitaire d'achat (DZD)
  minStock: number; // Seuil minimal
  maxStock: number; // Stock max
  securityStock: number; // Stock de sécurité
  leadTimeDays: number; // Délai approvisionnement en jours
  location: string; // Emplacement physique (ex: Allée B - Niveau 2)
  storageCondition: StorageCondition;
  isActive: boolean;
}

export interface LotStock {
  id: string;
  productCode: string;
  productDesignation: string;
  lotNumber: string;
  receptionDate: string; // YYYY-MM-DD
  manufacturingDate?: string;
  expiryDate: string; // YYYY-MM-DD
  initialQty: number;
  receivedQty: number;
  exitedQty: number;
  availableQty: number;
  unitPrice: number;
  totalValue: number;
  supplierId: string; // ID Fournisseur unique
  supplier: string;
  location: string;
  status: LotStatus;
  comments?: string;
}

export interface ReceptionEntry {
  id: string;
  receptionNumber: string; // Ex: REC-2026-001
  receptionDate: string;
  orderNumber: string; // N° Bon de Commande
  deliveryNoteNumber: string; // N° Bon de Livraison
  supplierId: string;
  supplier: string;
  productCode: string;
  productDesignation: string;
  lotNumber: string;
  expiryDate: string;
  quantityReceived: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  location: string;
  receivedBy: string;
  isCompliant: boolean;
  notes?: string;
}

export interface ExitRecord {
  id: string;
  exitNumber: string; // Ex: SORT-2026-042
  exitDate: string;
  hospitalDepartment: string; // Service destinataire
  requesterName: string; // Prescripteur / Demandeur
  productCode: string;
  productDesignation: string;
  lotNumber: string;
  expiryDate: string;
  quantityExited: number;
  unit: string;
  unitPrice: number;
  totalCost: number; // Coût imputé
  reason: ExitReason;
  validatedBy: string; // Pharmacien ou préparateur
  notes?: string;
}

export interface OrderItem {
  productCode: string;
  productDesignation: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierOrder {
  id: string;
  orderNumber: string; // Ex: BC-2026-015
  orderDate: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  expectedDeliveryDate: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  createdBy: string;
}

export interface HospitalDepartment {
  id: string;
  name: string;
  floor: string;
  headDoctor: string;
  contactEmail: string;
  color: string;
}

export interface Supplier {
  id: string; // ID Fournisseur unique (ex: SUP-FK)
  name: string; // Nom du Fournisseur
  contactName: string; // Contact Principal
  phone: string; // Téléphone
  email: string; // Email
  address: string; // Adresse
  paymentTerms: string; // Conditions de Paiement (ex: 30 jours fin de mois, 45 jours mandat administratif)
  averageLeadTimeDays: number; // Délai de Livraison Moyen (jours)
  suppliedProducts: string[]; // Liste des codes produits fournis (ex: ['MED-001', 'MED-003'])
}

export interface DashboardFilter {
  period: 'month' | 'quarter' | 'year' | 'all';
  category: string;
  department: string;
  location: string;
  supplier: string;
  alertLevel: 'all' | 'rupture' | 'seuil_min' | 'perime' | 'expire_30' | 'expire_60' | 'expire_90';
}

export interface GoogleSheetsSyncState {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage: string | null;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  Pill, 
  Boxes, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ShoppingBag, 
  AlertTriangle, 
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  LogOut,
  UserCheck,
  ShieldAlert,
  Camera,
  Smartphone
} from 'lucide-react';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab = 
  | 'dashboard'
  | 'products'
  | 'lots'
  | 'suppliers'
  | 'receptions'
  | 'exits'
  | 'orders'
  | 'alerts'
  | 'sheets';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  spreadsheetUrl: string | null;
  isSyncing: boolean;
  onSync: () => void;
  criticalAlertCount: number;
  onOpenScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  spreadsheetUrl,
  isSyncing,
  onSync,
  criticalAlertCount,
  onOpenScanner
}) => {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'products', label: 'Référentiel', icon: <Pill className="w-4 h-4" /> },
    { id: 'lots', label: 'Stocks & Lots', icon: <Boxes className="w-4 h-4" /> },
    { id: 'suppliers', label: 'Fournisseurs', icon: <Building2 className="w-4 h-4" /> },
    { id: 'receptions', label: 'Entrées', icon: <ArrowDownToLine className="w-4 h-4" /> },
    { id: 'exits', label: 'Sorties', icon: <ArrowUpFromLine className="w-4 h-4" /> },
    { id: 'orders', label: 'Commandes', icon: <ShoppingBag className="w-4 h-4" /> },
    { 
      id: 'alerts', 
      label: 'Alertes', 
      icon: <AlertTriangle className="w-4 h-4" />, 
      badge: criticalAlertCount > 0 ? criticalAlertCount : undefined 
    },
    { 
      id: 'sheets', 
      label: 'Google Sheets', 
      icon: <FileSpreadsheet className="w-4 h-4" /> 
    }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl">
      {/* Top Banner: Hospital info & User authentication */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-slate-800/80">
          {/* Logo & Hospital Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white flex items-center">
                  PharmaGarde <span className="text-teal-400 font-extrabold ml-1">CHU</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-full">
                  PUI Hospitalière
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full font-mono font-bold" title="Devise active : Dinar Algérien (DZD)">
                  DZD
                </span>
              </div>
              <p className="text-xs text-slate-400 capitalize hidden sm:block">
                {currentDate}
              </p>
            </div>
          </div>

          {/* Quick status & Actions */}
          <div className="flex items-center space-x-3">
            {/* Google Sheets Link Badge */}
            {spreadsheetUrl ? (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                title="Ouvrir le classeur directement dans Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                <span>Classeur Lié</span>
                <ExternalLink className="w-3 h-3 ml-1 text-emerald-400/80" />
              </a>
            ) : (
              <button
                onClick={() => setActiveTab('sheets')}
                className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                <span>Lier Google Sheets</span>
              </button>
            )}

            {/* Android PWA Install Button */}
            <PWAInstallButton variant="navbar" />

            {/* Scan Delivery Note (BL) Button */}
            <button
              onClick={onOpenScanner}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-md shadow-teal-500/20 transition-all border border-teal-400/40"
              title="Scanner un Bon de Livraison (BL) avec la caméra"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              <span>Scanner BL</span>
            </button>

            {/* Sync Button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm disabled:opacity-50 transition-colors"
              title="Synchroniser les mouvements et indicateurs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Synchronisation...' : 'Synchroniser'}</span>
            </button>

            {/* Google Auth Button / User Profile */}
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-800/80 pl-2 pr-3 py-1 rounded-full border border-slate-700">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilisateur'}
                    className="w-7 h-7 rounded-full border border-teal-400"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left text-xs">
                  <p className="font-medium text-slate-200 leading-tight">
                    {user.displayName || 'Pharmacien'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors ml-1"
                  title="Déconnexion"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-800 hover:bg-slate-100 transition-all shadow-sm border border-slate-200"
              >
                {/* Google official SVG icon */}
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{isLoggingIn ? 'Connexion...' : 'Google Workspace'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2.5 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`ml-2 px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-white text-teal-700' : 'bg-red-500 text-white animate-pulse'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

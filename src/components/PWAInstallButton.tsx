/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Check, Sparkles, X, Info } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'banner' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar'
}) => {
  const { isInstallable, isInstalled, isAndroid, installApp } = usePWAInstall();
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await installApp();
      if (!installed) {
        setShowAndroidGuide(true);
      }
    } else {
      setShowAndroidGuide(true);
    }
  };

  if (isInstalled && variant === 'banner') {
    return null;
  }

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleClick}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isInstalled 
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm border border-emerald-400/30'
          } ${className}`}
          title={isInstalled ? "Application installée sur cet appareil" : "Installer PharmaGarde comme application Android / PWA"}
        >
          {isInstalled ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>App Installée</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
              <span>App Android</span>
              <Download className="w-3 h-3 ml-0.5 text-white/80" />
            </>
          )}
        </button>
      )}

      {variant === 'banner' && (
        <div className="bg-gradient-to-r from-teal-900/90 via-slate-900 to-emerald-950 p-4 rounded-2xl border border-teal-500/30 shadow-lg text-white mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-teal-100">
                    Application Mobile Android Disponible
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full font-semibold border border-emerald-500/40">
                    Mode Hors-Ligne & Caméra Scanner
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Installez PharmaGarde sur votre smartphone Android pour scanner directement les bons de livraison avec l'appareil photo.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 shrink-0">
              <button
                onClick={handleClick}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Installer sur Android</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android Installation Modal Guide */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 relative">
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Installation sur Android
                </h3>
                <p className="text-xs text-slate-500">
                  Application PWA certifiée pour Google Chrome / Android
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 text-[11px] font-bold">1</div>
                <p><span className="font-semibold text-slate-800">Ouvrez le menu Chrome</span> en appuyant sur les 3 points verticaux <strong className="text-slate-800">⋮</strong> en haut à droite.</p>
              </div>
              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 text-[11px] font-bold">2</div>
                <p>Appuyez sur <strong className="text-slate-800">« Installer l'application »</strong> ou <strong className="text-slate-800">« Ajouter à l'écran d'accueil »</strong>.</p>
              </div>
              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 text-[11px] font-bold">3</div>
                <p>PharmaGarde apparaîtra instantanément avec son icône sur votre écran d'accueil Android et fonctionnera en plein écran comme une application native avec le scanner photo.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-5">
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

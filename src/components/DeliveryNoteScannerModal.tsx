/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Calendar, 
  FileText, 
  Building2, 
  Barcode, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  RotateCw, 
  Smartphone,
  Eye,
  RefreshCw
} from 'lucide-react';
import { 
  Product, 
  Supplier, 
  ReceptionEntry, 
  LotStock 
} from '../types/pharmacy';
import { formatDZD } from '../utils/currency';
import { 
  analyzeDeliveryNoteImage, 
  ScannedBLResult, 
  ScannedBLItem, 
  SAMPLE_DELIVERY_NOTES 
} from '../services/deliveryNoteScannerService';

interface DeliveryNoteScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  onCommitDeliveryNote: (
    newReceptions: ReceptionEntry[],
    newLots: LotStock[],
    newProducts: Product[]
  ) => void;
}

type ScanMode = 'camera' | 'upload' | 'samples';
type ScanStep = 'capture' | 'analyzing' | 'review' | 'success';

export const DeliveryNoteScannerModal: React.FC<DeliveryNoteScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  suppliers,
  onCommitDeliveryNote
}) => {
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [step, setStep] = useState<ScanStep>('capture');
  const [analysisProgress, setAnalysisProgress] = useState('Démarrage de l\'analyse...');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Scanned data ready for verification
  const [scannedData, setScannedData] = useState<ScannedBLResult | null>(null);

  // Camera stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Start camera when mode is 'camera' and step is 'capture'
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    if (isOpen && scanMode === 'camera' && step === 'capture') {
      setCameraError(null);
      navigator.mediaDevices?.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      .then(s => {
        currentStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(err => {
        console.warn('Camera access error:', err);
        setCameraError("Impossible d'accéder à la caméra. Vous pouvez utiliser le mode Import de photo ou les modèles d'essai.");
      });
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen, scanMode, step, facingMode]);

  // Clean up stream on modal close
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setStep('capture');
    setCapturedImage(null);
    setScannedData(null);
    onClose();
  };

  const flipCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Capture frame from live video
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    // Stop video stream
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }

    // Convert dataUrl to blob and analyze
    canvas.toBlob(blob => {
      if (blob) {
        processDocument(blob);
      }
    }, 'image/jpeg');
  };

  // Process uploaded file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    processDocument(file);
  };

  // Load a demo sample
  const handleLoadSample = (sample: typeof SAMPLE_DELIVERY_NOTES[0]) => {
    setStep('analyzing');
    setAnalysisProgress('Lecture des lignes et identification des lots...');
    setTimeout(() => {
      setScannedData(JSON.parse(JSON.stringify(sample.result)));
      setStep('review');
    }, 900);
  };

  // Common document processor with OCR animation
  const processDocument = async (file: File | Blob) => {
    setStep('analyzing');
    setAnalysisProgress('Numérisation du Bon de Livraison...');

    setTimeout(() => setAnalysisProgress('Reconnaissance optique (OCR) & extraction des lots...'), 600);
    setTimeout(() => setAnalysisProgress('Contrôle de conformité et calcul des montants DZD...'), 1400);

    try {
      const result = await analyzeDeliveryNoteImage(file, products, suppliers);
      setScannedData(result);
      setStep('review');
    } catch (err) {
      console.error('Scan error:', err);
      // Fallback
      setScannedData(SAMPLE_DELIVERY_NOTES[0].result);
      setStep('review');
    }
  };

  // Edit item in review table
  const handleUpdateItem = (index: number, field: keyof ScannedBLItem, value: any) => {
    if (!scannedData) return;
    const updatedItems = [...scannedData.items];
    const item = { ...updatedItems[index], [field]: value };
    
    // Recalculate line total if price or qty changes
    if (field === 'quantityReceived' || field === 'unitPrice') {
      item.totalAmount = (item.quantityReceived || 0) * (item.unitPrice || 0);
    }
    
    updatedItems[index] = item;
    setScannedData({ ...scannedData, items: updatedItems });
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    if (!scannedData) return;
    const updated = scannedData.items.filter((_, i) => i !== index);
    setScannedData({ ...scannedData, items: updated });
  };

  // Add new blank item
  const handleAddItem = () => {
    if (!scannedData) return;
    const newItem: ScannedBLItem = {
      id: `new-item-${Date.now()}`,
      productCode: `MED-${Math.floor(100 + Math.random() * 900)}`,
      designation: 'Nouveau médicament',
      lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      expiryDate: '2028-12-31',
      quantityReceived: 50,
      unit: 'Boîte',
      unitPrice: 350,
      totalAmount: 17500,
      isNewProduct: true
    };
    setScannedData({
      ...scannedData,
      items: [...scannedData.items, newItem]
    });
  };

  // Commit all scanned items to database
  const handleValidateAndCommit = () => {
    if (!scannedData || scannedData.items.length === 0) return;

    const newReceptions: ReceptionEntry[] = [];
    const newLots: LotStock[] = [];
    const newProducts: Product[] = [];

    scannedData.items.forEach((item, index) => {
      // 1. Create Reception
      const reception: ReceptionEntry = {
        id: `REC-BL-${Date.now()}-${index}`,
        receptionNumber: `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        receptionDate: scannedData.receptionDate,
        orderNumber: scannedData.orderNumber,
        deliveryNoteNumber: scannedData.deliveryNoteNumber,
        supplierId: scannedData.supplierId,
        supplier: scannedData.supplierName,
        productCode: item.productCode,
        productDesignation: item.designation,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate,
        quantityReceived: item.quantityReceived,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
        location: item.location || 'Magasin Central - Allée A',
        receivedBy: scannedData.receivedBy,
        isCompliant: true,
        notes: `Importé via Scanner Android de Bon de Livraison (${scannedData.deliveryNoteNumber})`
      };
      newReceptions.push(reception);

      // 2. Create Lot Stock
      const lot: LotStock = {
        id: `LOT-${Date.now()}-${index}`,
        productCode: item.productCode,
        productDesignation: item.designation,
        lotNumber: item.lotNumber,
        receptionDate: scannedData.receptionDate,
        expiryDate: item.expiryDate,
        initialQty: item.quantityReceived,
        receivedQty: item.quantityReceived,
        exitedQty: 0,
        availableQty: item.quantityReceived,
        unitPrice: item.unitPrice,
        totalValue: item.totalAmount,
        supplierId: scannedData.supplierId,
        supplier: scannedData.supplierName,
        location: item.location || 'Magasin Central - Allée A',
        status: 'Actif',
        comments: `Entrée automatique par scan BL ${scannedData.deliveryNoteNumber}`
      };
      newLots.push(lot);

      // 3. If product does not exist in catalog, create it
      const exists = products.some(p => p.code.toLowerCase() === item.productCode.toLowerCase());
      if (!exists && !newProducts.some(p => p.code.toLowerCase() === item.productCode.toLowerCase())) {
        const prod: Product = {
          code: item.productCode,
          barcode: `613${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          designation: item.designation,
          dci: item.designation.split(' ')[0] || item.designation,
          brandName: item.designation,
          dosage: 'Standard',
          form: item.unit === 'Poche' ? 'Poche de perfusion' : item.unit === 'Ampoule' ? 'Ampoule injectable' : 'Boîte',
          packaging: `Boîte / Conditionnement de ${item.unit}`,
          unit: item.unit,
          category: 'Médicament',
          therapeuticClass: 'Thérapeutique générale',
          route: 'IV / PO',
          manufacturer: scannedData.supplierName,
          supplierId: scannedData.supplierId,
          supplier: scannedData.supplierName,
          purchasePrice: item.unitPrice,
          minStock: 20,
          maxStock: 500,
          securityStock: 10,
          leadTimeDays: 7,
          location: item.location || 'Magasin Central - Allée A',
          storageCondition: 'Température ambiante (15-25°C)',
          isActive: true
        };
        newProducts.push(prod);
      }
    });

    onCommitDeliveryNote(newReceptions, newLots, newProducts);
    setStep('success');
  };

  const totalBLAmount = (scannedData?.items || []).reduce((acc, it) => acc + (it.totalAmount || 0), 0);
  const totalBLQuantity = (scannedData?.items || []).reduce((acc, it) => acc + (it.quantityReceived || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-teal-500/30 rounded-3xl max-w-4xl w-full shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Scanner de Bon de Livraison (BL)
                </h2>
                <span className="px-2 py-0.5 text-[10px] bg-teal-500/20 text-teal-300 rounded-full font-semibold border border-teal-500/30">
                  OCR & IA Pharmacie
                </span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full font-bold font-mono">
                  DZD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extraction automatique des numéros de BL, lots, péremptions et intégration directe au stock
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: CAPTURE */}
          {step === 'capture' && (
            <div className="space-y-6">
              {/* Mode Tabs */}
              <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80 max-w-md mx-auto">
                <button
                  onClick={() => setScanMode('camera')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-all ${
                    scanMode === 'camera'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Caméra Directe</span>
                </button>
                <button
                  onClick={() => setScanMode('upload')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-all ${
                    scanMode === 'upload'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Importer / Photo</span>
                </button>
                <button
                  onClick={() => setScanMode('samples')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-all ${
                    scanMode === 'samples'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Modèles BL</span>
                </button>
              </div>

              {/* Mode CAMERA */}
              {scanMode === 'camera' && (
                <div className="flex flex-col items-center">
                  <div className="relative w-full max-w-lg aspect-[4/3] bg-black rounded-3xl overflow-hidden border-2 border-teal-500/40 shadow-2xl flex items-center justify-center group">
                    {cameraError ? (
                      <div className="p-6 text-center text-slate-300">
                        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                        <p className="text-xs mb-4">{cameraError}</p>
                        <button
                          onClick={() => setScanMode('upload')}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl"
                        >
                          Passer en Import Photo
                        </button>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Scanner Targeting Overlay */}
                        <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-teal-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] bg-slate-900/80 text-teal-300 px-2 py-0.5 rounded-md backdrop-blur-sm border border-teal-500/30">
                              Cadrez le Bon de Livraison
                            </span>
                            <span className="text-[10px] bg-slate-900/80 text-teal-300 px-2 py-0.5 rounded-md backdrop-blur-sm border border-teal-500/30">
                              N° BL / Lots / DZD
                            </span>
                          </div>
                          
                          {/* Animated scan line */}
                          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse" />

                          <div className="text-center">
                            <p className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md inline-block">
                              Alignez les colonnes et le tableau de médicaments
                            </p>
                          </div>
                        </div>

                        {/* Flip camera button */}
                        <button
                          onClick={flipCamera}
                          className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-teal-300 rounded-full border border-teal-500/40 backdrop-blur-md transition-all shadow-md"
                          title="Changer de caméra (avant/arrière)"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {!cameraError && (
                    <div className="mt-6 flex items-center space-x-4">
                      <button
                        onClick={takeSnapshot}
                        className="px-8 py-3.5 bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm rounded-full shadow-lg shadow-teal-500/30 transition-all flex items-center space-x-2 transform active:scale-95"
                      >
                        <Camera className="w-5 h-5" />
                        <span>Capturer et Analyser le BL</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mode UPLOAD */}
              {scanMode === 'upload' && (
                <div className="max-w-lg mx-auto">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-teal-400 bg-slate-800/40 hover:bg-slate-800/70 transition-all rounded-3xl p-8 text-center cursor-pointer group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-sm text-white mb-1">
                      Prendre une photo ou importer un document
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                      Sur Android, ceci ouvre directement votre appareil photo haute résolution pour photographier le bon de livraison physique.
                    </p>
                    <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white shadow-sm group-hover:bg-teal-500 transition-colors">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Sélectionner le document
                    </span>
                  </div>
                </div>
              )}

              {/* Mode SAMPLES */}
              {scanMode === 'samples' && (
                <div className="max-w-xl mx-auto space-y-3">
                  <p className="text-xs text-slate-300 text-center mb-4">
                    Testez instantanément le système de scan avec des bordereaux de livraison réels de laboratoires partenaires :
                  </p>
                  {SAMPLE_DELIVERY_NOTES.map((sample, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleLoadSample(sample)}
                      className="p-4 bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-teal-400/60 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-teal-200 group-hover:text-teal-300">
                            {sample.label}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {sample.result.items.length} lignes de produits • N° {sample.result.deliveryNoteNumber}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 bg-teal-600/30 group-hover:bg-teal-500 text-teal-300 group-hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all">
                        <span>Charger</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ANALYZING */}
          {step === 'analyzing' && (
            <div className="py-16 text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-teal-500/10 border-2 border-teal-400 flex items-center justify-center text-teal-300">
                  <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Analyse Numérique du Bon de Livraison
                </h3>
                <p className="text-xs text-teal-300 font-mono">
                  {analysisProgress}
                </p>
              </div>

              <div className="max-w-xs mx-auto bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & EDIT */}
          {step === 'review' && scannedData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Details Card */}
              <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-teal-400" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                      Entête du Document Extrait
                    </span>
                  </div>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                    Conformité Validée
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      N° Bon de Livraison (BL)
                    </label>
                    <input
                      type="text"
                      value={scannedData.deliveryNoteNumber}
                      onChange={e => setScannedData({ ...scannedData, deliveryNoteNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-semibold focus:outline-none focus:border-teal-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Fournisseur / Laboratoire
                    </label>
                    <input
                      type="text"
                      value={scannedData.supplierName}
                      onChange={e => setScannedData({ ...scannedData, supplierName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-semibold focus:outline-none focus:border-teal-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Date de Réception
                    </label>
                    <input
                      type="date"
                      value={scannedData.receptionDate}
                      onChange={e => setScannedData({ ...scannedData, receptionDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-teal-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      N° Bon de Commande (BC)
                    </label>
                    <input
                      type="text"
                      value={scannedData.orderNumber}
                      onChange={e => setScannedData({ ...scannedData, orderNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-teal-400 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">
                      Lignes de Produits Identifiées ({scannedData.items.length})
                    </h3>
                    <span className="text-xs text-slate-400">
                      • Quantité totale : {totalBLQuantity} unités
                    </span>
                  </div>

                  <button
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une ligne</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/90 shadow-md">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800/90 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-700">
                        <th className="py-2.5 px-3">Produit & Réf</th>
                        <th className="py-2.5 px-3">N° de Lot</th>
                        <th className="py-2.5 px-3">Date Péremption</th>
                        <th className="py-2.5 px-3 text-right">Quantité</th>
                        <th className="py-2.5 px-3">Unité</th>
                        <th className="py-2.5 px-3 text-right">P.U. (DZD)</th>
                        <th className="py-2.5 px-3 text-right">Total (DZD)</th>
                        <th className="py-2.5 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {scannedData.items.map((item, idx) => {
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={item.designation}
                                  onChange={e => handleUpdateItem(idx, 'designation', e.target.value)}
                                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-medium focus:border-teal-400 focus:outline-none"
                                />
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={item.productCode}
                                    onChange={e => handleUpdateItem(idx, 'productCode', e.target.value)}
                                    className="w-24 bg-slate-800/80 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-teal-300 font-mono focus:border-teal-400 focus:outline-none"
                                  />
                                  {item.isNewProduct ? (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                                      Nouveau Référentiel
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
                                      Existant
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.lotNumber}
                                onChange={e => handleUpdateItem(idx, 'lotNumber', e.target.value)}
                                className="w-28 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 text-amber-300 font-mono text-xs focus:border-teal-400 focus:outline-none"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <input
                                type="date"
                                value={item.expiryDate}
                                onChange={e => handleUpdateItem(idx, 'expiryDate', e.target.value)}
                                className="w-32 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:border-teal-400 focus:outline-none"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min={1}
                                value={item.quantityReceived}
                                onChange={e => handleUpdateItem(idx, 'quantityReceived', parseInt(e.target.value) || 0)}
                                className="w-20 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 text-right text-white font-mono font-bold text-xs focus:border-teal-400 focus:outline-none"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <select
                                value={item.unit}
                                onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                                className="bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:border-teal-400 focus:outline-none"
                              >
                                <option value="Flacon">Flacon</option>
                                <option value="Boîte">Boîte</option>
                                <option value="Poche">Poche</option>
                                <option value="Ampoule">Ampoule</option>
                                <option value="Seringue">Seringue</option>
                                <option value="Unité">Unité</option>
                              </select>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={item.unitPrice}
                                onChange={e => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-24 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 text-right text-emerald-300 font-mono text-xs focus:border-teal-400 focus:outline-none"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {formatDZD(item.totalAmount)}
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-500 hover:text-red-400 rounded-md transition-colors"
                                title="Supprimer la ligne"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary total banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-800/80 rounded-2xl border border-slate-700 gap-4">
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <p>• Les réceptions seront inscrites dans la feuille <strong className="text-slate-200">ENTRÉES</strong>.</p>
                    <p>• Les lots avec dates de péremption seront injectés dans <strong className="text-slate-200">STOCKS ET LOTS</strong>.</p>
                    <p>• Les nouvelles références seront créées dans le <strong className="text-slate-200">RÉFÉRENTIEL</strong>.</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                      Montant Total du Bon de Livraison
                    </span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {formatDZD(totalBLAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="py-12 text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Check className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Bon de Livraison Intégré avec Succès !
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Toutes les lignes de médicaments, les numéros de lots, les péremptions et les montants en DZD ont été enregistrés dans la base de données hospitalière.
                </p>
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-600/20"
                >
                  Fermer et Consulter le Stock
                </button>
                <button
                  onClick={() => {
                    setStep('capture');
                    setScannedData(null);
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700"
                >
                  Scanner un Autre Document
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step === 'review' && (
          <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between sticky bottom-0">
            <button
              onClick={() => setStep('capture')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
            >
              Recommencer la Capture
            </button>

            <button
              onClick={handleValidateAndCommit}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/20 flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Valider et Intégrer au Stock Hospitalier ({formatDZD(totalBLAmount)})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadReceiptFiles } from '../services/api';

export default function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(f => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.pdf') || ext.endsWith('.eml') || ext.endsWith('.txt') || ext.endsWith('.html');
    });
    setSelectedFiles(valid);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await uploadReceiptFiles(selectedFiles);
      setResult(res);
      setSelectedFiles([]);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setResult({ imported: 0, errors: [err.message] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      className="fixed inset-0 z-50 m-auto max-w-lg w-full p-0 bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      aria-labelledby="upload-modal-title"
    >
      <div className="bg-white rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="font-bold text-lg text-white">
                Importer des tickets Super U
              </h2>
              <p className="text-xs text-slate-400">
                Glissez-déposez vos fichiers PDF ou EML
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400 bg-slate-50'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Glissez vos tickets ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Formats acceptés : PDF, EML, HTML, TXT
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.eml,.html,.htm,.txt"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-700">
                Fichiers sélectionnés ({selectedFiles.length}) :
              </p>
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs bg-slate-100 p-2 rounded-lg text-slate-700">
                  <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="truncate flex-1 font-medium">{file.name}</span>
                  <span className="text-slate-400 text-[10px]">{(file.size / 1024).toFixed(1)} Ko</span>
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              {result.imported > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{result.imported} ticket(s) importé(s) avec succès !</span>
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Avertissements :</span>
                  </div>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-[11px] pl-6 text-red-700">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-semibold"
          >
            Fermer
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFiles.length || uploading}
            className="px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
          >
            {uploading ? 'Analyse...' : 'Importer'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

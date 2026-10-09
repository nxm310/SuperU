import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Key, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { getSyncStatus, testSyncConnection, startSync } from '../services/api';

export default function GmailSyncModal({ isOpen, onClose, onSyncComplete }) {
  const dialogRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('Votre ticket de caisse pour votre achat');
  
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  const [syncState, setSyncState] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [latestTicketDate, setLatestTicketDate] = useState(null);
  const [fullRescan, setFullRescan] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    // Load current config and status
    getSyncStatus().then(data => {
      setSyncState(data.state);
      if (data.latest_ticket_date) {
        setLatestTicketDate(data.latest_ticket_date);
      }
      if (data.config) {
        setEmail(data.config.imap_user || '');
        setPassword(data.config.imap_password || '');
        if (data.config.search_query) setSearchQuery(data.config.search_query);
      }
    }).catch(console.error);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Polling when sync is running
  useEffect(() => {
    let interval = null;
    if (syncing || syncState?.is_running) {
      interval = setInterval(() => {
        getSyncStatus().then(data => {
          setSyncState(data.state);
          if (!data.state.is_running) {
            setSyncing(false);
            if (data.state.progress_percent === 100) {
              if (onSyncComplete) onSyncComplete();
            }
          }
        }).catch(console.error);
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [syncing, syncState?.is_running, onSyncComplete]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!email || !password) {
      setTestResult({ success: false, message: 'Veuillez saisir votre adresse email et le mot de passe d\'application.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSyncConnection({ user: email, password });
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleStartSync = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir votre adresse email et mot de passe.');
      return;
    }
    setError(null);
    setSyncing(true);
    try {
      await startSync({ 
        user: email, 
        password, 
        search_query: searchQuery,
        full_rescan: fullRescan 
      });
    } catch (err) {
      setError(err.message);
      setSyncing(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      className="fixed inset-0 z-50 m-auto max-w-xl w-full p-0 bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      aria-labelledby="gmail-modal-title"
    >
      <div className="bg-white rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 id="gmail-modal-title" className="font-bold text-lg text-white">
                Synchronisation Gmail
              </h2>
              <p className="text-xs text-slate-400">
                Récupération automatique de vos tickets Super U
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
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Instructions Box */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 space-y-2">
            <div className="font-semibold flex items-center gap-1.5 text-sky-800 text-sm">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              Comment se connecter en toute sécurité ?
            </div>
            <p className="text-slate-600">
              Pour vous connecter à Gmail sans partager votre mot de passe principal, utilisez un <strong>Mot de passe d'application Google</strong> (16 caractères) :
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
              <li>Rendez-vous sur les mots de passe d'application Google :</li>
              <li className="list-none pl-4 py-1">
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold underline"
                >
                  Ouvrir Google App Passwords <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Donnez un nom (ex: "Super U") et cliquez sur <em>Créer</em>.</li>
              <li>Copiez le code de 16 lettres généré et collez-le ci-dessous.</li>
            </ol>
            <div className="pt-2 border-t border-sky-200 text-sky-950 text-[11px] leading-relaxed">
              🎯 <strong>Filtrage intelligent :</strong> Seuls les e-mails avec l'objet <em>"Votre ticket de caisse pour votre achat"</em> sont ciblés. Les reçus de carte bleue sont automatiquement écartés afin de n'importer que les articles détaillés de vos tickets de caisse.
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleStartSync} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse Gmail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="votre.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe d'application (16 caractères)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Incremental Scan Info */}
            {latestTicketDate && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>Dernier ticket en base : <strong>{latestTicketDate}</strong></span>
                  </div>
                  <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                    ⚡ Scan rapide
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  La recherche se limitera automatiquement aux e-mails reçus depuis cette date.
                </p>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1.5 border-t border-slate-200">
                  <input
                    type="checkbox"
                    checked={fullRescan}
                    onChange={(e) => setFullRescan(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                  />
                  <span>Forcer une réanalyse complète de tous les anciens e-mails (plus long)</span>
                </label>
              </div>
            )}

            {/* Test result display */}
            {testResult && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sync Progress Bar */}
            {(syncing || syncState?.is_running) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    Synchronisation en cours...
                  </span>
                  <span>{syncState?.progress_percent || 0}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncState?.progress_percent || 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  {syncState?.current_step}
                </p>
              </div>
            )}

            {/* Success message when finished */}
            {!syncing && !syncState?.is_running && syncState?.progress_percent === 100 && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncState.current_step}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || syncing || syncState?.is_running}
                className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-semibold disabled:opacity-50"
              >
                {testing ? 'Vérification...' : 'Tester la connexion'}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-semibold"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={syncing || syncState?.is_running}
                  className="px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing || syncState?.is_running ? 'animate-spin' : ''}`} />
                  {syncing || syncState?.is_running ? 'Synchronisation...' : 'Synchroniser maintenant'}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </dialog>
  );
}

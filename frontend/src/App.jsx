import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Mail,
  UploadCloud,
  Sparkles,
  Trash2,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import TicketsList from './components/TicketsList';
import PriceTracker from './components/PriceTracker';
import TicketDetailModal from './components/TicketDetailModal';
import ProductHistoryModal from './components/ProductHistoryModal';
import GmailSyncModal from './components/GmailSyncModal';
import UploadModal from './components/UploadModal';

import {
  fetchDashboardStats,
  fetchTicketDetail,
  deleteTicket,
  loadDemoData,
  clearDemoData,
  clearAllData
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState(null);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats(period);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  const handleSelectTicket = async (ticketId) => {
    try {
      const ticket = await fetchTicketDetail(ticketId);
      setSelectedTicket(ticket);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (window.confirm('Confirmer la suppression de ce ticket ?')) {
      await deleteTicket(ticketId);
      setSelectedTicket(null);
      loadStats();
    }
  };

  const handleLoadDemo = async () => {
    setDemoMenuOpen(false);
    await loadDemoData();
    loadStats();
  };

  const handleClearDemo = async () => {
    setDemoMenuOpen(false);
    if (window.confirm('Supprimer uniquement les données de démonstration ?')) {
      await clearDemoData();
      loadStats();
    }
  };

  const handleClearAll = async () => {
    setDemoMenuOpen(false);
    if (window.confirm('Attention : Êtes-vous sûr de vouloir supprimer TOUS les tickets et articles de la base ?')) {
      await clearAllData();
      loadStats();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Navbar Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-black text-xl shadow-md tracking-tighter">
                U
              </div>
              <div>
                <span className="font-black text-slate-900 tracking-tight text-lg leading-tight flex items-center gap-1.5">
                  Super U <span className="text-sky-600 font-semibold text-sm">Gestionnaire</span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium">
                  Tickets de caisse & Suivi des prix Gmail
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Tableau de Bord
              </button>

              <button
                onClick={() => setActiveTab('tickets')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'tickets'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Mes Tickets
                {stats?.total_tickets > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded-full text-[10px]">
                    {stats.total_tickets}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'products'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Suivi des Prix
              </button>
            </nav>

            {/* Actions: Sync, Upload, Demo */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                title="Importer un fichier PDF ou EML"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition text-xs font-semibold"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                Importer
              </button>

              <button
                onClick={() => setIsGmailModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition text-xs font-semibold shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Synchroniser</span> Gmail
              </button>

              {/* Demo menu dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                  className="p-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                  title="Données démo & gestion"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </button>

                {demoMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-xs z-50">
                    <button
                      onClick={handleLoadDemo}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Charger tickets démo
                    </button>
                    <button
                      onClick={handleClearDemo}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      Vider données démo
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={handleClearAll}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer TOUTE la base
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Mobile Navigation Tabs */}
          <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-1 px-3 rounded-lg font-semibold ${activeTab === 'dashboard' ? 'text-sky-600' : 'text-slate-500'}`}
            >
              Tableau de bord
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`py-1 px-3 rounded-lg font-semibold ${activeTab === 'tickets' ? 'text-sky-600' : 'text-slate-500'}`}
            >
              Tickets ({stats?.total_tickets || 0})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-1 px-3 rounded-lg font-semibold ${activeTab === 'products' ? 'text-sky-600' : 'text-slate-500'}`}
            >
              Suivi des Prix
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            period={period}
            setPeriod={setPeriod}
            onOpenSync={() => setIsGmailModalOpen(true)}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onLoadDemo={handleLoadDemo}
            onSelectProduct={(pName) => setSelectedProductName(pName)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'tickets' && (
          <TicketsList
            onSelectTicket={handleSelectTicket}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onOpenSync={() => setIsGmailModalOpen(true)}
          />
        )}

        {activeTab === 'products' && (
          <PriceTracker
            onSelectProduct={(pName) => setSelectedProductName(pName)}
          />
        )}
      </main>

      {/* Modals */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onDelete={handleDeleteTicket}
        />
      )}

      {selectedProductName && (
        <ProductHistoryModal
          productName={selectedProductName}
          onClose={() => setSelectedProductName(null)}
          onSelectTicket={handleSelectTicket}
        />
      )}

      <GmailSyncModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        onSyncComplete={() => {
          loadStats();
        }}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={() => {
          loadStats();
        }}
      />

    </div>
  );
}

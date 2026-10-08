import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Receipt,
  Eye,
  Trash2,
  Download,
  CreditCard,
  Plus
} from 'lucide-react';
import { fetchTickets, deleteTicket, fetchTicketDetail } from '../services/api';

export default function TicketsList({ onSelectTicket, onOpenUpload, onOpenSync }) {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [storeFilter, setStoreFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchTickets({
        search,
        startDate,
        endDate,
        store: storeFilter,
        limit: 100,
      });
      setTickets(res.tickets);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate, storeFilter]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer ce ticket de caisse ?')) {
      await deleteTicket(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Mes Tickets de Caisse Super U
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {total} ticket(s) archivé(s) et consultables
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/export/csv?type=tickets"
              download
              className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter CSV
            </a>
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter des tickets
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher par article, magasin ou n° de ticket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-900"
            />
          </div>

          {/* Date Range Start */}
          <div className="sm:col-span-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Date début"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700"
            />
          </div>

          {/* Date Range End */}
          <div className="sm:col-span-3">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Date fin"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700"
            />
          </div>

          {/* Reset Filters */}
          {(search || startDate || endDate || storeFilter) && (
            <div className="sm:col-span-1 flex items-center">
              <button
                onClick={() => {
                  setSearch('');
                  setStartDate('');
                  setEndDate('');
                  setStoreFilter('');
                }}
                className="text-xs text-red-600 hover:text-red-800 font-semibold"
              >
                Effacer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            Chargement des tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-semibold text-sm">
              Aucun ticket trouvé
            </p>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Synchronisez vos emails Gmail ou importez directement des fichiers PDF de caisse.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={onOpenSync}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 transition"
              >
                Synchroniser Gmail
              </button>
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Importer PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Magasin</th>
                  <th className="py-3 px-4">N° Ticket</th>
                  <th className="py-3 px-4 text-center">Articles</th>
                  <th className="py-3 px-4 text-right">Remises</th>
                  <th className="py-3 px-4 text-right">Carte U</th>
                  <th className="py-3 px-4 text-right">Total TTC</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t.id)}
                    className="hover:bg-sky-50/50 cursor-pointer transition group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                        {t.store_name}
                      </span>
                      {t.store_city && (
                        <span className="text-[10px] text-slate-400">{t.store_city}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {t.ticket_number}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-700 text-[11px]">
                        {t.items_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                      {t.discounts_total > 0 ? `-${t.discounts_total.toFixed(2)} €` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-sky-600">
                      {t.loyalty_earned > 0 ? `+${t.loyalty_earned.toFixed(2)} €` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-sm text-slate-900">
                      {t.total_amount.toFixed(2)} €
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(t.id);
                          }}
                          title="Voir le ticket"
                          className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(t.id, e)}
                          title="Supprimer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

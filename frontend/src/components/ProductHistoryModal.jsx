import React, { useEffect, useState, useRef } from 'react';
import { X, TrendingUp, TrendingDown, Calendar, Store, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchProductHistory } from '../services/api';

export default function ProductHistoryModal({ productName, onClose, onSelectTicket }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!productName) return;
    setLoading(true);
    fetchProductHistory(productName)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [productName]);

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  const chartData = data?.history.map(item => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    fullDate: new Date(item.date).toLocaleDateString('fr-FR'),
    price: item.price,
    store: item.store_name,
    qty: item.quantity,
  })) || [];

  const prices = data?.history.map(h => h.price) || [];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const currentPrice = prices.length ? prices[prices.length - 1] : 0;
  const firstPrice = prices.length ? prices[0] : 0;
  const diffPct = firstPrice > 0 ? (((currentPrice - firstPrice) / firstPrice) * 100).toFixed(1) : 0;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 m-auto max-w-2xl w-full p-0 bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      aria-labelledby="product-history-title"
    >
      <div className="bg-white rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 id="product-history-title" className="font-bold text-lg text-white">
                {productName}
              </h2>
              <p className="text-xs text-slate-400">
                Évolution et historique des achats
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
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Chargement de l'historique...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500 text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* Summary Badges */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[11px] font-medium text-slate-500 block">Dernier Prix</span>
                  <span className="text-xl font-bold text-slate-900">{currentPrice.toFixed(2)} €</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[11px] font-medium text-slate-500 block">Prix Min</span>
                  <span className="text-xl font-bold text-emerald-600">{minPrice.toFixed(2)} €</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[11px] font-medium text-slate-500 block">Prix Max</span>
                  <span className="text-xl font-bold text-red-600">{maxPrice.toFixed(2)} €</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[11px] font-medium text-slate-500 block">Évolution</span>
                  <div className={`flex items-center gap-1 text-base font-bold ${Number(diffPct) > 0 ? 'text-red-600' : Number(diffPct) < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {Number(diffPct) > 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : Number(diffPct) < 0 ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : null}
                    <span>{Number(diffPct) > 0 ? `+${diffPct}` : diffPct}%</span>
                  </div>
                </div>
              </div>

              {/* Price Graph */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  Courbe d'évolution du prix (€)
                </h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                      <YAxis
                        domain={['dataMin - 0.2', 'dataMax + 0.2']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        stroke="#cbd5e1"
                        tickFormatter={(v) => `${v.toFixed(2)}€`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-lg border border-slate-700 space-y-1">
                                <p className="font-semibold">{d.fullDate}</p>
                                <p className="text-sky-300 font-bold">{d.price.toFixed(2)} €</p>
                                <p className="text-slate-400 text-[10px]">{d.store}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0284c7', strokeWidth: 1.5, stroke: '#ffffff' }}
                        activeDot={{ r: 6, fill: '#0369a1' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Purchase History Table */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  Historique détaillé ({data?.history.length} achats)
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Magasin</th>
                        <th className="py-2.5 px-3 text-right">Quantité</th>
                        <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.history.slice().reverse().map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {new Date(item.date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 truncate max-w-[150px]">
                            {item.store_name}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.quantity} {item.unit_measure !== 'pièce' ? item.unit_measure : ''}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {item.price.toFixed(2)} €
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                onClose();
                                onSelectTicket(item.ticket_id);
                              }}
                              className="text-sky-600 hover:text-sky-800 font-semibold underline text-[11px]"
                            >
                              Voir ticket
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-xs font-semibold"
          >
            Fermer
          </button>
        </div>

      </div>
    </dialog>
  );
}

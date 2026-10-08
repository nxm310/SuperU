import React from 'react';
import {
  CreditCard,
  Receipt,
  ShoppingCart,
  Percent,
  Sparkles,
  TrendingUp,
  Store,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const CATEGORY_COLORS = {
  'Frais & Produits Laitiers': '#0284c7', // Sky
  'Boucherie & Poissonnerie': '#ef4444', // Red
  'Fruits & Légumes': '#22c55e', // Green
  'Boulangerie & Pâtisserie': '#f59e0b', // Amber
  'Épicerie Salée': '#8b5cf6', // Violet
  'Épicerie Sucrée': '#ec4899', // Pink
  'Boissons': '#06b6d4', // Cyan
  'Surgelés': '#3b82f6', // Blue
  'Entretien & Maison': '#14b8a6', // Teal
  'Hygiène & Beauté': '#a855f7', // Purple
  'Autre': '#94a3b8',
  'Épicerie Divers': '#64748b',
};

export default function Dashboard({
  stats,
  period,
  setPeriod,
  onOpenSync,
  onOpenUpload,
  onLoadDemo,
  onSelectProduct,
  onNavigateTab
}) {
  if (!stats) {
    return (
      <div className="py-20 text-center text-slate-400">
        Chargement des indicateurs...
      </div>
    );
  }

  const periodOptions = [
    { id: 'month', label: 'Ce mois' },
    { id: '3months', label: '3 derniers mois' },
    { id: 'year', label: 'Cette année' },
    { id: 'all', label: 'Tout l\'historique' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Tableau de Bord & Dépenses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi automatique de vos achats et tickets de caisse Super U
          </p>
        </div>

        {/* Period Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          {periodOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setPeriod(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                period === opt.id
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Spent */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Dépenses Totales</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.total_spent.toFixed(2)} €
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Sur {stats.total_tickets} ticket(s)
          </p>
        </div>

        {/* Card 2: Tickets Count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Tickets de Caisse</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.total_tickets}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.total_items} articles achetés
          </p>
        </div>

        {/* Card 3: Average Basket */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Panier Moyen</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.avg_ticket.toFixed(2)} €
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Par passage en caisse
          </p>
        </div>

        {/* Card 4: Discounts / Remises */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Économies & Promos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {stats.total_discounts.toFixed(2)} €
          </div>
          <p className="text-[11px] text-emerald-700/80 mt-1 font-medium">
            Remises immédiates déduites
          </p>
        </div>

        {/* Card 5: Carte U Loyalty Earned */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Gains Carte U</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600">
            +{stats.total_loyalty.toFixed(2)} €
          </div>
          <p className="text-[11px] text-indigo-700/80 mt-1 font-medium">
            Cagnottés sur la carte
          </p>
        </div>

      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Spending per Month (Bar Chart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Évolution des Dépenses par Mois
              </h2>
              <p className="text-xs text-slate-500">
                Dépenses réelles et remises obtenues
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-sky-600" /> Dépenses (€)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-emerald-500" /> Économies (€)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {stats.monthly_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthly_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" tickFormatter={(v) => `${v}€`} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl space-y-1">
                            <p className="font-bold text-slate-200">{label}</p>
                            <p className="text-sky-300 font-semibold">
                              Dépenses : {payload[0].value.toFixed(2)} €
                            </p>
                            {payload[1] && (
                              <p className="text-emerald-300">
                                Économies : {payload[1].value.toFixed(2)} €
                              </p>
                            )}
                            <p className="text-slate-400 text-[10px]">
                              {payload[0].payload.tickets_count} ticket(s) de caisse
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="discounts" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Aucune donnée sur cette période
              </div>
            )}
          </div>
        </div>

        {/* Categories Breakdown (Pie Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-slate-900">
              Répartition par Rayon
            </h2>
            <p className="text-xs text-slate-500">
              Part de chaque catégorie dans vos achats
            </p>
          </div>

          <div className="h-60 w-full my-auto">
            {stats.categories_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categories_breakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {stats.categories_breakdown.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={CATEGORY_COLORS[entry.category] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toFixed(2)} €`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Aucun rayon
              </div>
            )}
          </div>

          {/* Mini Legend List */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 text-xs mt-2 border-t border-slate-100 pt-2">
            {stats.categories_breakdown.slice(0, 5).map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#94a3b8' }}
                  />
                  <span className="text-slate-700 truncate">{cat.category}</span>
                </span>
                <span className="font-semibold text-slate-900">
                  {cat.percentage}% ({cat.amount.toFixed(0)}€)
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Row: Top Products & Stores Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Top 5 Produits les Plus Achetés
              </h2>
              <p className="text-xs text-slate-500">
                Par montant total dépensé
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
            >
              Voir tous les prix <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.top_products.length > 0 ? (
              stats.top_products.map((prod, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectProduct(prod.name)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {prod.category} • {prod.total_quantity} unités
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">
                      {prod.total_spent.toFixed(2)} €
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Moy: {prod.avg_unit_price.toFixed(2)} €
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-slate-400 text-xs">
                Aucun produit enregistré
              </p>
            )}
          </div>
        </div>

        {/* Stores Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Magasins Fréquentés
              </h2>
              <p className="text-xs text-slate-500">
                Répartition des visites par enseigne
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('tickets')}
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
            >
              Voir les tickets <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats.stores_summary.length > 0 ? (
              stats.stores_summary.map((st, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                      U
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {st.store_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {st.visits} visite(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-bold text-xs text-slate-900">
                    {st.spent.toFixed(2)} €
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-slate-400 text-xs">
                Aucun magasin enregistré
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

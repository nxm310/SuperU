import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  Search,
  X,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  LineChart as ChartIcon
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
  Cell
} from 'recharts';
import { autocompleteArticles } from '../services/api';

const CATEGORY_COLORS = {
  'Frais & Produits Laitiers': '#0284c7', // Sky
  'Boucherie & Charcuterie': '#ef4444', // Red
  'Poissonnerie': '#0ea5e9', // Light blue
  'Fruits & Légumes': '#22c55e', // Green
  'Boulangerie & Pâtisserie': '#f59e0b', // Amber
  'Épicerie Salée': '#8b5cf6', // Violet
  'Épicerie Sucrée': '#ec4899', // Pink
  'Boissons': '#06b6d4', // Cyan
  'Animalerie': '#f97316', // Orange
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
  selectedYear,
  setSelectedYear,
  articleSearch,
  setArticleSearch,
  onOpenSync,
  onOpenUpload,
  onLoadDemo,
  onSelectProduct,
  onNavigateTab
}) {
  const [searchInput, setSearchInput] = useState(articleSearch || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  // Synchronize input with external search state
  useEffect(() => {
    setSearchInput(articleSearch || '');
  }, [articleSearch]);

  // Autocomplete fetch
  useEffect(() => {
    if (searchInput.trim().length >= 2) {
      const timer = setTimeout(() => {
        autocompleteArticles(searchInput).then(res => {
          setSuggestions(res);
          setShowSuggestions(true);
        });
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchInput]);

  // Handle clicking outside suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    setArticleSearch(searchInput.trim());
  };

  const handleSelectSuggestion = (productName) => {
    setSearchInput(productName);
    setShowSuggestions(false);
    setArticleSearch(productName);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    setArticleSearch('');
  };

  const handleYearChange = (e) => {
    const yr = e.target.value;
    setSelectedYear(yr);
    if (yr !== 'all') {
      setPeriod('all'); // reset month/3months filter when selecting a specific year
    }
  };

  if (!stats) {
    return (
      <div className="py-20 text-center text-slate-400">
        Chargement des indicateurs...
      </div>
    );
  }

  const periodOptions = [
    { id: 'all', label: 'Tout' },
    { id: 'month', label: 'Ce mois' },
    { id: '3months', label: '3 mois' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Year Dropdown & Period Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Tableau de Bord & Dépenses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi automatique de vos tickets de caisse Super U
            {selectedYear !== 'all' ? ` — Année ${selectedYear}` : ''}
          </p>
        </div>

        {/* Controls: Year Dropdown & Period Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Year Dropdown Menu */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-sky-600" />
            <label htmlFor="year-select" className="text-xs font-semibold text-slate-600">
              Année :
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={handleYearChange}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Toutes les années</option>
              {stats.available_years && stats.available_years.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Period Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {periodOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setPeriod(opt.id);
                  if (opt.id !== 'all') {
                    setSelectedYear('all'); // reset specific year if selecting 'Ce mois'
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  period === opt.id && selectedYear === 'all'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Article Search Bar in Dashboard */}
      <div ref={searchContainerRef} className="relative bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sky-600 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher un article (ex: Pain, Lait, Beurre, Whiskey, Saumon, Haribo...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 bg-slate-50/50 focus:bg-white transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                title="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition text-xs font-semibold shadow-xs shrink-0"
          >
            Rechercher
          </button>
        </form>

        {/* Autocomplete Dropdown List */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-3 right-3 sm:left-4 sm:right-4 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-2xl z-40 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center">
              <span>Articles correspondants</span>
              <span className="text-[10px] text-slate-400">Cliquez pour voir la fiche</span>
            </div>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(item.name)}
                className="p-2.5 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Tag className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-800 group-hover:text-sky-900 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                    {item.category}
                  </span>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-bold text-slate-900">
                    {item.last_price.toFixed(2)} €
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {item.count} achat(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Article Search Results Section (if an article query is active) */}
      {articleSearch && (
        <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-600 text-white rounded-lg">
                <Tag className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Résultats pour « {articleSearch} »
                </h2>
                <p className="text-[11px] text-slate-500">
                  {stats.article_results?.length || 0} article(s) trouvé(s) sur la période sélectionnée
                </p>
              </div>
            </div>
            <button
              onClick={handleClearSearch}
              className="text-xs text-sky-700 hover:text-sky-900 font-semibold underline self-start sm:self-auto"
            >
              ✕ Réinitialiser la recherche d'articles
            </button>
          </div>

          {stats.article_results && stats.article_results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.article_results.map((art, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectProduct(art.name)}
                  className="bg-white p-3.5 rounded-xl border border-sky-200/80 shadow-xs hover:shadow-md hover:border-sky-400 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h3 className="font-bold text-xs text-slate-900 leading-tight">
                        {art.name}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 whitespace-nowrap">
                        {art.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] my-2 bg-slate-50 p-2 rounded-lg">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Total Dépensé</span>
                        <span className="font-bold text-slate-900 text-xs">{art.total_spent.toFixed(2)} €</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Achats</span>
                        <span className="font-semibold text-slate-800">{art.purchase_count} fois ({art.total_quantity} {art.unit_measure})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Dernier Prix</span>
                        <span className="font-bold text-sky-700">{art.current_price.toFixed(2)} €</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Fourchette</span>
                        <span className="text-slate-600">{art.min_price.toFixed(2)}€ - {art.max_price.toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                      art.price_change_pct > 0 ? 'text-red-600' : art.price_change_pct < 0 ? 'text-emerald-600' : 'text-slate-500'
                    }`}>
                      {art.price_change_pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : art.price_change_pct < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                      {art.price_change_pct > 0 ? `+${art.price_change_pct}%` : `${art.price_change_pct}%`}
                    </span>
                    <span className="text-sky-600 font-semibold text-[11px] flex items-center gap-1 group-hover:underline">
                      <ChartIcon className="w-3 h-3" />
                      Voir la courbe
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">
              Aucun article trouvé correspondant à ce mot-clé pour {selectedYear !== 'all' ? `l'année ${selectedYear}` : 'cette période'}.
            </p>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Spent */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">
              {selectedYear !== 'all' ? `Dépenses ${selectedYear}` : 'Dépenses Totales'}
            </span>
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
            Remises déduites
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
                Évolution des Dépenses par Mois {selectedYear !== 'all' ? `(${selectedYear})` : ''}
              </h2>
              <p className="text-xs text-slate-500">
                Dépenses réelles et volume d'achats
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-sky-600" /> Dépenses (€)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {stats.monthly_trend && stats.monthly_trend.length > 0 ? (
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
            {stats.categories_breakdown && stats.categories_breakdown.length > 0 ? (
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
            {stats.categories_breakdown && stats.categories_breakdown.slice(0, 5).map((cat, idx) => (
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
        
        {/* Top Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Top Produits les Plus Achetés
              </h2>
              <p className="text-xs text-slate-500">
                {selectedYear !== 'all' ? `Pour l'année ${selectedYear}` : 'Sur l\'ensemble de vos achats'}
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
            {stats.top_products && stats.top_products.length > 0 ? (
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
                Magasin Fréquenté
              </h2>
              <p className="text-xs text-slate-500">
                Détail de vos visites
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
            {stats.stores_summary && stats.stores_summary.length > 0 ? (
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

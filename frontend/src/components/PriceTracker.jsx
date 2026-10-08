import React, { useState, useEffect } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  LineChart as ChartIcon,
  Download,
  Filter
} from 'lucide-react';
import { fetchProducts, fetchInflation } from '../services/api';

const CATEGORIES = [
  'Tous les rayons',
  'Frais & Produits Laitiers',
  'Fruits & Légumes',
  'Boucherie & Poissonnerie',
  'Boulangerie & Pâtisserie',
  'Épicerie Salée',
  'Épicerie Sucrée',
  'Boissons',
  'Entretien & Maison',
  'Hygiène & Beauté'
];

export default function PriceTracker({ onSelectProduct }) {
  const [products, setProducts] = useState([]);
  const [inflation, setInflation] = useState({ highest_increases: [], highest_decreases: [] });
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous les rayons');
  const [sortBy, setSortBy] = useState('count');
  const [direction, setDirection] = useState('desc');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsRes, inflRes] = await Promise.all([
        fetchProducts({
          search,
          category: selectedCategory === 'Tous les rayons' ? '' : selectedCategory,
          sortBy,
          direction
        }),
        fetchInflation()
      ]);
      setProducts(prodsRes.products);
      setInflation(inflRes);
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
  }, [search, selectedCategory, sortBy, direction]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Observatoire des Prix Super U
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivez l'évolution des prix au centime près et repérez l'inflation
          </p>
        </div>

        <a
          href="/api/export/csv?type=items"
          download
          className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Exporter tous les articles CSV
        </a>
      </div>

      {/* Inflation Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Highest Increases */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Plus Fortes Hausses de Prix
              </h2>
              <p className="text-[11px] text-slate-400">
                Articles subissant la plus forte inflation
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {inflation.highest_increases && inflation.highest_increases.length > 0 ? (
              inflation.highest_increases.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectProduct(item.name)}
                  className="p-2.5 rounded-xl bg-red-50/50 hover:bg-red-50 border border-red-100 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="truncate max-w-[220px]">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      De {item.first_price.toFixed(2)}€ à {item.current_price.toFixed(2)}€
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-red-600">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{item.pct}%
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs italic py-2">
                Pas assez d'historique pour détecter des hausses
              </p>
            )}
          </div>
        </div>

        {/* Highest Decreases */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Plus Fortes Baisses & Bons Plans
              </h2>
              <p className="text-[11px] text-slate-400">
                Articles en baisse de prix ou en promo
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {inflation.highest_decreases && inflation.highest_decreases.length > 0 ? (
              inflation.highest_decreases.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectProduct(item.name)}
                  className="p-2.5 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="truncate max-w-[220px]">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      De {item.first_price.toFixed(2)}€ à {item.current_price.toFixed(2)}€
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {item.pct}%
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs italic py-2">
                Aucune baisse enregistrée
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Filter Bar & Category Pills */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher un produit (ex: Lait, Beurre, Poulet, Nutella...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="count">Trier par fréquence d'achat</option>
              <option value="name">Trier par nom</option>
              <option value="avg_price">Trier par prix moyen</option>
              <option value="last_date">Trier par date récente</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            Chargement des articles...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Aucun produit ne correspond à votre recherche.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Rayon</th>
                  <th className="py-3 px-4 text-center">Achats</th>
                  <th className="py-3 px-4 text-right">Premier Prix</th>
                  <th className="py-3 px-4 text-right">Prix Actuel</th>
                  <th className="py-3 px-4 text-center">Évolution</th>
                  <th className="py-3 px-4 text-right">Min / Max</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onSelectProduct(p.name)}
                    className="hover:bg-sky-50/50 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {p.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] text-slate-600 font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {p.purchase_count}x
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {p.first_price.toFixed(2)} €
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      {p.current_price.toFixed(2)} €
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          p.price_change_pct > 0
                            ? 'bg-red-50 text-red-600'
                            : p.price_change_pct < 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.price_change_pct > 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : p.price_change_pct < 0 ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : null}
                        {p.price_change_pct > 0 ? `+${p.price_change_pct}%` : `${p.price_change_pct}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                      {p.min_price.toFixed(2)}€ - {p.max_price.toFixed(2)}€
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(p.name);
                        }}
                        className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition inline-flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <ChartIcon className="w-3.5 h-3.5" />
                        Courbe
                      </button>
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

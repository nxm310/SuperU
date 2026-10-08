const API_BASE = '/api';

export async function fetchDashboardStats(period = 'all', startDate = null, endDate = null) {
  let url = `${API_BASE}/dashboard/stats?period=${period}`;
  if (startDate && endDate) {
    url += `&start_date=${startDate}&end_date=${endDate}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur lors du chargement des statistiques');
  return res.json();
}

export async function fetchTickets({ search = '', store = '', startDate = '', endDate = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (store) params.append('store', store);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  params.append('limit', limit);
  params.append('offset', offset);

  const res = await fetch(`${API_BASE}/tickets?${params.toString()}`);
  if (!res.ok) throw new Error('Erreur lors du chargement des tickets');
  return res.json();
}

export async function fetchTicketDetail(ticketId) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}`);
  if (!res.ok) throw new Error('Ticket introuvable');
  return res.json();
}

export async function deleteTicket(ticketId) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erreur lors de la suppression');
  return res.json();
}

export async function fetchProducts({ search = '', category = '', sortBy = 'count', direction = 'desc' } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  params.append('sort_by', sortBy);
  params.append('direction', direction);

  const res = await fetch(`${API_BASE}/products?${params.toString()}`);
  if (!res.ok) throw new Error('Erreur lors du chargement des produits');
  return res.json();
}

export async function fetchProductHistory(productName) {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(productName)}/history`);
  if (!res.ok) throw new Error('Historique du produit introuvable');
  return res.json();
}

export async function fetchInflation() {
  const res = await fetch(`${API_BASE}/inflation`);
  if (!res.ok) throw new Error('Erreur lors du calcul de l\'inflation');
  return res.json();
}

export async function getSyncStatus() {
  const res = await fetch(`${API_BASE}/sync/status`);
  if (!res.ok) throw new Error('Erreur statut synchronisation');
  return res.json();
}

export async function testSyncConnection(credentials) {
  const res = await fetch(`${API_BASE}/sync/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return res.json();
}

export async function startSync(credentials) {
  const res = await fetch(`${API_BASE}/sync/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Erreur lors du lancement de la synchronisation');
  }
  return res.json();
}

export async function uploadReceiptFiles(files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  const res = await fetch(`${API_BASE}/tickets/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Erreur lors de l\'envoi des fichiers');
  return res.json();
}

export async function loadDemoData() {
  const res = await fetch(`${API_BASE}/demo/load`, { method: 'POST' });
  if (!res.ok) throw new Error('Erreur chargement données de démo');
  return res.json();
}

export async function clearDemoData() {
  const res = await fetch(`${API_BASE}/demo/clear`, { method: 'POST' });
  if (!res.ok) throw new Error('Erreur nettoyage démo');
  return res.json();
}

export async function clearAllData() {
  const res = await fetch(`${API_BASE}/demo/clear-all`, { method: 'POST' });
  if (!res.ok) throw new Error('Erreur réinitialisation');
  return res.json();
}

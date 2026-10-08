import React, { useEffect, useRef } from 'react';
import { X, Trash2, Printer, ShoppingBag, Calendar, Tag, CreditCard, Sparkles } from 'lucide-react';

export default function TicketDetailModal({ ticket, onClose, onDelete }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!ticket) return null;

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const formattedDate = new Date(ticket.date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 m-auto max-w-xl w-full p-0 bg-transparent backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      aria-labelledby="ticket-modal-title"
    >
      <div className="bg-white rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-sky-400" />
            <h2 id="ticket-modal-title" className="font-semibold text-lg">
              Ticket {ticket.ticket_number}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              title="Imprimer"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(ticket.id)}
              title="Supprimer le ticket"
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              title="Fermer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-md rounded-lg p-6 font-mono text-xs text-slate-800 space-y-4">
            
            {/* Store Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-4">
              <div className="inline-block px-3 py-1 bg-sky-100 text-sky-800 font-bold rounded mb-1 text-sm tracking-wider">
                SYSTÈME U
              </div>
              <h3 className="font-bold text-sm tracking-wide uppercase mt-1">
                {ticket.store_name}
              </h3>
              {ticket.store_city && (
                <p className="text-slate-500">{ticket.store_city}</p>
              )}
              <div className="mt-2 text-[11px] text-slate-500 flex justify-between px-2">
                <span>Caisse: {ticket.caisse_number || '01'}</span>
                <span>N° {ticket.ticket_number}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between px-2 mt-0.5">
                <span>Date: {formattedDate}</span>
                <span className="capitalize">{ticket.payment_method || 'CB'}</span>
              </div>
            </div>

            {/* Articles List */}
            <div>
              <div className="flex justify-between font-bold text-slate-600 border-b border-slate-200 pb-1 mb-2 text-[11px]">
                <span>ARTICLE</span>
                <span>TOTAL</span>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {ticket.items && ticket.items.length > 0 ? (
                  ticket.items.map((item, idx) => (
                    <div key={idx} className="group">
                      <div className="flex justify-between items-baseline">
                        <span className="font-medium truncate max-w-[240px]">
                          {item.clean_name}
                        </span>
                        <span className="font-bold text-slate-900">
                          {item.total_price.toFixed(2)} €
                        </span>
                      </div>
                      
                      {/* Quantity or discount subline */}
                      <div className="flex justify-between text-[10px] text-slate-500 pl-2">
                        <span>
                          {item.quantity > 1 || item.unit_measure === 'kg' ? (
                            `${item.quantity} ${item.unit_measure !== 'pièce' ? item.unit_measure : ''} x ${item.unit_price.toFixed(2)} €`
                          ) : (
                            <span className="text-slate-400">{item.category}</span>
                          )}
                        </span>
                        {item.discount > 0 && (
                          <span className="text-emerald-600 font-semibold">
                            Promo: -{item.discount.toFixed(2)} €
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-center py-4">
                    Aucun article détaillé disponible
                  </p>
                )}
              </div>
            </div>

            {/* Totals Section */}
            <div className="border-t-2 border-slate-900 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-sm font-black text-slate-900">
                <span>TOTAL TTC</span>
                <span className="text-base text-sky-700">
                  {ticket.total_amount.toFixed(2)} €
                </span>
              </div>

              {ticket.discounts_total > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>DONT REMISES IMMÉDIATES</span>
                  <span>-{ticket.discounts_total.toFixed(2)} €</span>
                </div>
              )}

              {ticket.loyalty_earned > 0 && (
                <div className="flex justify-between text-sky-700 font-medium bg-sky-50 px-2 py-1 rounded">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    EUROS CARTE U OBTENUS
                  </span>
                  <span>+{ticket.loyalty_earned.toFixed(2)} €</span>
                </div>
              )}

              {ticket.loyalty_balance !== null && ticket.loyalty_balance !== undefined && (
                <div className="flex justify-between text-slate-600 text-[11px] px-2">
                  <span>NOUVEAU SOLDE CARTE U</span>
                  <span>{ticket.loyalty_balance.toFixed(2)} €</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                <span>NOMBRE D'ARTICLES</span>
                <span>{ticket.items_count || (ticket.items ? ticket.items.length : 0)}</span>
              </div>
            </div>

            {/* Simulated Barcode */}
            <div className="pt-4 text-center border-t border-dashed border-slate-300">
              <div className="h-8 bg-[repeating-linear-gradient(90deg,#1e293b,#1e293b_2px,transparent_2px,transparent_4px,#1e293b_4px,#1e293b_7px,transparent_7px,transparent_9px)] mx-auto max-w-[200px]" />
              <p className="text-[10px] text-slate-400 mt-1 tracking-widest">
                {ticket.ticket_number}
              </p>
              <p className="text-[10px] text-slate-400 mt-2 italic">
                Merci de votre visite et à bientôt chez U !
              </p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Source: {ticket.source_type} ({ticket.source_filename || 'direct'})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-sans text-xs font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </dialog>
  );
}

import React, { useState, useEffect } from 'react';
import { Wallet, Satellite, CheckCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { Parcel, PricingTier } from '../../types';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel: Parcel | null;
  walletBalance: number;
  onOrderCompleted: () => void;
  onAbandonedCheckout?: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  parcel,
  walletBalance,
  onOrderCompleted,
  onAbandonedCheckout,
}) => {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string>('tier_1');
  const [quote, setQuote] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [ordering, setOrdering] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTiers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (parcel && selectedTierId) {
      calculateQuote();
    }
  }, [parcel?.id, selectedTierId]);

  const loadTiers = async () => {
    try {
      const res = await api.getPricingTiers();
      setTiers(res);
    } catch (e) {
      console.error('Failed to load pricing tiers', e);
    }
  };

  const calculateQuote = async () => {
    if (!parcel) return;
    setLoading(true);
    try {
      const res = await api.quoteImagery(parcel.id, selectedTierId);
      setQuote(res);
    } catch (e) {
      console.error('Failed to calculate quote', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async () => {
    if (!parcel) return;
    setOrdering(true);
    try {
      const res = await api.orderImagery(parcel.id, selectedTierId);
      setOrderSuccess(`Order submitted! Order ID: ${res.order_id}. Remaining balance: $${res.remaining_wallet_balance}`);
      setTimeout(() => {
        setOrderSuccess(null);
        onOrderCompleted();
        onClose();
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Order failed');
    } finally {
      setOrdering(false);
    }
  };

  const handleClose = () => {
    if (selectedTierId !== 'tier_1' && !orderSuccess) {
      onAbandonedCheckout?.();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/95 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-extrabold text-slate-50">Acquire Satellite Imagery Tiers</h3>
              <p className="text-xs text-slate-400">Dynamic per-hectare quoting & automated cloud ingestion</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-50 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet Balance Display */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Active Enterprise Wallet Balance:</span>
          </div>
          <span className="text-lg font-black text-emerald-400">${walletBalance.toFixed(2)} USD</span>
        </div>

        {/* Tiers Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Satellite Resolution Tier:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTierId(t.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedTierId === t.id
                    ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                    : 'glass-panel border-slate-800 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-50">{t.name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {t.base_cost_per_ha === 0 ? 'FREE' : `$${t.base_cost_per_ha}/ha`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{t.sensors}</div>
                <div className="text-[10px] text-slate-500 mt-1">Resolution: {t.resolution_label} • Min: {t.min_hectares} ha</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quoting Ledger */}
        {quote && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Parcel Area:</span>
              <span className="font-bold text-slate-50">{quote.parcel_area_ha} ha (Billable: {quote.billable_hectares} ha)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Raw Provider Cost:</span>
              <span className="font-mono text-slate-50">${quote.raw_cost_usd}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Platform Markup ({(quote.markup_pct * 100).toFixed(0)}%):</span>
              <span className="font-mono text-slate-50">${(quote.total_cost_usd - quote.raw_cost_usd).toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold">
              <span className="text-slate-200">Total Order Cost:</span>
              <span className="text-emerald-400">${quote.total_cost_usd} USD</span>
            </div>
          </div>
        )}

        {orderSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{orderSuccess}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={ordering || !quote?.sufficient_funds}
            onClick={handleOrder}
            className="text-xs font-bold px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition shadow-lg shadow-emerald-700/20"
          >
            {ordering ? 'Dispatching Satellite Pipeline...' : `Confirm & Acquire ($${quote?.total_cost_usd || 0})`}
          </button>
        </div>
      </div>
    </div>
  );
};

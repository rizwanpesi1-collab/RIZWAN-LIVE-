import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
} from 'lucide-react';
import {
  OWNER_EMAIL,
  OWNER_WHATSAPP_DISPLAY,
  OWNER_WHATSAPP_RAW,
  PRO_LAYOUTS,
  type BroadcastLayoutId,
} from '../data/layouts';
import { DEFAULT_TEMPLATE_IMAGE } from './BroadcastStage';

interface AdminStatusResponse {
  envControlled: boolean;
  claimed: boolean;
  isAdmin: boolean;
}

interface CustomerLicenseRecord {
  email: string;
  unlockedLayoutIds: string[];
  active: boolean;
  note?: string;
  activatedAt: string;
}

interface LayoutGallerySectionProps {
  selectedLayoutId: BroadcastLayoutId;
  unlockedLayoutIds: BroadcastLayoutId[];
  activatedEmail: string | null;
  adminToken: string | null;
  onSelectLayout: (layoutId: BroadcastLayoutId) => void;
  onCustomerUnlocked: (email: string, layoutIds: BroadcastLayoutId[]) => void;
  onAdminAuthenticated: (token: string, layoutIds: BroadcastLayoutId[]) => void;
  onAdminLogout: () => void;
}

export const LayoutGallerySection: React.FC<LayoutGallerySectionProps> = ({
  selectedLayoutId,
  unlockedLayoutIds,
  activatedEmail,
  adminToken,
  onSelectLayout,
  onCustomerUnlocked,
  onAdminAuthenticated,
  onAdminLogout,
}) => {
  const isAdmin = Boolean(adminToken);

  // Visitor email license check
  const [visitorEmail, setVisitorEmail] = useState(activatedEmail || '');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckFeedback, setEmailCheckFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Owner admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  // Customer license management inside Admin panel
  const [customerLicenses, setCustomerLicenses] = useState<CustomerLicenseRecord[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerNote, setNewCustomerNote] = useState('');
  const [grantAllLayouts, setGrantAllLayouts] = useState(true);
  const [selectedGrantLayouts, setSelectedGrantLayouts] = useState<BroadcastLayoutId[]>(
    PRO_LAYOUTS.map((l) => l.id)
  );
  const [activatingCustomer, setActivatingCustomer] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);

  const fetchAdminStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/licenses/admin-status', {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (res.ok) {
        const data = (await res.json()) as AdminStatusResponse;
        setAdminStatus(data);
        if (adminToken && !data.isAdmin) {
          onAdminLogout();
        }
      }
    } catch {
      // Ignore network hiccup
    }
  }, [adminToken, onAdminLogout]);

  const fetchAdminLicenses = useCallback(async () => {
    if (!adminToken) return;
    setLoadingLicenses(true);
    try {
      const res = await fetch('/api/admin/licenses', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        onAdminLogout();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { licenses?: CustomerLicenseRecord[] };
        setCustomerLicenses(data.licenses || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingLicenses(false);
    }
  }, [adminToken, onAdminLogout]);

  useEffect(() => {
    fetchAdminStatus();
  }, [fetchAdminStatus]);

  useEffect(() => {
    if (showAdminPanel && adminToken) {
      fetchAdminLicenses();
    }
  }, [showAdminPanel, adminToken, fetchAdminLicenses]);

  const handleCheckVisitorEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = visitorEmail.trim().toLowerCase();
    if (!clean) {
      setEmailCheckFeedback({
        type: 'error',
        message: 'براہ کرم اپنا ای میل ایڈریس درج کریں۔',
      });
      return;
    }

    setCheckingEmail(true);
    setEmailCheckFeedback(null);
    try {
      const res = await fetch('/api/licenses/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      const data = (await res.json()) as {
        active?: boolean;
        unlockedLayoutIds?: BroadcastLayoutId[];
        error?: string;
      };
      if (!res.ok) {
        setEmailCheckFeedback({
          type: 'error',
          message: data.error || 'ای میل چیک کرنے میں مسئلہ آیا۔',
        });
        return;
      }

      if (data.active && data.unlockedLayoutIds && data.unlockedLayoutIds.length > 0) {
        onCustomerUnlocked(clean, data.unlockedLayoutIds);
        setEmailCheckFeedback({
          type: 'success',
          message: `مبارک ہو! ${clean} پر ${data.unlockedLayoutIds.length} پرو لے آؤٹس ایکٹو ہیں۔ اب آپ نیچے سے کوئی بھی ان لاک لے آؤٹ منتخب کر سکتے ہیں۔`,
        });
      } else {
        onCustomerUnlocked(clean, []);
        setEmailCheckFeedback({
          type: 'info',
          message: `یہ ای میل (${clean}) ابھی ایکٹو نہیں ہے۔ یہ ${PRO_LAYOUTS.length} پرو لے آؤٹس Paid ہیں — ایکٹو کروانے کے لیے نیچے دیے گئے واٹس ایپ نمبر ${OWNER_WHATSAPP_DISPLAY} پر رابطہ کریں۔`,
        });
      }
    } catch {
      setEmailCheckFeedback({
        type: 'error',
        message: 'سرور سے رابطہ نہیں ہو سکا، براہ کرم دوبارہ کوشش کریں۔',
      });
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleAdminClaimOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = adminPasswordInput.trim();
    if (!cleanPass) return;

    const isClaimMode = adminStatus && !adminStatus.claimed && !adminStatus.envControlled;
    const endpoint = isClaimMode ? '/api/admin/claim' : '/api/admin/login';

    setAdminAuthLoading(true);
    setAdminAuthError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass }),
      });
      const data = (await res.json()) as {
        token?: string;
        unlockedLayoutIds?: BroadcastLayoutId[];
        error?: string;
      };
      if (!res.ok || !data.token) {
        setAdminAuthError(data.error || 'Authentication failed.');
        return;
      }

      setAdminPasswordInput('');
      onAdminAuthenticated(
        data.token,
        data.unlockedLayoutIds || PRO_LAYOUTS.map((l) => l.id)
      );
      setAdminStatus({ envControlled: adminStatus?.envControlled || false, claimed: true, isAdmin: true });
      setAdminActionMessage('Owner Free Access فعال ہو گیا ہے — تمام 5 پرو لے آؤٹس آپ کے لیے مفت ہیں!');
    } catch {
      setAdminAuthError('سرور سے رابطہ نہیں ہو سکا۔');
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleActivateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    const cleanEmail = newCustomerEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    const layoutIdsToGrant = grantAllLayouts
      ? PRO_LAYOUTS.map((l) => l.id)
      : selectedGrantLayouts;

    if (layoutIdsToGrant.length === 0) {
      setAdminActionMessage('کم از کم ایک پرو لے آؤٹ منتخب کریں۔');
      return;
    }

    setActivatingCustomer(true);
    setAdminActionMessage(null);
    try {
      const res = await fetch('/api/admin/licenses/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          layoutIds: layoutIdsToGrant,
          note: newCustomerNote.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        licenses?: CustomerLicenseRecord[];
        error?: string;
      };
      if (res.status === 401) {
        onAdminLogout();
        return;
      }
      if (!res.ok) {
        setAdminActionMessage(data.error || 'کسٹمر ای میل ایکٹو نہیں ہو سکا۔');
        return;
      }
      setCustomerLicenses(data.licenses || []);
      setNewCustomerEmail('');
      setNewCustomerNote('');
      setAdminActionMessage(`${cleanEmail} پر ${layoutIdsToGrant.length} پرو لے آؤٹس کامیابی سے ایکٹو ہو گئے!`);
    } catch {
      setAdminActionMessage('ایکٹیویشن میں خرابی آئی، دوبارہ کوشش کریں۔');
    } finally {
      setActivatingCustomer(false);
    }
  };

  const handleRevokeCustomer = async (email: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/licenses/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ email }),
      });
      if (res.status === 401) {
        onAdminLogout();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { licenses?: CustomerLicenseRecord[] };
        setCustomerLicenses(data.licenses || []);
        setAdminActionMessage(`${email} کا لائسنس ختم (Revoke) کر دیا گیا۔`);
      }
    } catch {
      // ignore
    }
  };

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText('03327364509');
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      setCopiedPhone(false);
    }
  };

  const toggleGrantLayout = (id: BroadcastLayoutId) => {
    setSelectedGrantLayouts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const buildWhatsAppHref = (layoutTitle?: string) => {
    const emailPart = visitorEmail.trim() ? ` میرا ای میل: ${visitorEmail.trim()}` : '';
    const layoutPart = layoutTitle
      ? ` مجھے "${layoutTitle}" پرو لے آؤٹ ایکٹو کروانا ہے۔`
      : ` مجھے رضوان کرکٹ کے ${PRO_LAYOUTS.length} پرو براڈکاسٹ لے آؤٹس اپنے ای میل پر ایکٹو کروانے ہیں۔`;
    const text = `السلام علیکم!${layoutPart}${emailPart}`;
    return `https://wa.me/${OWNER_WHATSAPP_RAW}?text=${encodeURIComponent(text)}`;
  };

  return (
    <section
      aria-labelledby="pro-layouts-heading"
      className="rounded-xl border border-white/10 bg-[#121821] p-4 sm:p-6 space-y-6"
    >
      {/* Top Header + Owner Admin Trigger */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <h2 id="pro-layouts-heading" className="text-lg sm:text-xl font-bold text-white">
              {PRO_LAYOUTS.length} پریمیم براڈکاسٹ لے آؤٹس · Pro Broadcast Layouts
            </h2>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Owner Free Access Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Paid Pro · WhatsApp Activation
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300" dir="rtl">
            ڈیفالٹ کلاسک لے آؤٹ سب کے لیے فری ہے۔ نیچے دیے گئے {PRO_LAYOUTS.length} خوبصورت پرو براڈکاسٹ لے آؤٹس پریمیم صارفین کے لیے Paid ہیں — ایکٹو کروانے کے لیے واٹس ایپ{' '}
            <span className="font-bold text-emerald-400 tabular-nums" dir="ltr">
              {OWNER_WHATSAPP_DISPLAY}
            </span>{' '}
            پر رابطہ کریں، پھر آپ کے ای میل پر ان لاک کر دیے جائیں گے۔
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSelectLayout('free-classic')}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              selectedLayoutId === 'free-classic'
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            <img
              src={DEFAULT_TEMPLATE_IMAGE}
              alt=""
              className="h-4 w-7 rounded object-cover border border-white/20"
            />
            <span>Free Classic</span>
            {selectedLayoutId === 'free-classic' && <Check className="h-3.5 w-3.5 text-emerald-300" />}
          </button>

          <button
            type="button"
            onClick={() => setShowAdminPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              isAdmin
                ? 'border-emerald-500/50 bg-emerald-600/20 text-emerald-200 hover:bg-emerald-600/30'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isAdmin ? 'اونر ایڈمن پینل' : 'Owner Admin Login'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Owner Admin Panel */}
      {showAdminPanel && (
        <div className="rounded-xl border border-amber-500/30 bg-[#0D131C] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-400" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  اونر ایڈمن کنٹرول ({OWNER_EMAIL})
                </h3>
                <p className="text-[11px] text-slate-400">
                  اونر لاگ ان کے بعد تمام 5 پرو لے آؤٹس آپ کو مفت ملیں گے اور آپ کسٹمرز کے ای میل ایکٹو/بند کر سکیں گے۔
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={onAdminLogout}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                لاگ آؤٹ
              </button>
            )}
          </div>

          {!isAdmin ? (
            <form onSubmit={handleAdminClaimOrLogin} className="space-y-3 max-w-md">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-300" dir="rtl">
                {adminStatus && !adminStatus.claimed && !adminStatus.envControlled
                  ? 'پہلی بار اپنا خفیہ ایڈمن پاسورڈ سیٹ کریں (کم از کم 6 حروف)۔ اس کے بعد صرف آپ اسی پاسورڈ سے لاگ ان کر کے کسٹمرز کے ای میل ایکٹو کر سکیں گے۔'
                  : 'اپنا ایڈمن پاسورڈ درج کریں تاکہ آپ کو تمام 5 لے آؤٹس فری ان لاک ہوں اور کسٹمر ایکٹیویشن کھل جائے۔'}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder={
                    adminStatus && !adminStatus.claimed && !adminStatus.envControlled
                      ? 'نیا ایڈمن پاسورڈ سیٹ کریں (min 6 chars)'
                      : 'ایڈمن پاسورڈ درج کریں'
                  }
                  className="flex-1 rounded-lg border border-white/15 bg-[#0B0F14] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={adminAuthLoading || adminPasswordInput.trim().length < 4}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                >
                  {adminAuthLoading
                    ? 'جاری ہے...'
                    : adminStatus && !adminStatus.claimed && !adminStatus.envControlled
                      ? 'پاسورڈ سیٹ کریں & ان لاک'
                      : 'لاگ ان & فری ان لاک'}
                </button>
              </div>
              {adminAuthError && (
                <p className="text-xs text-rose-400">{adminAuthError}</p>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>
                  آپ بطور اونر ({OWNER_EMAIL}) لاگ ان ہیں۔ نیچے موجود تمام 5 پرو لے آؤٹس آپ کے لیے بالکل مفت ان لاک ہیں!
                </span>
              </div>

              {/* Activate Customer Email Form */}
              <form
                onSubmit={handleActivateCustomer}
                className="rounded-lg border border-white/10 bg-[#0B0F14] p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <UserCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>نیا کسٹمر ای میل ایکٹو کریں (Activate Customer Email)</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="email"
                    required
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="customer@gmail.com"
                    className="rounded-lg border border-white/15 bg-[#121821] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newCustomerNote}
                    onChange={(e) => setNewCustomerNote(e.target.value)}
                    placeholder="نوٹ (مثال: JazzCash / WhatsApp Paid)"
                    className="rounded-lg border border-white/15 bg-[#121821] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grantAllLayouts}
                      onChange={(e) => setGrantAllLayouts(e.target.checked)}
                      className="rounded border-white/20 accent-emerald-500"
                    />
                    <span>تمام {PRO_LAYOUTS.length} پرو لے آؤٹس ایکٹو کریں (All {PRO_LAYOUTS.length} Pro Layouts)</span>
                  </label>

                  {!grantAllLayouts && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {PRO_LAYOUTS.map((l) => {
                        const checked = selectedGrantLayouts.includes(l.id);
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => toggleGrantLayout(l.id)}
                            className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                              checked
                                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                                : 'border-white/15 bg-white/5 text-slate-400'
                            }`}
                          >
                            {l.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={activatingCustomer || !newCustomerEmail.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                  >
                    <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{activatingCustomer ? 'ایکٹو ہو رہا ہے...' : 'کسٹمر ای میل ایکٹو کریں'}</span>
                  </button>
                  {adminActionMessage && (
                    <span className="text-xs text-amber-300">{adminActionMessage}</span>
                  )}
                </div>
              </form>

              {/* Activated Customers List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">
                    ایکٹو کسٹمر ای میلز ({customerLicenses.length})
                  </span>
                  <button
                    type="button"
                    onClick={fetchAdminLicenses}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    {loadingLicenses ? 'لوڈ ہو رہا ہے...' : 'فہرست ریفریش کریں'}
                  </button>
                </div>

                {customerLicenses.length === 0 ? (
                  <p className="rounded-lg border border-white/10 bg-[#0B0F14] px-3 py-3 text-xs text-slate-400">
                    ابھی کوئی کسٹمر ای میل ایکٹو نہیں ہے۔ واٹس ایپ پر پیمنٹ آنے کے بعد اوپر فارم میں ای میل درج کر کے ایکٹو کریں۔
                  </p>
                ) : (
                  <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-[#0B0F14]">
                    {customerLicenses.map((lic) => (
                      <div
                        key={lic.email}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{lic.email}</span>
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              {lic.unlockedLayoutIds.length}/{PRO_LAYOUTS.length} Layouts
                            </span>
                            {lic.note && (
                              <span className="text-[11px] text-slate-400">({lic.note})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Activated: {new Date(lic.activatedAt).toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeCustomer(lic.email)}
                          className="inline-flex items-center gap-1 self-start sm:self-auto rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visitor Email License Check Bar */}
      {!isAdmin && (
        <div className="rounded-xl border border-white/10 bg-[#0D131C] p-4 space-y-3">
          <form
            onSubmit={handleCheckVisitorEmail}
            className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Mail className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>کیا آپ نے واٹس ایپ پر پیمنٹ کر کے ای میل ایکٹو کروا لیا ہے؟</span>
              </div>
              <p className="text-xs text-slate-400">
                اپنا ای میل درج کر کے چیک کریں — ایڈمن سے ایکٹیویشن کے بعد پانچوں پرو لے آؤٹس فوراً کھل جائیں گے۔
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:min-w-[380px]">
              <input
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="اپنا ای میل درج کریں (example@gmail.com)"
                className="flex-1 rounded-lg border border-white/15 bg-[#0B0F14] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={checkingEmail}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
              >
                <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{checkingEmail ? 'چیک ہو رہا ہے...' : 'ای میل چیک & ان لاک'}</span>
              </button>
            </div>
          </form>

          {emailCheckFeedback && (
            <div
              dir="rtl"
              className={`rounded-lg border px-3 py-2 text-xs ${
                emailCheckFeedback.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : emailCheckFeedback.type === 'error'
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
              }`}
            >
              {emailCheckFeedback.message}
            </div>
          )}
        </div>
      )}

      {/* 5 Pro Layouts Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRO_LAYOUTS.map((layout, idx) => {
          const isUnlocked = isAdmin || unlockedLayoutIds.includes(layout.id);
          const isSelected = selectedLayoutId === layout.id;

          return (
            <article
              key={layout.id}
              className={`group flex flex-col overflow-hidden rounded-xl border transition-all bg-[#0B0F14] ${
                isSelected
                  ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                  : isUnlocked
                    ? 'border-white/20 hover:border-emerald-400/50'
                    : 'border-amber-500/25 hover:border-amber-400/60'
              }`}
            >
              {/* 16:9 Artwork Preview */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <img
                  src={layout.imageUrl}
                  alt={layout.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

                {/* Top Left: Layout Number & Status */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="rounded bg-black/75 px-2 py-0.5 text-[10px] font-bold text-slate-200 border border-white/15">
                    PRO #{idx + 1}
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      ACTIVE LIVE
                    </span>
                  ) : isUnlocked ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                      <Unlock className="h-3 w-3" aria-hidden="true" />
                      {isAdmin ? 'FREE FOR OWNER' : 'UNLOCKED'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      PAID PRO
                    </span>
                  )}
                </div>

                {/* Bottom Overlay Title */}
                <div className="absolute bottom-2.5 inset-x-3 flex items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{layout.urduTitle}</h3>
                    <p className="text-[11px] font-medium text-slate-300">{layout.name}</p>
                  </div>
                </div>
              </div>

              {/* Card Body + Action */}
              <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
                <p className="text-xs text-slate-400">{layout.subtitle}</p>

                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectLayout(layout.id)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span>یہ لے آؤٹ لائیو چل رہا ہے</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        <span>اس لے آؤٹ کو لائیو لگائیں</span>
                      </>
                    )}
                  </button>
                ) : (
                  <a
                    href={buildWhatsAppHref(layout.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-600/30 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span>واٹس ایپ پر ایکٹو کروائیں · {OWNER_WHATSAPP_DISPLAY}</span>
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* WhatsApp Direct Activation Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-emerald-500/35 bg-gradient-to-r from-[#0F241B] via-[#0E1924] to-[#0B0F14] p-4 sm:p-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>فوری واٹس ایپ ایکٹیویشن</span>
          </div>
          <h3 className="text-base font-bold text-white" dir="rtl">
            اپنے ای میل پر تمام {PRO_LAYOUTS.length} پرو لے آؤٹس ایکٹو کروائیں
          </h3>
          <p className="text-xs text-slate-300" dir="rtl">
            پیمنٹ کے بعد واٹس ایپ نمبر پر اپنا ای میل بھیجیں — ایڈمن فوراً آپ کے ای میل پر تمام پریمیم لے آؤٹس ان لاک کر دے گا۔
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="rounded-lg border border-white/10 bg-black/40 px-3.5 py-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">WhatsApp Number</div>
              <div className="text-base sm:text-lg font-extrabold tracking-wide text-emerald-400 tabular-nums">
                {OWNER_WHATSAPP_DISPLAY}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyPhone}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
            >
              {copiedPhone ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>کاپی ہو گیا</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>نمبر کاپی</span>
                </>
              )}
            </button>
          </div>

          <a
            href={buildWhatsAppHref()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>واٹس ایپ پر رابطہ کریں</span>
          </a>
        </div>
      </div>
    </section>
  );
};

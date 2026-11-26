import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  Radio,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import type {
  BackdropMode,
  BroadcastLanguage,
  ImageExtractionResult,
  LiveCricketMatch,
} from '../types/cricket';

interface StudioPanelProps {
  match: LiveCricketMatch | null;
  backdropMode: BackdropMode;
  language: BroadcastLanguage;
  autoRefresh: boolean;
  shareUrl: string | null;
  copied: boolean;
  isSavingLink: boolean;
  onChangeBackdropMode: (mode: BackdropMode) => void;
  onChangeCustomBackdrop: (dataUrl: string) => void;
  onChangeLanguage: (lang: BroadcastLanguage) => void;
  onToggleAutoRefresh: (enabled: boolean) => void;
  onUpdatePlayerPhoto: (role: 'batter1' | 'batter2' | 'bowler', dataUrl: string) => void;
  onApplyImageExtraction: (result: ImageExtractionResult, uploadedPreviewUrl: string) => void;
  onUpdateMatchField: (updater: (prev: LiveCricketMatch) => LiveCricketMatch) => void;
  onCopyLink: () => void;
  onOpenYouTubeLive: () => void;
}

export const StudioPanel: React.FC<StudioPanelProps> = ({
  match,
  backdropMode,
  language,
  autoRefresh,
  shareUrl,
  copied,
  isSavingLink,
  onChangeBackdropMode,
  onChangeCustomBackdrop,
  onChangeLanguage,
  onToggleAutoRefresh,
  onUpdatePlayerPhoto,
  onApplyImageExtraction,
  onUpdateMatchField,
  onCopyLink,
  onOpenYouTubeLive,
}) => {
  const smartUploadRef = useRef<HTMLInputElement>(null);
  const batter1Ref = useRef<HTMLInputElement>(null);
  const batter2Ref = useRef<HTMLInputElement>(null);
  const bowlerRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLInputElement>(null);

  const [extracting, setExtracting] = useState(false);
  const [extractFeedback, setExtractFeedback] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [lastUploadedPreview, setLastUploadedPreview] = useState<string | null>(null);
  const [showManualEditor, setShowManualEditor] = useState(false);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Failed to read file'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleSmartImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setExtracting(true);
    setExtractError(null);
    setExtractFeedback(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLastUploadedPreview(dataUrl);

      const commaIndex = dataUrl.indexOf(',');
      const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;

      const res = await fetch('/api/cricket/extract-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || 'image/jpeg',
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Image extraction failed');
      }

      const result = payload as ImageExtractionResult;
      onApplyImageExtraction(result, dataUrl);
      setExtractFeedback(
        result.confidenceNote ||
          'تصویر سے کرکٹ اسکور اور پلیئرز کا ڈیٹا کامیابی سے شامل کر دیا گیا ہے۔'
      );
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : 'تصویر سے ڈیٹا نکالنے میں مسئلہ پیش آیا'
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleSinglePhotoUpload =
    (target: 'batter1' | 'batter2' | 'bowler' | 'backdrop') =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      const dataUrl = await readFileAsDataUrl(file);
      if (target === 'backdrop') {
        onChangeCustomBackdrop(dataUrl);
      } else {
        onUpdatePlayerPhoto(target, dataUrl);
      }
    };

  return (
    <section
      id="image-upload-studio"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Left Column (7 cols): Smart Image Upload + Player Photo Slots */}
      <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#121821] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              تصویر اپلوڈ اور آٹو ڈیٹا · Image Upload Studio
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              اسکور کارڈ کی تصویر اپلوڈ کر کے لائیو ڈیٹا نکالیں یا 2 بلے باز اور 1 بالر کی تصاویر لگائیں
            </p>
          </div>

          <input
            ref={smartUploadRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSmartImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => smartUploadRef.current?.click()}
            disabled={extracting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {extracting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {extracting
                ? 'تصویر اسکین ہو رہی ہے...'
                : 'تصویر اپلوڈ کریں (آٹو ڈیٹا)'}
            </span>
          </button>
        </div>

        {/* Extraction Status & Quick Role Assignment */}
        {extractError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
            {extractError}
          </div>
        )}

        {extractFeedback && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-200 space-y-2.5">
            <div className="font-medium">{extractFeedback}</div>
            {lastUploadedPreview && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-slate-300">اس تصویر کو یہاں بھی سیٹ کریں:</span>
                <button
                  type="button"
                  onClick={() => onUpdatePlayerPhoto('batter1', lastUploadedPreview)}
                  className="rounded border border-white/15 bg-[#0B0F14] px-2.5 py-1 text-white hover:border-emerald-400 cursor-pointer"
                >
                  بلے باز 1
                </button>
                <button
                  type="button"
                  onClick={() => onUpdatePlayerPhoto('batter2', lastUploadedPreview)}
                  className="rounded border border-white/15 bg-[#0B0F14] px-2.5 py-1 text-white hover:border-emerald-400 cursor-pointer"
                >
                  بلے باز 2
                </button>
                <button
                  type="button"
                  onClick={() => onUpdatePlayerPhoto('bowler', lastUploadedPreview)}
                  className="rounded border border-white/15 bg-[#0B0F14] px-2.5 py-1 text-white hover:border-emerald-400 cursor-pointer"
                >
                  بالر
                </button>
                <button
                  type="button"
                  onClick={() => onChangeCustomBackdrop(lastUploadedPreview)}
                  className="rounded border border-white/15 bg-[#0B0F14] px-2.5 py-1 text-white hover:border-emerald-400 cursor-pointer"
                >
                  بیک گراؤنڈ
                </button>
              </div>
            )}
          </div>
        )}

        {/* Direct Player Photo Upload Grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            ref={batter1Ref}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSinglePhotoUpload('batter1')}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => batter1Ref.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0D131B] p-4 text-center hover:border-emerald-500/60 transition-colors cursor-pointer"
          >
            <ImagePlus className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-white">بلے باز 1 تصویر</span>
            <span className="text-[11px] text-slate-400 truncate max-w-full">
              {match?.batter1.name || 'Batter 1'}
            </span>
          </button>

          <input
            ref={batter2Ref}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSinglePhotoUpload('batter2')}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => batter2Ref.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0D131B] p-4 text-center hover:border-emerald-500/60 transition-colors cursor-pointer"
          >
            <ImagePlus className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-white">بلے باز 2 تصویر</span>
            <span className="text-[11px] text-slate-400 truncate max-w-full">
              {match?.batter2.name || 'Batter 2'}
            </span>
          </button>

          <input
            ref={bowlerRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSinglePhotoUpload('bowler')}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => bowlerRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0D131B] p-4 text-center hover:border-amber-400/60 transition-colors cursor-pointer"
          >
            <ImagePlus className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-white">بالر تصویر</span>
            <span className="text-[11px] text-slate-400 truncate max-w-full">
              {match?.bowler.name || 'Bowler'}
            </span>
          </button>

          <input
            ref={backdropRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSinglePhotoUpload('backdrop')}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => backdropRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0D131B] p-4 text-center hover:border-blue-400/60 transition-colors cursor-pointer"
          >
            <ImagePlus className="h-5 w-5 text-blue-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-white">بیک گراؤنڈ</span>
            <span className="text-[11px] text-slate-400">Stadium / Banner</span>
          </button>
        </div>

        {/* Optional Quick Broadcast Text Adjustment */}
        {match && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowManualEditor((s) => !s)}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {showManualEditor
                  ? 'فوری ایڈیٹر بند کریں'
                  : 'پلیئرز کے نام یا اسکور فوری ایڈجسٹ کریں'}
              </span>
            </button>

            {showManualEditor && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-white/10 bg-[#0B0F14] p-3.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    بلے باز 1 نام
                  </label>
                  <input
                    type="text"
                    value={match.batter1.name}
                    onChange={(e) =>
                      onUpdateMatchField((prev) => ({
                        ...prev,
                        batter1: { ...prev.batter1, name: e.target.value },
                      }))
                    }
                    className="w-full rounded border border-white/10 bg-[#121821] px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    بلے باز 2 نام
                  </label>
                  <input
                    type="text"
                    value={match.batter2.name}
                    onChange={(e) =>
                      onUpdateMatchField((prev) => ({
                        ...prev,
                        batter2: { ...prev.batter2, name: e.target.value },
                      }))
                    }
                    className="w-full rounded border border-white/10 bg-[#121821] px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    بالر نام
                  </label>
                  <input
                    type="text"
                    value={match.bowler.name}
                    onChange={(e) =>
                      onUpdateMatchField((prev) => ({
                        ...prev,
                        bowler: { ...prev.bowler, name: e.target.value },
                      }))
                    }
                    className="w-full rounded border border-white/10 bg-[#121821] px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column (5 cols): Copyable Broadcast Link & Studio Settings */}
      <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#121821] p-5 sm:p-6 flex flex-col justify-between gap-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            شیئر ایبل براڈکاسٹ لنک · Live Overlay Link
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            اس لنک کو کاپی کر کے براؤزر، OBS یا یوٹیوب لائیو اسٹریمنگ میں براہ راست چلائیں
          </p>

          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl || 'لنک جنریٹ کرنے کے لیے بٹن دبائیں...'}
              aria-label="Shareable Broadcast Overlay Link"
              className="flex-1 rounded-lg border border-white/10 bg-[#0B0F14] px-3 py-2 font-mono-tabular text-xs text-slate-200 focus:outline-none"
            />
            <button
              type="button"
              onClick={onCopyLink}
              disabled={isSavingLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>کاپی</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>کاپی لنک</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {shareUrl && (
              <a
                href={shareUrl}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                <span>فل اسکرین براڈکاسٹ ویو میں جائیں</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={onOpenYouTubeLive}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
            >
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              <span>YouTube ڈائریکٹ لائیو (Stream Key)</span>
            </button>
          </div>
        </div>

        {/* Backdrop & Broadcast Display Controls */}
        <div className="space-y-4 border-t border-white/10 pt-4">
          <div>
            <div className="text-xs font-medium text-slate-300 mb-2">
              براڈکاسٹ بیک گراؤنڈ موڈ (Template / OBS / Studio)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-lg bg-[#0B0F14] p-1">
              {(
                [
                  { id: 'template', label: 'گرافک ٹیمپلیٹ' },
                  { id: 'stadium', label: 'اسٹیڈیم' },
                  { id: 'chroma', label: 'گرین اسکرین' },
                  { id: 'dark', label: 'ڈارک موڈ' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeBackdropMode(mode.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    backdropMode === mode.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-300 mb-1.5">
                زبان (Language)
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-[#0B0F14] p-1">
                {(
                  [
                    { id: 'bilingual', label: 'دونوں' },
                    { id: 'ur', label: 'اردو' },
                    { id: 'en', label: 'English' },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onChangeLanguage(l.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      language === l.id
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => onToggleAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#0B0F14] text-emerald-500 focus:ring-emerald-500"
              />
              <span>آٹو لائیو اپ ڈیٹ (45s)</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { Check, Copy } from 'lucide-react';

interface TopBarProps {
  onCopyLink: () => void;
  copied: boolean;
  isSavingLink: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onCopyLink, copied, isSavingLink }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F14]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#broadcast-stage"
          className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          رضوان کرکٹ · Rizwan Cricket
        </a>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          <a
            href="#broadcast-stage"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            لائیو براڈکاسٹ
          </a>
          <a
            href="#live-matches"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            لائیو میچز
          </a>
          <a
            href="#tournaments"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            ٹورنامنٹس
          </a>
          <a
            href="#image-upload-studio"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            تصویر اپلوڈ
          </a>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onCopyLink}
            disabled={isSavingLink}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>لنک کاپی ہو گیا</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isSavingLink ? 'تیار ہو رہا ہے...' : 'کاپی براڈکاسٹ لنک'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

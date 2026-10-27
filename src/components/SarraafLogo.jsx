import React from 'react';

/**
 * SarraafLogo — لوگوی تخصصی «حساب صراف»
 * نماد سکه با فلش رشد، رنگ طلایی و نیلی
 */
export default function SarraafLogo({ size = 64, className = '', showText = false }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F4D06F" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
          <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#312E81" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>

        {/* دایره پس‌زمینه نیلی */}
        <circle cx="60" cy="60" r="56" fill="url(#indigoGrad)" />

        {/* حلقه طلایی بیرونی سکه */}
        <circle cx="60" cy="60" r="44" fill="none" stroke="url(#goldGrad)" strokeWidth="4" />
        <circle cx="60" cy="60" r="38" fill="none" stroke="url(#goldGrad)" strokeWidth="1.5" opacity="0.6" />

        {/* بدنه سکه طلایی */}
        <circle cx="60" cy="60" r="34" fill="url(#goldGrad)" />

        {/* نقش داخلی سکه — الگوی افغانی */}
        <circle cx="60" cy="60" r="28" fill="none" stroke="#8B6914" strokeWidth="1" opacity="0.4" />

        {/* فلش رشد — نماد صرافی و ارز */}
        <path
          d="M44 72 L56 58 L64 66 L78 48"
          stroke="url(#arrowGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* سر فلش */}
        <path
          d="M70 46 L80 46 L80 56"
          stroke="url(#arrowGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* ستاره تزئینی بالا */}
        <circle cx="60" cy="34" r="3" fill="#FFFAE6" opacity="0.8" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-extrabold text-foreground text-lg">حساب صراف</span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wider">
            HESAB SARRAF
          </span>
        </div>
      )}
    </div>
  );
}
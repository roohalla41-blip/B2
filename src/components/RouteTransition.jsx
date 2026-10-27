import React, { Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const LOAD_WARNING_AFTER_MS = 12000;

function PageLoader() {
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsDelayed(true), LOAD_WARNING_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (isDelayed) {
    return (
      <div dir="rtl" role="status" className="flex min-h-[60vh] w-full items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-background p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold">بارگذاری برنامه طول کشیده است</h2>
          <p className="text-sm text-muted-foreground">
            ممکن است اتصال اینترنت یا بارگذاری یکی از فایل‌های برنامه با مشکل روبه‌رو شده باشد.
            لطفاً یک‌بار دوباره تلاش کنید. اگر مشکل تکرار شد، این پیام را گزارش دهید.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full" role="status" aria-label="در حال بارگذاری">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * RouteTransition — wraps Routes with framer-motion AnimatePresence
 * for smooth fade/slide transitions on route changes.
 * Suspense supports React.lazy() page components and provides a visible
 * recovery option if a lazy-loaded page does not resolve in time.
 */
export default function RouteTransition({ children }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="min-h-0"
      >
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

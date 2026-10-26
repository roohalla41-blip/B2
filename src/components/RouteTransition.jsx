import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * RouteTransition — wraps Routes with framer-motion AnimatePresence
 * for smooth fade/slide transitions on route changes.
 * Suspense is nested inside to support React.lazy() page components.
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
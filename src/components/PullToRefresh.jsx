import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 100;

/**
 * Lightweight pull-to-refresh gesture wrapper for scrollable list views.
 * Triggers queryClient.refetchQueries() when the user pulls down past THRESHOLD.
 * Only activates when the page is scrolled to the very top.
 */
export default function PullToRefresh({ children }) {
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDist = useRef(0);
  const containerRef = useRef(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      if (window.scrollY > 0 || refreshingRef.current) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const handleTouchMove = (e) => {
      if (!pulling.current || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        e.preventDefault();
        pullDist.current = Math.min(delta * 0.5, MAX_PULL);
        setPullDistance(pullDist.current);
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDist.current >= THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(THRESHOLD);
        try {
          await queryClient.refetchQueries();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          pullDist.current = 0;
        }
      } else {
        setPullDistance(0);
        pullDist.current = 0;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [queryClient]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef}>
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: isRefreshing ? 40 : pullDistance }}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <RefreshCw
              className="w-5 h-5 text-primary transition-transform duration-200"
              style={{ transform: `rotate(${progress * 360}deg)`, opacity: progress }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * useHardwareBack — Maps Android hardware back button (and browser back)
 * to navigation pop states within the SPA.
 *
 * - If an overlay (modal/drawer) is open, closes it via the provided callback.
 * - Otherwise navigates back via history.
 * - Prevents leaving the app on the root route by going to the home screen.
 *
 * @param {function|null} onCloseOverlay - callback when an overlay is open
 * @param {boolean} overlayOpen - whether any overlay is currently open
 */
export function useHardwareBack(onCloseOverlay, overlayOpen = false) {
  const navigate = useNavigate();
  const location = useLocation();
  const overlayRef = useRef(overlayOpen);

  useEffect(() => {
    overlayRef.current = overlayOpen;
  }, [overlayOpen]);

  useEffect(() => {
    const handlePopState = (e) => {
      // If an overlay is open, close it and re-push state so user stays on page
      if (overlayRef.current && typeof onCloseOverlay === 'function') {
        onCloseOverlay();
        // Push state back so the overlay close doesn't trigger navigation
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // On root routes, prevent leaving the app
      const rootPaths = ['/', '/login', '/customer'];
      if (rootPaths.includes(location.pathname)) {
        // Push state back to prevent exiting
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // Otherwise let normal browser back navigation happen
      // navigate(-1) is the default behavior for popstate
    };

    // Push initial state so we always have something to pop
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname, onCloseOverlay]);
}
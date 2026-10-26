import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import { canAccessRoute, HOME_BY_ROLE } from '@/lib/rbac';
import { checkBuilderAccess, fetchAndCacheBuilderAccess } from '@/lib/builderAccess';
import { useEffect, useState } from 'react';

// ── AdminRoute ──
// برای نقش‌های مدیریتی: creator و admin
// همچنین بررسی دسترسی کمک‌سازنده‌ها برای پنل سازنده
export default function AdminRoute() {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasBuilderAccess, setHasBuilderAccess] = useState(false);

  useEffect(() => {
    if (!user || !isAuthenticated) {
      setAccessChecked(true);
      return;
    }
    // Creator always has access
    if (user.role === 'creator' || user.role === 'admin') {
      setHasBuilderAccess(true);
      setAccessChecked(true);
      return;
    }
    // Check co-creator access
    fetchAndCacheBuilderAccess().then(() => {
      const access = checkBuilderAccess(user);
      setHasBuilderAccess(!!access);
      setAccessChecked(true);
    });
  }, [user, isAuthenticated]);

  if (isLoadingAuth || !accessChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // پنل سازنده فقط آنلاین — حتی خود سازنده باید آنلاین وارد شود
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return <Navigate to="/login" replace state={{ reason: 'offline_admin' }} />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role || 'user';

  // Creator and admin always pass
  if (role === 'creator' || role === 'admin') {
    if (!canAccessRoute(role, location.pathname)) {
      const home = HOME_BY_ROLE[role] || '/';
      return <Navigate to={home} replace />;
    }
    return <Outlet />;
  }

  // Co-creator: only builder panel, check tab permissions
  if (location.pathname.startsWith('/builder')) {
    if (!hasBuilderAccess) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
  }

  // Non-admin users: redirect to dashboard
  return <Navigate to="/dashboard" replace />;
}
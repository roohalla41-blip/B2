import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import { canAccessRoute, HOME_BY_ROLE } from '@/lib/rbac';

// ── ProtectedRoute ──
// محافظت از مسیرها بر اساس نقش کاربر
// - unauthenticatedElement: المانی که برای کاربران واردنشده نمایش داده می‌شود
// - requiredRole: نقش مورد نیاز (برای پنل مشتری: 'customer')
// - allowedRoles: لیست نقش‌های مجاز (برای مسیرهای خاص)
export default function ProtectedRoute({ unauthenticatedElement, requiredRole, allowedRoles }) {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return unauthenticatedElement || <Navigate to="/login" replace />;
  }

  const role = user.role || 'user';

  // اگر requiredRole مشخص شده و نقش کاربر متفاوت است
  if (requiredRole && role !== requiredRole) {
    const home = HOME_BY_ROLE[role] || '/';
    return <Navigate to={home} replace />;
  }

  // اگر allowedRoles مشخص شده، بررسی کن آیا نقش کاربر در لیست است
  if (allowedRoles && !allowedRoles.includes(role)) {
    const home = HOME_BY_ROLE[role] || '/';
    return <Navigate to={home} replace />;
  }

  // بررسی ماتریس دسترسی RBAC
  const currentPath = location.pathname;
  if (!canAccessRoute(role, currentPath)) {
    const home = HOME_BY_ROLE[role] || '/';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
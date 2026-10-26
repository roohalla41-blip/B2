// الگوهای SQL فقط‌خواندنی برای بررسی ساختار و امنیت سوپابیس
// هیچ دستور تغییردهنده‌ای در این فایل وجود ندارد. همهٔ خروجی‌ها فراداده هستند.

export const AUDIT_QUERIES = {
  schema: {
    label: 'ساختار جدول‌ها و ستون‌ها',
    description: 'نام جدول، نام ستون، نوع داده، پیش‌فرض و قابلیت null',
    sql: `-- فقط‌خواندنی: ساختار جدول‌ها و ستون‌ها
SELECT
  t.table_schema AS schema_name,
  t.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c
  ON c.table_schema = t.table_schema
 AND c.table_name = t.table_name
WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_schema, t.table_name, c.ordinal_position;`,
  },
  constraints: {
    label: 'قیود و روابط',
    description: 'کلیدهای اصلی، خارجی، یکتا و قیود دیگر',
    sql: `-- فقط‌خواندنی: قیود و روابط
SELECT
  con.conname AS constraint_name,
  n.nspname AS schema_name,
  rel.relname AS table_name,
  con.contype AS constraint_type,
  con.conkey AS column_indices,
  con.confkey AS referenced_column_indices,
  confrel.relname AS referenced_table
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace n ON n.oid = connamespace
LEFT JOIN pg_class confrel ON confrel.oid = con.confrelid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, rel.relname, con.contype;`,
  },
  rls_status: {
    label: 'وضعیت RLS جداول',
    description: 'آیا RLS روی هر جدول فعال است',
    sql: `-- فقط‌خواندنی: وضعیت RLS
SELECT
  schemaname AS schema_name,
  tablename AS table_name,
  rowsecurity AS rls_enabled,
  forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;`,
  },
  policies: {
    label: 'سیاست‌های RLS',
    description: 'سیاست‌های هر جدول، نقش و دستور USING',
    sql: `-- فقط‌خواندنی: سیاست‌های RLS
SELECT
  schemaname AS schema_name,
  tablename AS table_name,
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, policyname;`,
  },
  role_grants: {
    label: 'مجوزهای نقش anon و authenticated',
    description: 'دسترسی‌های اعطاشده به نقش‌های عمومی',
    sql: `-- فقط‌خواندنی: مجوزهای نقش‌ها
SELECT
  grantee AS role_name,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE grantee IN ('anon', 'authenticated', 'service_role', 'public')
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY grantee, table_schema, table_name, privilege_type;`,
  },
  table_counts: {
    label: 'شمارش رکوردها (بدون دادهٔ سطری)',
    description: 'فقط تعداد رکوردها در هر جدول',
    sql: `-- فقط‌خواندنی: شمارش رکوردها
-- این بلوک به‌صورت پویا فقط COUNT(*) تولید می‌کند و هیچ ردیفی برنمی‌گرداند.
-- اگر اجرای داینامیک برای شما مجاز نیست، این جدول را رد کنید.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.reltuples::bigint AS estimated_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname;`,
  },
  functions: {
    label: 'توابع و RPC',
    description: 'توابع تعریف‌شده در schemaهای عمومی',
    sql: `-- فقط‌خواندنی: توابع
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS result_type,
  pg_get_function_arguments(p.oid) AS arguments,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;`,
  },
};

// الگوهای ممنوع در نتیجه — اگر یافت شد، گزارش رد می‌شود
export const FORBIDDEN_PATTERNS = [
  /password/i,
  /\bpasswd\b/i,
  /hashed_password/i,
  /secret/i,
  /token/i,
  /\bapi_key\b/i,
  /private_key/i,
  /service_role/i,
  /\bjwt\b/i,
  /\bemail\b/i,
  /\bphone\b/i,
  /\bfull_name\b/i,
  /\bip_address\b/i,
];

// فیلدهای مجاز برای هر نوع گزارش (برای شناسایی فرادادهٔ ساختاری)
export const ALLOWED_KEYS_BY_TYPE = {
  schema: ['schema_name', 'table_name', 'ordinal_position', 'column_name', 'data_type', 'udt_name', 'is_nullable', 'column_default'],
  constraints: ['constraint_name', 'schema_name', 'table_name', 'constraint_type', 'column_indices', 'referenced_column_indices', 'referenced_table'],
  rls_status: ['schema_name', 'table_name', 'rls_enabled', 'rls_forced'],
  policies: ['schema_name', 'table_name', 'policy_name', 'permissive', 'roles', 'command', 'using_expr', 'check_expr'],
  role_grants: ['role_name', 'table_schema', 'table_name', 'privilege_type', 'is_grantable'],
  table_counts: ['schema_name', 'table_name', 'estimated_rows', 'row_count'],
  functions: ['schema_name', 'function_name', 'result_type', 'arguments', 'security_definer'],
};

export function validateReport(reportType, rows) {
  if (!Array.isArray(rows)) {
    return { valid: false, reason: 'خروجی باید آرایه‌ای از اشیاء باشد.' };
  }
  const allowed = ALLOWED_KEYS_BY_TYPE[reportType] || [];
  const findings = [];
  const forbiddenSeen = new Set();

  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { valid: false, reason: 'هر ردیف باید یک شیء باشد.' };
    }
    const keys = Object.keys(row);
    // تشخیص کلیدهای ممنوع
    for (const k of keys) {
      if (FORBIDDEN_PATTERNS.some(re => re.test(k))) {
        forbiddenSeen.add(k);
      }
    }
    // تشخیص مقادیر به‌نظر محرمانه (طولانی و شبیه secret)
    for (const k of keys) {
      const v = row[k];
      if (typeof v === 'string' && v.length > 256 && /\b(secret|token|password|key)\b/i.test(k)) {
        forbiddenSeen.add(k);
      }
    }
  }

  if (forbiddenSeen.size > 0) {
    return {
      valid: false,
      reason: `خروجی شامل فیلدهای ممنوع است: ${[...forbiddenSeen].join('، ')}. لطفاً فقط فرادادهٔ ساختاری را وارد کنید.`,
    };
  }

  // تحلیل پرخطر ساده
  if (reportType === 'rls_status') {
    for (const row of rows) {
      if (row.rls_enabled === false) {
        findings.push({
          severity: 'high',
          object: `${row.schema_name}.${row.table_name}`,
          detail: 'RLS روی این جدول فعال نیست.',
          recommendation: 'فعال‌سازی RLS برای جدول.',
        });
      }
    }
  }
  if (reportType === 'policies') {
    const publicPolicies = rows.filter(r => Array.isArray(r.roles) ? r.roles.includes('anon') : r.roles === 'anon');
    for (const row of publicPolicies) {
      findings.push({
        severity: 'medium',
        object: `${row.schema_name}.${row.table_name}`,
        detail: `سیاست «${row.policy_name}» به نقش anon دسترسی می‌دهد (دستور: ${row.command || '?'}).`,
        recommendation: 'بررسی ضرورت دسترسی عمومی anon.',
      });
    }
  }
  if (reportType === 'role_grants') {
    const anonGrants = rows.filter(r => r.role_name === 'anon' && (r.privilege_type === 'SELECT' || r.privilege_type === 'INSERT' || r.privilege_type === 'UPDATE' || r.privilege_type === 'DELETE'));
    for (const row of anonGrants) {
      findings.push({
        severity: 'high',
        object: `${row.table_schema}.${row.table_name}`,
        detail: `نقش anon دسترسی ${row.privilege_type} دارد.`,
        recommendation: 'حذف دسترسی anon از جداول حساس.',
      });
    }
  }

  return { valid: true, findings, allowedKeys: allowed };
}
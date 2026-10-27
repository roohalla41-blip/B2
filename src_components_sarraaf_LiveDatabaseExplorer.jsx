import React, { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, AlertTriangle, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { callSupabase } from '@/lib/supabaseApi';

export default function LiveDatabaseExplorer() {
  const { toast } = useToast();
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);

  const [selectedTable, setSelectedTable] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loadingRows, setLoadingRows] = useState(false);
  const [searchCol, setSearchCol] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [sortCol, setSortCol] = useState('id');
  const [sortAsc, setSortAsc] = useState(false);

  const [editRow, setEditRow] = useState(null); // { mode: 'create'|'edit', data }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Credits warning ──
  const [creditsBlocked, setCreditsBlocked] = useState(false);

  const loadTables = useCallback(async () => {
    setLoadingTables(true);
    try {
      const res = await callSupabase('dbExplorer', { sub_action: 'listTables' });
      if (res.success) {
        setTables(res.tables || []);
        setCreditsBlocked(false);
      } else if (res.error === 'forbidden') {
        toast({ title: 'دسترسی محدود', description: 'فقط سازندهٔ اصلی می‌تواند این بخش را ببیند.', variant: 'destructive' });
      } else {
        setCreditsBlocked(true);
        toast({ title: 'خطا', description: res.error || 'خطای ناشناخته', variant: 'destructive' });
      }
    } catch (e) {
      setCreditsBlocked(true);
      toast({ title: 'خطا', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingTables(false);
    }
  }, [toast]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const loadRows = useCallback(async () => {
    if (!selectedTable) return;
    setLoadingRows(true);
    try {
      const res = await callSupabase('dbExplorer', {
        sub_action: 'listRows',
        table: selectedTable.table_name,
        page,
        page_size: pageSize,
        sort_col: sortCol,
        sort_asc: sortAsc,
        search: (searchCol && searchVal) ? { column: searchCol, value: searchVal } : null,
      });
      if (res.success) {
        setRows(res.rows || []);
        setTotal(res.total || 0);
        setCreditsBlocked(false);
      } else {
        setCreditsBlocked(true);
        toast({ title: 'خطا', description: res.error, variant: 'destructive' });
      }
    } catch (e) {
      setCreditsBlocked(true);
      toast({ title: 'خطا', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingRows(false);
    }
  }, [selectedTable, page, pageSize, sortCol, sortAsc, searchCol, searchVal, toast]);

  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      setSortCol('id');
      setSortAsc(false);
      setSearchCol('');
      setSearchVal('');
      loadRows();
    }
  }, [selectedTable]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (selectedTable) loadRows(); }, [page, sortCol, sortAsc]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!editRow || !selectedTable) return;
    setSaving(true);
    try {
      const isEdit = editRow.mode === 'edit';
      const payload = isEdit
        ? { sub_action: 'updateRow', table: selectedTable.table_name, row_id: editRow.data.id, changes: editRow.data }
        : { sub_action: 'createRow', table: selectedTable.table_name, row_data: editRow.data };
      const res = await callSupabase('dbExplorer', payload);
      if (res.success) {
        toast({ title: isEdit ? 'ردیف به‌روزرسانی شد' : 'ردیف ایجاد شد' });
        setEditRow(null);
        loadRows();
        loadTables(); // refresh counts
      } else {
        toast({ title: 'خطا', description: res.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'خطا', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedTable) return;
    setSaving(true);
    try {
      const res = await callSupabase('dbExplorer', {
        sub_action: 'deleteRow',
        table: selectedTable.table_name,
        row_id: deleteTarget.id,
      });
      if (res.success) {
        toast({ title: 'ردیف حذف شد' });
        setDeleteTarget(null);
        loadRows();
        loadTables();
      } else {
        toast({ title: 'خطا', description: res.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'خطا', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const columns = selectedTable?.columns || [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (creditsBlocked) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">اتصال به سرور برقرار نیست</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                عملیات بک‌اند پشت این پنل در حال حاضر به‌دلیل محدودیت اعتبار Workspace (Integration Credits) غیرفعال است.
                این یک محدودیت پلن کاری است، نه باگ. پس از شارژ مجدد اعتبارها یا ارتقای پلن، دسترسی زنده فعال می‌شود.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadTables}>
                <RefreshCw className="w-3.5 h-3.5 ml-1" /> تلاش مجدد
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">پایگاه داده زنده</h3>
                <p className="text-[11px] text-muted-foreground">مرور و مدیریت ردیف‌های جدول‌ها — فقط سازندهٔ اصلی</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadTables} disabled={loadingTables}>
              <RefreshCw className={`w-3.5 h-3.5 ml-1 ${loadingTables ? 'animate-spin' : ''}`} /> به‌روزرسانی
            </Button>
          </div>

          {/* Table selector */}
          <div className="flex flex-wrap gap-2 mb-3">
            {loadingTables ? (
              <span className="text-xs text-muted-foreground">در حال بارگذاری جدول‌ها…</span>
            ) : (
              tables.map(t => (
                <button
                  key={t.table_name}
                  onClick={() => setSelectedTable(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedTable?.table_name === t.table_name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  }`}
                >
                  {t.table_name}
                  <span className="opacity-60 mr-1">({t.row_count})</span>
                </button>
              ))
            )}
          </div>

          {selectedTable && (
            <>
              {/* Search + sort */}
              <div className="flex flex-wrap gap-2 items-end mb-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px]">ستون جست‌وجو</Label>
                  <Select value={searchCol} onValueChange={setSearchCol}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="انتخاب ستون" /></SelectTrigger>
                    <SelectContent>
                      {columns.map(c => (
                        <SelectItem key={c.column_name} value={c.column_name} className="text-xs">{c.column_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px]">مقدار</Label>
                  <Input
                    className="h-8 w-40 text-xs"
                    value={searchVal}
                    onChange={e => setSearchVal(e.target.value)}
                    placeholder="متن جست‌وجو…"
                    onKeyDown={e => e.key === 'Enter' && loadRows()}
                  />
                </div>
                <Button size="sm" variant="secondary" className="h-8" onClick={loadRows} disabled={loadingRows}>
                  <Search className="w-3.5 h-3.5 ml-1" /> جست‌وجو
                </Button>
                <div className="flex-1" />
                <Button size="sm" className="h-8" onClick={() => {
                  const empty = {};
                  columns.forEach(c => { if (c.column_name !== 'id') empty[c.column_name] = ''; });
                  setEditRow({ mode: 'create', data: empty });
                }}>
                  <Plus className="w-3.5 h-3.5 ml-1" /> ردیف جدید
                </Button>
              </div>

              {/* Rows table */}
              {loadingRows ? (
                <div className="py-8 text-center text-xs text-muted-foreground">در حال بارگذاری…</div>
              ) : rows.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">ردیفی یافت نشد</div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {columns.map(c => (
                          <th key={c.column_name} className="text-right p-2 font-medium whitespace-nowrap">
                            <button
                              className="hover:text-primary"
                              onClick={() => { setSortCol(c.column_name); setSortAsc(sortCol === c.column_name ? !sortAsc : true); }}
                            >
                              {c.column_name}
                              {sortCol === c.column_name && <span className="mr-0.5">{sortAsc ? '↑' : '↓'}</span>}
                            </button>
                          </th>
                        ))}
                        <th className="p-2 font-medium">عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={row.id ?? idx} className="border-b hover:bg-muted/30">
                          {columns.map(c => {
                            const val = row[c.column_name];
                            const display = val === null || val === undefined ? '—' :
                              (typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val));
                            const isLong = display.length > 60;
                            return (
                              <td key={c.column_name} className="p-2 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis" title={display}>
                                {isLong ? display.slice(0, 57) + '…' : display}
                              </td>
                            );
                          })}
                          <td className="p-2 whitespace-nowrap">
                            <div className="flex gap-1">
                              <button
                                className="p-1 rounded hover:bg-accent text-blue-600"
                                onClick={() => setEditRow({ mode: 'edit', data: { ...row } })}
                                title="ویرایش"
                              ><Pencil className="w-3.5 h-3.5" /></button>
                              <button
                                className="p-1 rounded hover:bg-accent text-red-600"
                                onClick={() => setDeleteTarget(row)}
                                title="حذف"
                              ><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-muted-foreground">
                    {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} از {total}
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs self-center px-2">{page} / {totalPages}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create dialog */}
      {editRow && (
        <RowEditDialog
          row={editRow}
          columns={columns}
          saving={saving}
          onClose={() => setEditRow(null)}
          onChange={data => setEditRow({ ...editRow, data })}
          onSave={handleSave}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmDialog
          row={deleteTarget}
          tableName={selectedTable?.table_name}
          saving={saving}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ── Row edit/create dialog ──
function RowEditDialog({ row, columns, saving, onClose, onChange, onSave }) {
  const data = row.data || {};
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card">
          <h3 className="text-sm font-semibold">{row.mode === 'edit' ? 'ویرایش ردیف' : 'ردیف جدید'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          {columns.map(c => {
            const isId = c.column_name === 'id';
            return (
              <div key={c.column_name} className="space-y-1">
                <Label className="text-[11px] flex items-center gap-1">
                  {c.column_name}
                  <span className="text-muted-foreground">({c.data_type})</span>
                  {isId && <span className="text-amber-600 text-[10px]">غیرقابل ویرایش</span>}
                </Label>
                <Input
                  className="h-8 text-xs"
                  value={data[c.column_name] ?? ''}
                  disabled={isId}
                  onChange={e => onChange({ ...data, [c.column_name]: e.target.value })}
                  placeholder={isId ? String(data[c.column_name] ?? '') : ''}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 p-4 border-t sticky bottom-0 bg-card">
          <Button size="sm" className="flex-1" onClick={onSave} disabled={saving}>
            <Check className="w-3.5 h-3.5 ml-1" /> {saving ? 'در حال ذخیره…' : 'تأیید و ذخیره'}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>انصراف</Button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation dialog ──
function DeleteConfirmDialog({ row, tableName, saving, onClose, onConfirm }) {
  const idDisplay = row.id ?? '(بدون شناسه)';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-semibold">حذف ردیف</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            آیا از حذف ردیف با شناسه <code className="bg-muted px-1 rounded">{idDisplay}</code> از جدول
            <code className="bg-muted px-1 rounded mx-1">{tableName}</code> مطمئن هستید؟
            این عملیات قابل بازگشت نیست.
          </p>
          <div className="bg-muted/50 rounded-lg p-2 max-h-32 overflow-y-auto text-[10px] font-mono mb-3">
            {JSON.stringify(row, null, 2).slice(0, 300)}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" className="flex-1" onClick={onConfirm} disabled={saving}>
              <Trash2 className="w-3.5 h-3.5 ml-1" /> {saving ? 'در حال حذف…' : 'حذف'}
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>انصراف</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
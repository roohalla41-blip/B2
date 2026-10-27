import React, { useState } from 'react';
import { useFeatures } from '@/hooks/useFeatures';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Power, Edit, Check, X, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

export default function FeaturesManagement({ lang }) {
  const isEnglish = lang === 'english';
  const { features, loading, toggleFeature, renameFeature, reorderFeature } = useFeatures();
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');

  const sorted = [...features].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const startEdit = (f) => {
    setEditing(f.feature_key);
    setEditName(f.feature_name);
  };

  const saveEdit = () => {
    if (editName.trim()) {
      renameFeature(editing, editName.trim());
    }
    setEditing(null);
    setEditName('');
  };

  const moveUp = (f, idx) => {
    if (idx === 0) return;
    reorderFeature(f.feature_key, f.sort_order - 1);
  };

  const moveDown = (f, idx) => {
    if (idx === sorted.length - 1) return;
    reorderFeature(f.feature_key, f.sort_order + 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Power className="w-4 h-4 text-indigo-600" />
          {isEnglish ? 'Feature Management' : 'مدیریت قابلیت‌ها'}
          <Badge variant="secondary" className="text-xs">{features.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">
            {isEnglish ? 'No features configured' : 'قابلیتی تنظیم نشده است'}
          </p>
        ) : (
          <div className="space-y-2">
            {sorted.map((f, idx) => (
              <div key={f.feature_key} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex flex-col gap-0.5">
                  <Button size="icon" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveUp(f, idx)} disabled={idx === 0}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveDown(f, idx)} disabled={idx === sorted.length - 1}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  {editing === f.feature_key ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 p-0" onClick={saveEdit}>
                        <Check className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(null)}>
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{f.feature_name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{f.feature_key}</Badge>
                      {f.category === 'customer' && (
                        <Badge variant="secondary" className="text-[10px]">{isEnglish ? 'Customer' : 'مشتری'}</Badge>
                      )}
                    </div>
                  )}
                </div>

                {editing !== f.feature_key && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(f)}>
                    <Edit className="w-4 h-4 text-slate-500" />
                  </Button>
                )}

                <Switch
                  checked={f.status === 'active'}
                  onCheckedChange={(checked) => toggleFeature(f.feature_key, checked ? 'active' : 'inactive')}
                />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-4">
          {isEnglish
            ? 'Toggle features on/off, rename, and reorder. Changes apply instantly to the exchange panel.'
            : 'قابلیت‌ها را فعال/غیرفعال کنید، نام تغییر دهید و مرتب کنید. تغییرات بلافاصله در پنل صراف اعمال می‌شود.'}
        </p>
      </CardContent>
    </Card>
  );
}
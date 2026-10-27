import React, { useState } from 'react';
import { X, Trash2, Check, Pencil, Plus } from 'lucide-react';

export default function FolderModal({
  folder,
  links,
  availableLinks,
  renderLink,
  onClose,
  onRename,
  onDelete,
  onRemoveLink,
  onAddLink,
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(folder?.name || '');

  const submitRename = () => {
    if (nameValue.trim()) {
      onRename(nameValue.trim());
    }
    setRenaming(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2">
          {renaming ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitRename(); }}
                className="flex-1 px-2 py-1 text-sm border rounded-md bg-transparent"
                autoFocus
              />
              <button onClick={submitRename} className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold text-foreground flex-1 truncate">{folder?.name || 'پوشه'}</h3>
              <button onClick={() => { setRenaming(true); setNameValue(folder?.name || ''); }} className="p-1.5 rounded-lg hover:bg-muted">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Folder Contents */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {links.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">
              پوشه خالی است — آیکون‌ها را از پایین اضافه کنید
            </div>
          ) : (
            links.map(link => (
              <div key={link.path} className="relative">
                {renderLink(link, false)}
                <button
                  onClick={() => onRemoveLink(link.path)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm z-10"
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Icons */}
        {availableLinks.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">افزودن آیکون به پوشه:</p>
            <div className="flex flex-wrap gap-2">
              {availableLinks.map(link => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.path}
                    onClick={() => onAddLink(link.path)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-xs transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                    <Plus className="w-3 h-3 opacity-50" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete Folder */}
        <button
          onClick={onDelete}
          className="mt-4 flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          حذف پوشه
        </button>
      </div>
    </div>
  );
}
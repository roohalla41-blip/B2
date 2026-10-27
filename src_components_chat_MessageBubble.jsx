import React from 'react';
import RoleBadge from './RoleBadge';
import { getRoleDisplay } from '@/lib/chat';
import { CloudOff, Check, Trash2, Flag } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, onDelete, onReport, showActions }) {
  const { user } = useAuth();
  const isMine = message.sender_id === user?.id;
  const display = getRoleDisplay(message.sender_role);

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isMine && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[10px] font-medium text-foreground">{message.sender_name}</span>
            <RoleBadge userRole={message.sender_role === 'admin' ? 'admin' : (message.sender_role === 'customer' ? 'customer' : 'user')} />
          </div>
        )}
        <div
          className={`relative rounded-2xl px-3 py-2 ${
            isMine
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[9px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {formatTime(message.created_date)}
            </span>
            {message.sync_status === 'pending' && (
              <CloudOff className="w-3 h-3 text-warning" />
            )}
            {message.sync_status === 'synced' && isMine && (
              <Check className="w-3 h-3 opacity-50" />
            )}
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-1 px-1">
            {onDelete && (
              <button
                onClick={() => onDelete(message)}
                className="text-[9px] text-destructive hover:underline flex items-center gap-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
                حذف
              </button>
            )}
            {onReport && !isMine && (
              <button
                onClick={() => onReport(message)}
                className="text-[9px] text-muted-foreground hover:underline flex items-center gap-0.5"
              >
                <Flag className="w-2.5 h-2.5" />
                گزارش
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
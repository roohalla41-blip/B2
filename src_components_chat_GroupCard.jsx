import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { getGroupTypeDisplay } from '@/lib/chat';
import { Users, Lock, Globe, MessageSquare, Clock, Crown } from 'lucide-react';
import { formatNumber } from '@/lib/sarraaf';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'هم‌اکنون';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  return d.toLocaleDateString('fa-IR');
}

export default function GroupCard({ group, lastMessage, to }) {
  const typeDisplay = getGroupTypeDisplay(group.type);
  const isCreatorManaged = group.creator_managed === true;

  return (
    <Link to={to}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Group Image / Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${isCreatorManaged ? 'bg-gradient-to-br from-primary/30 to-primary/10' : 'bg-gradient-to-br from-primary/20 to-primary/5'}`}>
              {group.image ? (
                <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
              ) : isCreatorManaged ? (
                <Crown className="w-6 h-6 text-primary" />
              ) : group.type === 'private' ? (
                <Lock className="w-6 h-6 text-purple-500" />
              ) : (
                <Globe className="w-6 h-6 text-green-500" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm truncate">{group.name}</h3>
                {isCreatorManaged && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary flex items-center gap-0.5 shrink-0">
                    <Crown className="w-2.5 h-2.5" />
                    سیستمی
                  </span>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${typeDisplay.bg} ${typeDisplay.color} shrink-0`}>
                  {typeDisplay.label}
                </span>
              </div>
              {group.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {formatNumber(group.member_count || 0)}
                </span>
                {group.creator_name && !isCreatorManaged && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {group.creator_name}
                  </span>
                )}
                {lastMessage && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span className="truncate">{lastMessage.sender_name}: {lastMessage.message}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Time */}
            {lastMessage && (
              <span className="text-[9px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {formatTime(lastMessage.created_date)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
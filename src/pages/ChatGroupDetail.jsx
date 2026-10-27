import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useChatGroup, useGroupMembers, useGroupMessages, useIsGroupMember,
  useJoinGroup, useSendMessage, useDeleteMessage, useReportMessage,
  usePendingMembers, useUpdateMemberStatus, useRemoveMember,
  useDeleteGroup, useUpdateGroup, useMessageCooldown,
} from '@/lib/useChat';
import { useSarraafProfile } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { canAccessPrivateGroups, getGroupTypeDisplay, getMemberRole, formatCooldown } from '@/lib/chat';
import { PageHeader, EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import MessageBubble from '@/components/chat/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useRateSettings } from '@/lib/useSarraaf';
import { Send, ArrowRight, Users, UserCheck, UserX, Trash2, Flag, Lock, Edit2, Crown } from 'lucide-react';

export default function ChatGroupDetail() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const { data: group } = useChatGroup(groupId);
  const { data: messages, isLoading: msgLoading } = useGroupMessages(groupId);
  const { data: members } = useGroupMembers(groupId);
  const { data: pendingMembers } = usePendingMembers(groupId);
  const { data: isMember } = useIsGroupMember(groupId, user?.id);
  const { data: rateSettings } = useRateSettings();

  const joinMut = useJoinGroup();
  const sendMut = useSendMessage();
  const deleteMut = useDeleteMessage();
  const reportMut = useReportMessage();
  const approveMut = useUpdateMemberStatus();
  const removeMut = useRemoveMember();
  const deleteGroupMut = useDeleteGroup();
  const updateGroupMut = useUpdateGroup();

  const [message, setMessage] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [reportDialog, setReportDialog] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', rules: '' });
  const messagesEndRef = useRef(null);

  const cooldownRemaining = useMessageCooldown(groupId, user?.id, user?.role, profile);
  const isRateLimited = cooldownRemaining > 0;

  const ttlKey = rateSettings?.chat_message_ttl || 'never';
  const typeDisplay = group ? getGroupTypeDisplay(group.type) : null;
  const isCreator = group?.creator_id === user?.id;
  const isSystemAdmin = user?.role === 'creator' || user?.role === 'admin';
  const canManage = isCreator || isSystemAdmin;
  const canAccessPrivate = canAccessPrivateGroups(profile, user?.role);
  const blockedByPrivate = group?.type === 'private' && !canAccessPrivate;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    if (!group) return;
    try {
      await joinMut.mutateAsync({ group, user, userRole: user.role, profile });
      toast({ title: 'عضویت', description: group.type === 'private' ? 'درخواست عضویت ارسال شد' : 'به گروه پیوستید' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !group) return;
    if (!isMember) {
      toast({ title: 'خطا', description: 'ابتدا به گروه بپیوندید', variant: 'destructive' });
      return;
    }
    try {
      await sendMut.mutateAsync({ group, user, userRole: user.role, profile, message: message.trim(), ttlKey });
      setMessage('');
    } catch (err) {
      if (err.message?.startsWith('rate_limited:')) {
        const seconds = parseInt(err.message.split(':')[1]) || 0;
        toast({ title: 'محدودیت ارسال', description: `لطفاً ${formatCooldown(seconds)} صبر کنید`, variant: 'destructive' });
      } else {
        toast({ title: 'خطا', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleDelete = async (msg) => {
    try {
      await deleteMut.mutateAsync(msg.id);
      toast({ title: 'حذف شد', description: 'پیام حذف شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleReport = async () => {
    if (!reportDialog || !reportReason.trim()) return;
    try {
      await reportMut.mutateAsync({ message: reportDialog, reporter: user, reason: reportReason.trim() });
      toast({ title: 'گزارش ارسال شد', description: 'پیام به مدیران گزارش شد' });
      setReportDialog(null);
      setReportReason('');
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleApproveMember = async (memberId, status) => {
    try {
      await approveMut.mutateAsync({ id: memberId, status, groupId, currentCount: group?.member_count || 0 });
      toast({ title: status === 'active' ? 'تأیید شد' : 'رد شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeMut.mutateAsync({ id: memberId, groupId, currentCount: group?.member_count || 0 });
      toast({ title: 'حذف شد', description: 'عضو از گروه حذف شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditGroup = async () => {
    if (!editForm.name.trim()) return;
    try {
      await updateGroupMut.mutateAsync({ id: groupId, data: { name: editForm.name.trim(), description: editForm.description.trim(), rules: editForm.rules.trim() } });
      toast({ title: 'ویرایش شد', description: 'گروه با موفقیت ویرایش شد' });
      setEditDialog(false);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroupMut.mutateAsync(groupId);
      toast({ title: 'حذف شد', description: 'گروه حذف شد' });
      navigate('/chat');
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  if (!group) return <LoadingState />;

  if (blockedByPrivate) {
    return (
      <>
        <PageHeader title={group.name} icon={Lock} actions={<Button size="sm" variant="ghost" onClick={() => navigate('/chat')}><ArrowRight className="w-4 h-4" /> بازگشت</Button>} />
        <EmptyState
          icon={Lock}
          title="دسترسی محدود"
          description="این گروه خصوصی فقط برای صرافان نسخه پولی و اشتراک فعال قابل مشاهده است"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={group.name}
        subtitle={typeDisplay?.label}
        icon={group.type === 'private' ? Lock : Users}
        actions={
          <div className="flex items-center gap-1">
            {canManage && (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setEditForm({ name: group.name, description: group.description || '', rules: group.rules || '' }); setEditDialog(true); }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteDialog(true)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => navigate('/chat')}><ArrowRight className="w-4 h-4" /> بازگشت</Button>
          </div>
        }
      />

      {/* Group Info */}
      {group.description && (
        <p className="text-xs text-muted-foreground mb-3 px-1">{group.description}</p>
      )}

      {/* Creator badge */}
      {group.creator_managed && (
        <div className="mb-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-medium">
          <Crown className="w-3 h-3" />
          گروه سیستمی — مدیریت توسط سازنده
        </div>
      )}
      {!group.creator_managed && group.creator_name && (
        <div className="mb-3 text-[10px] text-muted-foreground px-1">
          ایجاد شده توسط: {group.creator_name}
        </div>
      )}

      {/* Join Button */}
      {!isMember && (
        <div className="mb-4">
          <Button className="w-full" onClick={handleJoin} disabled={joinMut.isPending}>
            <UserCheck className="w-4 h-4" />
            {group.type === 'private' ? 'درخواست عضویت' : 'پیوستن به گروه'}
          </Button>
        </div>
      )}

      {/* Pending Members (creator only) */}
      {canManage && pendingMembers && pendingMembers.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border bg-amber-50">
          <p className="text-xs font-bold text-amber-800 mb-2">درخواست‌های عضویت ({pendingMembers.length})</p>
          {pendingMembers.map(m => (
            <div key={m.id} className="flex items-center justify-between py-1">
              <span className="text-xs">{m.user_name}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => handleApproveMember(m.id, 'active')}>
                  <UserCheck className="w-3 h-3" /> تأیید
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleApproveMember(m.id, 'rejected')}>
                  <UserX className="w-3 h-3" /> رد
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="space-y-2 mb-4 min-h-[200px]">
        {msgLoading ? <LoadingState /> : !messages || messages.length === 0 ? (
          <EmptyState icon={Send} title="پیامی نیست" description="اولین پیام را ارسال کنید" />
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onDelete={canManage ? handleDelete : undefined}
              onReport={handleReport ? () => setReportDialog(msg) : undefined}
              showActions={isMember}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {isMember && (
        <div className="fixed bottom-[52px] lg:bottom-0 left-0 right-0 z-40 bg-background border-t p-3">
          {isRateLimited && (
            <div className="max-w-5xl mx-auto mb-2 text-center text-xs text-amber-600 bg-amber-50 rounded-lg py-1">
              ⏳ لطفاً {formatCooldown(cooldownRemaining)} برای ارسال پیام بعدی صبر کنید
            </div>
          )}
          <div className="max-w-5xl mx-auto flex items-center gap-2">
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isRateLimited ? 'در حال انتظار...' : 'پیام خود را بنویسید...'}
              className="flex-1"
              disabled={isRateLimited}
            />
            <Button size="icon" onClick={handleSend} disabled={sendMut.isPending || !message.trim() || isRateLimited}>
              <Send className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => setShowMembers(!showMembers)}>
              <Users className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Members Panel — visible to all members */}
      {showMembers && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowMembers(false)}>
          <div className="bg-background w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">اعضای گروه ({members?.length || 0})</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowMembers(false)}>بستن</Button>
            </div>
            {members?.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.user_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {m.role === 'admin' ? 'مدیر گروه' : 'عضو'} — {m.user_role === 'sarraaf_verified' ? 'صراف' : m.user_role === 'customer' ? 'مشتری' : m.user_role === 'admin' ? 'مدیر سیستم' : 'صراف'}
                  </p>
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveMember(m.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Group Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ویرایش گروه</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs">نام گروه</label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">توضیحات</label>
              <Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-xs">قوانین گروه</label>
              <Textarea value={editForm.rules} onChange={e => setEditForm({ ...editForm, rules: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>انصراف</Button>
            <Button onClick={handleEditGroup} disabled={updateGroupMut.isPending}>
              {updateGroupMut.isPending ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>حذف گروه</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            آیا از حذف گروه «{group.name}» مطمئن هستید؟ تمام اعضا و پیام‌ها حذف خواهند شد.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>انصراف</Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={deleteGroupMut.isPending}>
              {deleteGroupMut.isPending ? 'در حال حذف...' : 'حذف گروه'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={!!reportDialog} onOpenChange={() => setReportDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>گزارش پیام نامناسب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {reportDialog && (
              <div className="p-2 rounded-lg bg-muted text-xs">
                <p className="font-medium">{reportDialog.sender_name}:</p>
                <p className="text-muted-foreground">{reportDialog.message}</p>
              </div>
            )}
            <div>
              <label className="text-xs">دلیل گزارش</label>
              <Textarea
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="دلیل گزارش را شرح دهید"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleReport} disabled={!reportReason.trim() || reportMut.isPending}>
              <Flag className="w-4 h-4" />
              ارسال گزارش
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
// supportActions.js — Direct Supabase client operations for support tickets,
// error reports, and user feedback.
//
// This module replaces the previous callSupabase('support_*') routing through
// the /functions/supabase backend function, which is unavailable when the
// workspace is out of integration credits. All operations go through the
// client-side Supabase instance (anon key + x-app-token header) and rely on
// RLS policies for access control.
//
// user_id and exchange_code are resolved from the local session (auth_user)
// — the server still enforces RLS, so spoofing client-side values has no effect.

import { supabase } from './supabaseClient';
import { getExchangeCode, isCreatorOrAdmin } from './supabaseApi';

// ── Resolve the current user from localStorage session ──
function getSessionUser() {
  try {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) return JSON.parse(userStr);
  } catch { /* ignore */ }
  return null;
}

function numericUserId(u) {
  if (!u || !u.id) return null;
  const n = Number(u.id);
  return !isNaN(n) && n > 0 ? n : null;
}

function normalizeRow(row) {
  if (!row) return row;
  const r = { ...row };
  if (r.id !== undefined && r.id !== null) r.id = String(r.id);
  if (r.created_at) r.created_date = r.created_at;
  if (r.updated_at) r.updated_date = r.updated_at;
  return r;
}

// ── Support Tickets ──
export async function createTicket({ subject, description, category, priority }) {
  if (!subject) throw new Error('missing_subject');

  const user = getSessionUser();
  const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
  const insertData = {
    ticket_number: ticketNumber,
    subject,
    description: description || '',
    category: category || 'general',
    priority: priority || 'normal',
    status: 'open',
  };
  const uid = numericUserId(user);
  if (uid) insertData.user_id = uid;
  const ec = getExchangeCode();
  if (ec) insertData.exchange_code = ec;

  const { data, error } = await supabase
    .from('support_tickets')
    .insert(insertData)
    .select()
    .single();
  if (error) throw new Error(error.message || 'createTicket_failed');
  return normalizeRow(data);
}

export async function getTickets() {
  const user = getSessionUser();
  const role = user?.role;
  const admin = isCreatorOrAdmin();
  let query = supabase.from('support_tickets').select('*');
  if (admin) {
    // creator/admin: all tickets
  } else if (role === 'sarraaf' || role === 'exchange') {
    const ec = getExchangeCode();
    if (ec) query = query.eq('exchange_code', ec);
  } else {
    const uid = numericUserId(user);
    if (uid) query = query.eq('user_id', uid);
    else query = query.eq('user_id', -1);
  }
  const { data, error } = await query.order('id', { ascending: false }).limit(200);
  if (error) throw new Error(error.message || 'getTickets_failed');
  return (data || []).map(normalizeRow);
}

export async function getAllTickets() {
  return getTickets();
}

export async function updateTicketStatus(ticketId, status, assignedTo) {
  if (!ticketId || !status) throw new Error('missing_fields');
  if (!isCreatorOrAdmin()) throw new Error('forbidden');

  const updateData = { status, updated_at: new Date().toISOString() };
  if (assignedTo !== undefined) updateData.assigned_to = assignedTo;

  const { data, error } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('id', ticketId)
    .select()
    .single();
  if (error) throw new Error(error.message || 'updateTicketStatus_failed');
  return normalizeRow(data);
}

// ── Ticket Messages ──
export async function addTicketMessage({ ticketId, message, attachmentUrl }) {
  if (!ticketId || !message) throw new Error('missing_fields');
  const tid = Number(ticketId);

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, user_id, exchange_code')
    .eq('id', tid)
    .maybeSingle();
  if (!ticket) throw new Error('ticket_not_found');

  const user = getSessionUser();
  const admin = isCreatorOrAdmin();
  if (!admin) {
    const role = user?.role;
    const ec = getExchangeCode();
    if (role === 'sarraaf' || role === 'exchange') {
      if (ticket.exchange_code !== ec) throw new Error('forbidden');
    } else {
      const uid = numericUserId(user);
      if (!uid || Number(ticket.user_id) !== uid) throw new Error('forbidden');
    }
  }

  const insertData = {
    ticket_id: tid,
    sender_name: user?.full_name || user?.email || '',
    message,
  };
  const senderUid = numericUserId(user);
  if (senderUid) insertData.sender_id = senderUid;
  if (attachmentUrl) insertData.attachment_url = attachmentUrl;

  const { data, error } = await supabase
    .from('support_messages')
    .insert(insertData)
    .select()
    .single();
  if (error) throw new Error(error.message || 'addTicketMessage_failed');
  return normalizeRow(data);
}

export async function getTicketMessages(ticketId) {
  if (!ticketId) throw new Error('missing_ticket_id');
  const tid = Number(ticketId);

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, user_id, exchange_code')
    .eq('id', tid)
    .maybeSingle();
  if (!ticket) throw new Error('ticket_not_found');

  const user = getSessionUser();
  const admin = isCreatorOrAdmin();
  if (!admin) {
    const role = user?.role;
    const ec = getExchangeCode();
    if (role === 'sarraaf' || role === 'exchange') {
      if (ticket.exchange_code !== ec) throw new Error('forbidden');
    } else {
      const uid = numericUserId(user);
      if (!uid || Number(ticket.user_id) !== uid) throw new Error('forbidden');
    }
  }

  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', tid)
    .order('id', { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message || 'getTicketMessages_failed');
  return (data || []).map(normalizeRow);
}

// ── Error Reports ──
export async function reportError({ errorType, errorMessage, stackTrace, device, appVersion }) {
  if (!errorType) throw new Error('missing_error_type');
  const user = getSessionUser();
  const insertData = {
    error_type: errorType,
    error_message: errorMessage || '',
    stack_trace: stackTrace || '',
    device: device || '',
    app_version: appVersion || '1.0.0',
    status: 'new',
  };
  const uid = numericUserId(user);
  if (uid) insertData.user_id = uid;
  const ec = getExchangeCode();
  if (ec) insertData.exchange_code = ec;

  const { data, error } = await supabase
    .from('error_reports')
    .insert(insertData)
    .select()
    .single();
  if (error) throw new Error(error.message || 'reportError_failed');
  return normalizeRow(data);
}

export async function getErrorReports() {
  if (!isCreatorOrAdmin()) throw new Error('forbidden');
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .order('id', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message || 'getErrorReports_failed');
  return (data || []).map(normalizeRow);
}

// ── User Feedback ──
export async function submitFeedback({ type, message, rating }) {
  if (!message) throw new Error('missing_message');
  const user = getSessionUser();
  const insertData = {
    type: type || 'suggestion',
    message,
    rating: rating || 0,
    status: 'new',
  };
  const uid = numericUserId(user);
  if (uid) insertData.user_id = uid;
  const ec = getExchangeCode();
  if (ec) insertData.exchange_code = ec;

  const { data, error } = await supabase
    .from('user_feedback')
    .insert(insertData)
    .select()
    .single();
  if (error) throw new Error(error.message || 'submitFeedback_failed');
  return normalizeRow(data);
}

export async function getAllFeedback() {
  if (!isCreatorOrAdmin()) throw new Error('forbidden');
  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .order('id', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message || 'getAllFeedback_failed');
  return (data || []).map(normalizeRow);
}
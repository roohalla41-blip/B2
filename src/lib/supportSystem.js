// supportSystem.js — سیستم تیکت پشتیبانی، گزارش خطا و بازخورد کاربر
// تمام عملیات از طریق بک‌اند امن (HMAC-signed) انجام می‌شوند.
// user_id و exchange_code سمت سرور از نشست تأییدشده استخراج می‌شوند (anti-spoof).

import {
  createTicket as _createTicket,
  getTickets as _getTickets,
  getAllTickets as _getAllTickets,
  updateTicketStatus as _updateTicketStatus,
  addTicketMessage as _addTicketMessage,
  getTicketMessages as _getTicketMessages,
  reportError as _reportError,
  getErrorReports as _getErrorReports,
  submitFeedback as _submitFeedback,
  getAllFeedback as _getAllFeedback,
} from './supportActions';

// ── Support Tickets ──
export async function createTicket({ subject, description, category, priority }) {
  return _createTicket({ subject, description, category, priority });
}

export async function getTickets() {
  return _getTickets();
}

export async function getAllTickets() {
  return _getAllTickets();
}

export async function updateTicketStatus(ticketId, status, assignedTo) {
  return _updateTicketStatus(ticketId, status, assignedTo);
}

// ── Ticket Messages ──
export async function addTicketMessage({ ticketId, message, attachmentUrl }) {
  return _addTicketMessage({ ticketId, message, attachmentUrl });
}

export async function getTicketMessages(ticketId) {
  return _getTicketMessages(ticketId);
}

// ── Error Reports ──
export async function reportError({ errorType, errorMessage, stackTrace, device, appVersion }) {
  return _reportError({ errorType, errorMessage, stackTrace, device, appVersion });
}

export async function getErrorReports() {
  return _getErrorReports();
}

// Auto-catch unhandled errors
export function initErrorReporting() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (event) => {
    reportError({
      errorType: 'uncaught_error',
      errorMessage: event.message || 'Unknown error',
      stackTrace: event.error?.stack || '',
      device: navigator.userAgent,
      appVersion: '1.0.0',
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      errorType: 'unhandled_promise',
      errorMessage: event.reason?.message || String(event.reason || 'Unknown rejection'),
      stackTrace: event.reason?.stack || '',
      device: navigator.userAgent,
      appVersion: '1.0.0',
    });
  });
}

// ── User Feedback ──
export async function submitFeedback({ type, message, rating }) {
  return _submitFeedback({ type: type || 'suggestion', message, rating: rating || 0 });
}

export async function getAllFeedback() {
  return _getAllFeedback();
}

export const TICKET_CATEGORIES = [
  { value: 'general', label: 'عمومی' },
  { value: 'technical', label: 'فنی' },
  { value: 'billing', label: 'مالی' },
  { value: 'feature_request', label: 'درخواست قابلیت' },
  { value: 'bug', label: 'گزارش باگ' },
];

export const TICKET_PRIORITIES = [
  { value: 'low', label: 'کم' },
  { value: 'normal', label: 'معمولی' },
  { value: 'high', label: 'زیاد' },
  { value: 'urgent', label: 'فوری' },
];

export const TICKET_STATUSES = [
  { value: 'open', label: 'باز' },
  { value: 'in_progress', label: 'در حال بررسی' },
  { value: 'resolved', label: 'حل‌شده' },
  { value: 'closed', label: 'بسته‌شده' },
];
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// Display a user's identifier (username · mobile · email) for audit / reset lists
export function formatUserIdentifier(user) {
  if (!user) return '—';
  const parts = [];
  if (user.username) parts.push(user.username);
  if (user.mobile) parts.push(user.mobile);
  if (user.email) parts.push(user.email);
  return parts.length > 0 ? parts.join(' · ') : (user.id ? `#${user.id}` : '—');
}
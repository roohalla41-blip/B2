// supabaseDB.js — Drop-in replacement for offlineDB using Supabase Edge Function
//
// این ماژول همان رابط (interface) offlineDB را فراهم می‌کند
// اما به‌جای IndexedDB، مستقیماً از Edge Function سوپابیس استفاده می‌کند.
// تمام عملیات‌ها از طریق اکشن 'crud' در بک‌اند فانکشن انجام می‌شود.

import { createSupabaseEntity } from './supabaseApi';

// ── Entity cache (lazy initialization) ──
const _entityCache = {};

function getEntity(name) {
  if (!_entityCache[name]) {
    _entityCache[name] = createSupabaseEntity(name);
  }
  return _entityCache[name];
}

// ── Proxy that returns a Supabase-backed entity for any name ──
export const supabaseDB = new Proxy({}, {
  get(_, entityName) {
    return getEntity(entityName);
  },
});

export default supabaseDB;
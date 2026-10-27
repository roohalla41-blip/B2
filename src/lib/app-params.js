// app-params.js — Platform-independent app parameters
//
// This module replaces the Base44-specific app parameter reader.
// It reads runtime config from window.__APP_CONFIG__ and URL parameters,
// with no dependency on Base44 SDK or platform.

const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map(), location: { search: '', href: '', pathname: '' } } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase();

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) return defaultValue;
  const storageKey = `app_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }
  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }
  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }
  const storedValue = storage.getItem(storageKey);
  if (storedValue) return storedValue;
  return null;
};

const getAppParams = () => {
  if (getAppParamValue('clear_access_token') === 'true') {
    storage.removeItem('auth_token');
    storage.removeItem('app_access_token');
  }
  return {
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', { defaultValue: window.location.href }),
  };
};

export const appParams = {
  ...getAppParams()
};
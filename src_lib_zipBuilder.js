// zipBuilder.js — Minimal ZIP file builder (stored, no compression)
// Pure vanilla JS — no external dependencies.
// Creates a valid ZIP file from an array of {name, data} entries.

// ── CRC32 lookup table ──
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(date) {
  const dosTime = ((date.getHours() & 0x1F) << 11) | ((date.getMinutes() & 0x3F) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1F);
  const dosDate = (((date.getFullYear() - 1980) & 0x7F) << 9) | (((date.getMonth() + 1) & 0x0F) << 5) | (date.getDate() & 0x1F);
  return { dosTime, dosDate };
}

/**
 * Creates a ZIP Blob from an array of file entries.
 * @param {Array<{name: string, data: Uint8Array}>} files
 * @returns {Blob}
 */
export function createZip(files) {
  const parts = [];
  const centralDir = [];
  let offset = 0;
  const now = dosDateTime(new Date());

  for (const file of files) {
    if (!file.data || file.data.length === 0) continue;
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.data;
    const crc = crc32(data);

    // Local file header (30 bytes)
    const lh = new Uint8Array(30);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0, true);
    dv.setUint16(8, 0, true); // stored (no compression)
    dv.setUint16(10, now.dosTime, true);
    dv.setUint16(12, now.dosDate, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);

    parts.push(lh, nameBytes, data);
    centralDir.push({ name: file.name, nameBytes, crc, size: data.length, offset });
    offset += 30 + nameBytes.length + data.length;
  }

  // Central directory records
  let cdOffset = offset;
  let cdSize = 0;

  for (const entry of centralDir) {
    const cd = new Uint8Array(46);
    const dv = new DataView(cd.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, now.dosTime, true);
    dv.setUint16(14, now.dosDate, true);
    dv.setUint32(16, entry.crc, true);
    dv.setUint32(20, entry.size, true);
    dv.setUint32(24, entry.size, true);
    dv.setUint16(28, entry.nameBytes.length, true);
    dv.setUint16(30, 0, true);
    dv.setUint16(32, 0, true);
    dv.setUint16(34, 0, true);
    dv.setUint16(36, 0, true);
    dv.setUint32(38, 0, true);
    dv.setUint32(42, entry.offset, true);

    parts.push(cd, entry.nameBytes);
    cdSize += 46 + entry.nameBytes.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, centralDir.length, true);
  ev.setUint16(10, centralDir.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  ev.setUint16(20, 0, true);

  parts.push(eocd);

  // Combine all parts
  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    result.set(p, pos);
    pos += p.length;
  }

  return new Blob([result], { type: 'application/zip' });
}

// ── Secret pattern scanner ──
// Returns true if content appears to contain secrets/credentials.
const SECRET_PATTERNS = [
  /SUPABASE_SERVICE_KEY\s*[:=]\s*['"]?[A-Za-z0-9_\-\+\/=]{20,}/i,
  /SUPABASE_KEY\s*[:=]\s*['"]?[A-Za-z0-9_\-\+\/=]{20,}/i,
  /CREATOR_PASSWORD\s*[:=]\s*['"]?[^\s'"]{4,}/i,
  /SUPABASE_DB_PASSWORD\s*[:=]\s*['"]?[^\s'"]{4,}/i,
  /-----BEGIN\s+(RSA\s+|EC\s+)?PRIVATE\s+KEY-----/,
  /supabaseKey\s*[:=]\s*['"][A-Za-z0-9_\-\+\/=]{20,}['"]/i,
  /service_role['"]?\s*[:=]\s*['"][A-Za-z0-9_\-\+\/=]{20,}['"]/i,
  /postgres:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/i,
];

/**
 * Scans text content for secret/credential patterns.
 * @param {string} content
 * @returns {boolean} true if a secret pattern is found
 */
export function containsSecrets(content) {
  if (!content || typeof content !== 'string') return false;
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) return true;
  }
  return false;
}

// ── File allowlist ──
// Directories and extensions that are safe to include in the ZIP.
const ALLOWED_DIRS = [
  'src/',
  'base44/',
  'supabase/',
  'public/',
];

const ALLOWED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.css', '.json', '.jsonc',
  '.sql', '.md', '.txt', '.html', '.svg', '.toml',
];

const BLOCKED_FILES = [
  '.env', '.env.local', '.env.production', '.env.development',
  'node_modules', 'package-lock.json', 'yarn.lock',
  '.gitignore', '.git/', 'dist/', 'build/',
];

/**
 * Checks if a file path is in the allowlist and not blocked.
 * @param {string} path
 * @returns {boolean}
 */
export function isAllowed(path) {
  if (!path) return false;
  const lower = path.toLowerCase();

  // Check blocked files
  for (const blocked of BLOCKED_FILES) {
    if (lower.includes(blocked)) return false;
  }

  // Check allowed directories
  const inAllowedDir = ALLOWED_DIRS.some(dir => lower.startsWith(dir) || lower.includes('/' + dir));
  if (!inAllowedDir) {
    // Allow root config files
    if (!path.includes('/') && ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext))) {
      return true;
    }
    return false;
  }

  // Check allowed extensions
  return ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
}
/**
 * Safe placeholder for independent builds.
 * A browser-only frontend cannot package its own source repository.
 * Do not pretend to create a full source backup without a trusted backend.
 */
export async function generateTripleBackupZip() {
  throw new Error('ساخت ZIP کامل سورس در نسخه مستقل هنوز آماده نیست؛ برای جلوگیری از بکاپ ناقص، این عملیات متوقف شد.');
}

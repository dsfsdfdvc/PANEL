/**
 * Sh.M V2Ray - Client-side subscription generator
 * Pure static: HTML + CSS + JS only
 */

(function () {
  'use strict';

  const CONFIG_FILE = 'configs.txt';
  const SUB_FILENAME = 'sub'; // نام فایل استاتیک برای لینک دائمی

  // DOM elements
  const statusEl = document.getElementById('status');
  const statsEl = document.getElementById('stats');
  const configListEl = document.getElementById('config-list');
  const subBoxEl = document.getElementById('sub-content');
  const permanentLinkEl = document.getElementById('permanent-link');
  const btnCopySub = document.getElementById('btn-copy-sub');
  const btnDownload = document.getElementById('btn-download');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const toastEl = document.getElementById('toast');

  let currentBase64 = '';
  let configCount = 0;

  // ---------- Helpers ----------
  function showStatus(type, message) {
    statusEl.className = type;
    statusEl.innerHTML = message;
    statusEl.style.display = 'flex';
  }

  function hideStatus() {
    statusEl.style.display = 'none';
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /**
   * Base64 encode with UTF-8 support
   */
  function toBase64(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      // fallback for pure ASCII
      return btoa(str);
    }
  }

  /**
   * Parse configs.txt content
   * کانفیگ‌ها را می‌توان با یک خط خالی از هم جدا کرد.
   * داخل هر بلوک، خطوط به هم چسبانده می‌شوند (مناسب برای پیست از v2ray).
   * خطوط و بلوک‌هایی که با # شروع می‌شوند نادیده گرفته می‌شوند.
   */
  function parseConfigs(text) {
    // جدا کردن بر اساس یک یا چند خط خالی
    const blocks = text.split(/\r?\n(?:\s*\r?\n)+/);

    const configs = [];

    for (let block of blocks) {
      // خطوط داخل بلوک را تمیز و به هم بچسبان
      const lines = block
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));

      if (lines.length === 0) continue;

      // اگر کل بلوک کامنت بود رد شود
      const joined = lines.join('').trim();
      if (!joined || joined.startsWith('#')) continue;

      // فقط اگر شبیه لینک کانفیگ باشد قبول کن
      if (
        /^(vmess|vless|trojan|ss|ssr|hysteria|hy2|tuic|wireguard):\/\//i.test(joined)
      ) {
        configs.push(joined);
      }
    }

    return configs;
  }

  /**
   * Build permanent raw GitHub URL template
   */
  function buildPermanentLinkHint() {
    // Try to detect current GitHub Pages / raw base
    const host = window.location.hostname;
    const pathParts = window.location.pathname.split('/').filter(Boolean);

    // GitHub Pages project site: username.github.io/repo/
    // or user site: username.github.io/
    let username = 'YOUR_USERNAME';
    let repo = 'YOUR_REPO';

    if (host.endsWith('.github.io')) {
      username = host.replace('.github.io', '');
      if (pathParts.length > 0) {
        repo = pathParts[0];
      } else {
        repo = username + '.github.io'; // user/org site
      }
    }

    const url = `https://raw.githubusercontent.com/${username}/${repo}/main/${SUB_FILENAME}`;
    permanentLinkEl.textContent = url;
    return url;
  }

  // ---------- Main logic ----------
  async function loadConfigs() {
    showStatus('loading', '⏳ در حال بارگذاری کانفیگ‌ها...');

    try {
      const response = await fetch(CONFIG_FILE, { cache: 'no-store' });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('FILE_NOT_FOUND');
        }
        throw new Error('FETCH_FAILED');
      }

      const text = await response.text();
      const configs = parseConfigs(text);

      if (configs.length === 0) {
        showStatus(
          'error',
          '❌ فایل configs.txt خالی است یا هیچ کانفیگ معتبری ندارد.<br>لطفاً حداقل یک کانفیگ (vmess:// یا vless:// و ...) اضافه کنید.'
        );
        statsEl.style.display = 'none';
        subBoxEl.textContent = '';
        currentBase64 = '';
        btnCopySub.disabled = true;
        btnDownload.disabled = true;
        return;
      }

      // Success
      hideStatus();
      configCount = configs.length;
      currentBase64 = toBase64(configs.join('\n'));

      // Update UI
      document.getElementById('config-count').textContent = configCount;
      statsEl.style.display = 'flex';

      // Preview (show protocol only for privacy-ish, or full)
      configListEl.textContent = configs
        .map((c, i) => {
          const proto = c.split('://')[0] || 'unknown';
          return `${i + 1}. ${proto}://...`;
        })
        .join('\n');

      subBoxEl.textContent = currentBase64;

      btnCopySub.disabled = false;
      btnDownload.disabled = false;

      buildPermanentLinkHint();
    } catch (err) {
      console.error(err);
      if (err.message === 'FILE_NOT_FOUND') {
        showStatus(
          'error',
          '❌ فایل <code>configs.txt</code> یافت نشد.<br>مطمئن شوید این فایل در ریشهٔ مخزن قرار دارد.'
        );
      } else {
        showStatus(
          'error',
          '❌ خطا در خواندن فایل کانفیگ‌ها. اتصال اینترنت یا مسیر فایل را بررسی کنید.'
        );
      }
      statsEl.style.display = 'none';
      subBoxEl.textContent = '';
      currentBase64 = '';
      btnCopySub.disabled = true;
      btnDownload.disabled = true;
    }
  }

  // ---------- Event handlers ----------
  function copyText(text) {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => showToast('کپی شد ✓'))
      .catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showToast('کپی شد ✓');
        } catch (e) {
          showToast('خطا در کپی');
        }
        document.body.removeChild(ta);
      });
  }

  btnCopySub.addEventListener('click', () => {
    copyText(currentBase64);
  });

  btnDownload.addEventListener('click', () => {
    if (!currentBase64) return;
    const blob = new Blob([currentBase64], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = SUB_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('فایل دانلود شد');
  });

  btnCopyLink.addEventListener('click', () => {
    const link = permanentLinkEl.textContent.trim();
    if (link && !link.includes('YOUR_USERNAME')) {
      copyText(link);
    } else {
      // still copy the template
      copyText(link);
      showToast('لینک قالب کپی شد — نام کاربری را جایگزین کنید');
    }
  });

  // Init
  document.addEventListener('DOMContentLoaded', loadConfigs);
})();

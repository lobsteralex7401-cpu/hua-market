// ══════════════════════════════════════════
//  Google Apps Script 部署網址（與原版相同）
// ══════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyq_RNKI37m1pH1_BiwZy4Ta0EaGuzJ-Pxhu51i04KH1b-rdQP3T3BfoSS9gVev9w/exec';

// ── 檔案上傳顯示 ──
setupFileInput('insuranceFile', 'insurance-name', 'insurance-box');
setupFileInput('foodFile',      'food-name',      'food-box');

function setupFileInput(inputId, labelId, boxId) {
  const input  = document.getElementById(inputId);
  const nameEl = document.getElementById(labelId);
  const box    = document.getElementById(boxId);
  if (!input) return;

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showFieldError(input, '檔案大小不能超過 10MB');
      input.value = '';
      box?.classList.remove('done');
      return;
    }
    nameEl.textContent = '✓ ' + file.name;
    box?.classList.add('done');
    box?.classList.remove('err');
    clearFieldError(input);
  });

  box?.addEventListener('click', () => input.click());

  box?.addEventListener('dragover', e => {
    e.preventDefault();
    box.style.borderColor = 'var(--gold)';
  });
  box?.addEventListener('dragleave', () => {
    box.style.borderColor = '';
  });
  box?.addEventListener('drop', e => {
    e.preventDefault();
    box.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

// ── 資安：表單防護 ──────────────────────────────────
const SUBMIT_COOLDOWN_MS = 60 * 1000;  // 60 秒提交冷卻
const RATE_KEY = 'form_last_hm';

function isRateLimited() {
  const last = parseInt(localStorage.getItem(RATE_KEY) || '0', 10);
  return Date.now() - last < SUBMIT_COOLDOWN_MS;
}
function setRateLimit() { localStorage.setItem(RATE_KEY, String(Date.now())); }

// 輸入長度限制
function sanitizeInputLengths() {
  const limits = { fullName:50, organization:80, phone:20, email:100, socialLink:200, currentChannel:300, productInfo:500, motivation:500 };
  Object.entries(limits).forEach(([name, max]) => {
    const el = form?.querySelector(`[name="${name}"]`);
    if (el) el.setAttribute('maxlength', max);
  });
}

// ── DOM ──
const form      = document.getElementById('registration-form');
const submitBtn = document.getElementById('submit-btn');
const successEl = document.getElementById('success-msg');

sanitizeInputLengths();

// ── 將檔案轉為 base64 ──
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── 表單送出 ──
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors();

  // Honeypot：機器人偵測
  if (form.querySelector('[name="website"]')?.value) return;

  // 提交冷卻限制
  if (isRateLimited()) {
    alert('提交太頻繁，請稍後再試。');
    return;
  }

  if (!validateForm()) return;

  setRateLimit();
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').hidden   = true;
  submitBtn.querySelector('.btn-loading').hidden = false;

  try {
    const insFile  = document.getElementById('insuranceFile')?.files[0];
    const foodFile = document.getElementById('foodFile')?.files[0];

    const [insB64, foodB64] = await Promise.all([
      insFile  ? fileToBase64(insFile)  : Promise.resolve(''),
      foodFile ? fileToBase64(foodFile) : Promise.resolve(''),
    ]);

    const payload = {
      fullName:       form.querySelector('[name="fullName"]').value.trim(),
      organization:   form.querySelector('[name="organization"]').value.trim(),
      phone:          form.querySelector('[name="phone"]').value.trim(),
      email:          form.querySelector('[name="email"]').value.trim(),
      socialLink:     form.querySelector('[name="socialLink"]').value.trim(),
      brandStage:     form.querySelector('[name="brandStage"]').value,
      category:       form.querySelector('[name="category"]').value,
      currentChannel: form.querySelector('[name="currentChannel"]').value.trim(),
      productInfo:    form.querySelector('[name="productInfo"]').value.trim(),
      expectation:    form.querySelector('[name="expectation"]').value,
      motivation:     form.querySelector('[name="motivation"]').value.trim(),
      lineJoined:     form.querySelector('[name="lineJoined"]').value,
      insuranceFile:  insB64,
      insuranceName:  insFile?.name  || '',
      foodFile:       foodB64,
      foodName:       foodFile?.name || '',
    };

    await fetch(GAS_URL, {
      method: 'POST',
      body:   JSON.stringify(payload),
    });

    showSuccess();

  } catch (err) {
    alert('網路錯誤，請稍後重試或直接聯絡主辦方。\n\nLine：@743nyxjm');
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').hidden   = false;
    submitBtn.querySelector('.btn-loading').hidden = true;
  }
});

function showSuccess() {
  form.style.display = 'none';
  if (successEl) {
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ── 再填一份 ──
document.getElementById('reset-btn')?.addEventListener('click', () => {
  form.reset();
  form.style.display = '';
  if (successEl) successEl.hidden = true;
  submitBtn.disabled = false;
  submitBtn.querySelector('.btn-text').hidden   = false;
  submitBtn.querySelector('.btn-loading').hidden = true;

  const insName  = document.getElementById('insurance-name');
  const foodName = document.getElementById('food-name');
  if (insName)  insName.textContent  = '點擊上傳（PDF / 圖片）';
  if (foodName) foodName.textContent = '點擊上傳（PDF / 圖片）';
  document.querySelectorAll('.file-box').forEach(b => b.classList.remove('done', 'err'));
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── 驗證 ──
function validateForm() {
  let ok = true;
  form.querySelectorAll('[required]').forEach(field => {
    if (field.type === 'checkbox') {
      if (!field.checked) { ok = false; showCheckboxError('請勾選以同意條款'); }
    } else {
      const v = field.value.trim();
      if (!v) {
        ok = false; showFieldError(field, '此欄位為必填');
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        ok = false; showFieldError(field, '請輸入有效的電子信箱');
      }
    }
  });
  if (!ok) {
    form.querySelector('.err input, .err select, .err textarea')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return ok;
}

function showFieldError(field, msg) {
  const wrap = field.closest('.field');
  if (!wrap) return;
  wrap.classList.add('err');
  const e = wrap.querySelector('.emsg');
  if (e) e.textContent = msg;
}
function clearFieldError(field) {
  const wrap = field.closest('.field');
  if (!wrap) return;
  wrap.classList.remove('err');
  const e = wrap.querySelector('.emsg');
  if (e) e.textContent = '';
}
function showCheckboxError(msg) {
  const el = document.querySelector('.check-err');
  if (el) el.textContent = msg;
}
function clearAllErrors() {
  form.querySelectorAll('.err').forEach(el => el.classList.remove('err'));
  form.querySelectorAll('.emsg, .check-err').forEach(el => el.textContent = '');
  form.querySelectorAll('.file-box').forEach(b => b.classList.remove('err'));
}

// 電話只允許數字
document.querySelector('[name="phone"]')?.addEventListener('input', function () {
  this.value = this.value.replace(/[^\d]/g, '');
});

// ── 平滑捲動導覽 ──
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

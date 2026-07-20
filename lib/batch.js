/* ============================================
   CompressIO — 批量处理引擎
   多文件上传 + 格式转换 + 预设尺寸 + ZIP打包
   ============================================ */

// ===== 社交平台预设尺寸 =====
const PLATFORMS = {
  instagram: {
    name: 'Instagram',
    sizes: [
      { label: 'Square Post', w: 1080, h: 1080 },
      { label: 'Portrait Post', w: 1080, h: 1350 },
      { label: 'Story / Reels', w: 1080, h: 1920 },
      { label: 'Profile Photo', w: 320, h: 320 },
    ],
  },
  facebook: {
    name: 'Facebook',
    sizes: [
      { label: 'Post', w: 1200, h: 630 },
      { label: 'Cover', w: 820, h: 312 },
      { label: 'Profile Photo', w: 170, h: 170 },
    ],
  },
  twitter: {
    name: 'Twitter / X',
    sizes: [
      { label: 'Post', w: 1600, h: 900 },
      { label: 'Header', w: 1500, h: 500 },
    ],
  },
  linkedin: {
    name: 'LinkedIn',
    sizes: [
      { label: 'Post', w: 1200, h: 627 },
      { label: 'Cover', w: 1584, h: 396 },
    ],
  },
  tiktok: {
    name: 'TikTok',
    sizes: [{ label: 'Video Cover', w: 1080, h: 1920 }],
  },
  youtube: {
    name: 'YouTube',
    sizes: [
      { label: 'Thumbnail', w: 1280, h: 720 },
      { label: 'Channel Art', w: 2560, h: 1440 },
    ],
  },
  pinterest: {
    name: 'Pinterest',
    sizes: [{ label: 'Pin', w: 1000, h: 1500 }],
  },
};

const PLATFORM_KEYS = Object.keys(PLATFORMS);

function fSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

// ===== 批量处理器 =====
function initBatcher() {
  let uid = 1;
  let items = [];
  let outputs = [];
  let busy = false;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const uploadEl = $('#batchUpload');
  const fileInput = $('#batchFileInput');
  const fileList = $('#fileList');
  const emptyMsg = $('#emptyMsg');
  const formatSelect = $('#batchFormat');
  const qualitySlider = $('#batchQuality');
  const qualityVal = $('#batchQualityVal');
  const presetsEl = $('#batchPresets');
  const runBtn = $('#batchRun');
  const clearBtn = $('#batchClear');
  const progressWrap = $('#progressWrap');
  const progressFill = $('#progressFill');
  const progressText = $('#progressText');
  const resultArea = $('#batchResult');
  const resultInfo = $('#resultInfo');
  const downloadBtn = $('#downloadBtn');

  // ===== 渲染预设尺寸 =====
  function renderPresets() {
    if (!presetsEl) return;
    let html = '';
    for (const key of PLATFORM_KEYS) {
      const p = PLATFORMS[key];
      html += `<fieldset class="preset-group" data-platform="${key}">`;
      html += `<legend class="preset-legend"><input type="checkbox" class="preset-platform-chk" data-platform="${key}"> ${p.name}</legend>`;
      html += `<div class="preset-sizes">`;
      for (const s of p.sizes) {
        html += `<label class="preset-label"><input type="checkbox" class="preset-chk" data-id="${key}:${s.w}x${s.h}" checked> ${s.label} <span class="preset-dim">${s.w}×${s.h}</span></label>`;
      }
      html += `</div></fieldset>`;
    }
    presetsEl.innerHTML = html;

    // 全选/取消平台
    presetsEl.querySelectorAll('.preset-platform-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        chk.closest('fieldset').querySelectorAll('.preset-chk').forEach(c => c.checked = chk.checked);
      });
    });
  }
  renderPresets();

  // ===== 获取选中的预设 =====
  function getSelectedPresets() {
    const out = [];
    presetsEl.querySelectorAll('.preset-chk:checked').forEach(chk => {
      const [platform, dim] = chk.dataset.id.split(':');
      const [w, h] = dim.split('x').map(Number);
      const size = PLATFORMS[platform].sizes.find(s => s.w === w && s.h === h);
      if (size) out.push({ platform, label: size.label, w, h });
    });
    return out;
  }

  // ===== 渲染文件列表 =====
  function renderList() {
    if (!fileList) return;
    if (items.length === 0) {
      fileList.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = '';
      return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';
    fileList.innerHTML = items.map(it => {
      const size = fSize(it.file.size);
      const statusIcon = it.status === 'done' ? '✅' : it.status === 'error' ? '❌' : it.status === 'processing' ? '⏳' : '📄';
      const errMsg = it.error ? `<span class="file-error">${it.error}</span>` : '';
      return `<div class="file-card" data-id="${it.id}">
        <div class="file-thumb"><img src="${it.thumbUrl}" alt="${it.name}"></div>
        <div class="file-info">
          <div class="file-name">${it.name}</div>
          <div class="file-meta">${size} · ${it.file.type || 'Unknown'}</div>
          ${errMsg}
        </div>
        <div class="file-status">${statusIcon}</div>
        ${busy ? '' : `<button class="file-remove" data-id="${it.id}">✕</button>`}
      </div>`;
    }).join('');

    fileList.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', () => removeItem(parseInt(btn.dataset.id)));
    });
  }

  // ===== 添加文件 =====
  function addFiles(fileList) {
    const maxFiles = 50;
    const room = maxFiles - items.length;
    const accepted = [];
    for (const f of fileList) {
      if (accepted.length >= room) break;
      if (f.type.startsWith('image/') || /\.heic$/i.test(f.name) || /\.heif$/i.test(f.name)) {
        accepted.push(f);
      }
    }
    const newItems = accepted.map(f => ({
      id: uid++,
      file: f,
      name: f.name,
      size: f.size,
      thumbUrl: /\.(heic|heif)$/i.test(f.name) ? '' : URL.createObjectURL(f),
      status: 'ready',
      error: null,
    }));
    // 对于HEIC文件，需要先解码才能生成缩略图
    items = [...items, ...newItems];
    renderList();
  }

  function removeItem(id) {
    const it = items.find(x => x.id === id);
    if (it && it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
    items = items.filter(x => x.id !== id);
    renderList();
  }

  function clearAll() {
    items.forEach(it => it.thumbUrl && URL.revokeObjectURL(it.thumbUrl));
    items = [];
    outputs = [];
    if (resultArea) resultArea.classList.remove('visible');
    renderList();
  }

  // ===== 单张图片处理（转换+缩放）=====
  async function processOne(file, format, quality, presets) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = await loadImage(file);

    const results = [];

    if (presets.length === 0) {
      // 没有预设：只转换格式
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise(r => canvas.toBlob(r, format, quality / 100));
      const ext = format.split('/')[1].replace('jpeg', 'jpg');
      results.push({ blob, name: file.name.replace(/\.[^.]+$/, '') + '.' + ext });
    } else {
      for (const p of presets) {
        canvas.width = p.w;
        canvas.height = p.h;
        ctx.drawImage(img, 0, 0, p.w, p.h);
        const blob = await new Promise(r => canvas.toBlob(r, format, quality / 100));
        const ext = format.split('/')[1].replace('jpeg', 'jpg');
        const name = file.name.replace(/\.[^.]+$/, '') + `_${p.label.replace(/\s+/g,'_')}_${p.w}x${p.h}.${ext}`;
        results.push({ blob, name });
      }
    }
    return results;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      // 检测 HEIC
      if (/\.(heic|heif)$/i.test(file.name)) {
        if (typeof heic2any === 'undefined') {
          reject(new Error('HEIC decoder not loaded'));
          return;
        }
        heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
          .then(resultBlob => {
            const blob = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
            img.onerror = () => reject(new Error('Failed to decode HEIC'));
            img.src = url;
          })
          .catch(reject);
      } else {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      }
    });
  }

  // ===== 批量处理 =====
  async function runBatch() {
    const targets = items.filter(it => it.status !== 'done');
    const presets = getSelectedPresets();

    if (targets.length === 0) { alert('Add at least one image first.'); return; }
    if (!formatSelect) return;

    const format = formatSelect.value;
    const quality = parseInt(qualitySlider?.value || '90');

    busy = true;
    if (runBtn) runBtn.disabled = true;
    if (progressWrap) progressWrap.style.display = 'block';
    if (resultArea) resultArea.classList.remove('visible');

    const allResults = [];
    let done = 0;

    for (const it of targets) {
      it.status = 'processing';
      renderList();
      try {
        const results = await processOne(it.file, format, quality, presets);
        allResults.push(...results);
        it.status = 'done';
      } catch (e) {
        it.status = 'error';
        it.error = e.message;
      }
      done++;
      if (progressFill) progressFill.style.width = Math.round(done / targets.length * 100) + '%';
      if (progressText) progressText.textContent = `${done} / ${targets.length} files processed`;
      renderList();
    }

    outputs = allResults;
    busy = false;
    if (runBtn) runBtn.disabled = false;

    if (outputs.length > 0) {
      if (resultArea) resultArea.classList.add('visible');
      const fileCount = new Set(outputs.map(o => o.name.replace(/_\w+_\d+x\d+\.\w+$/, ''))).size;
      if (resultInfo) resultInfo.textContent = `Done — ${outputs.length} images ready (${fileCount} source files × ${presets.length > 0 ? presets.length + ' sizes' : 'converted'}).`;
      if (downloadBtn) {
        downloadBtn.classList.add('btn-success');
        downloadBtn.textContent = outputs.length === 1 ? 'Download Image' : `Download ZIP (${outputs.length} images)`;
      }
    }
  }

  // ===== 下载 =====
  async function handleDownload() {
    if (outputs.length === 0) return;
    if (outputs.length === 1) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(outputs[0].blob);
      a.download = outputs[0].name;
      a.click();
      return;
    }
    // 多文件：ZIP 打包
    if (typeof JSZip === 'undefined') {
      alert('ZIP library not loaded. Please refresh and try again.');
      return;
    }
    if (downloadBtn) downloadBtn.textContent = 'Zipping...';
    const zip = new JSZip();
    for (const o of outputs) {
      zip.file(o.name, o.blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'compressio-batch.zip';
    a.click();
    if (downloadBtn) downloadBtn.textContent = outputs.length === 1 ? 'Download Image' : `Download ZIP (${outputs.length} images)`;
  }

  // ===== 事件绑定 =====
  if (uploadEl) {
    uploadEl.addEventListener('click', () => fileInput && fileInput.click());
    uploadEl.addEventListener('dragover', (e) => { e.preventDefault(); uploadEl.classList.add('dragover'); });
    uploadEl.addEventListener('dragleave', () => uploadEl.classList.remove('dragover'));
    uploadEl.addEventListener('drop', (e) => {
      e.preventDefault(); uploadEl.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    });
  }
  if (fileInput) {
    fileInput.setAttribute('multiple', 'true');
    fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) addFiles(fileInput.files); fileInput.value = ''; });
  }

  if (qualitySlider && qualityVal) {
    qualitySlider.addEventListener('input', () => { qualityVal.textContent = qualitySlider.value; });
  }

  if (runBtn) runBtn.addEventListener('click', runBatch);
  if (clearBtn) clearBtn.addEventListener('click', clearAll);
  if (downloadBtn) downloadBtn.addEventListener('click', handleDownload);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('meta[name="tool-type"][content="batch"]')) {
    initBatcher();
  }
});

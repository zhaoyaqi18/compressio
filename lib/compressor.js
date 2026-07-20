/* ============================================
   CompressIO — 核心图片压缩引擎
   纯浏览器端 Canvas + 二分法压缩
   ============================================ */

// ===== 全局状态 =====
let state = {
  originalFile: null,
  originalImage: null,
  compressedBlob: null,
  compressedImage: null,
  targetBytes: null,
  originalSize: 0,
  currentQuality: 0.8,
};

// ===== 步骤条更新 =====
function setStep(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('step' + i);
    if (!el) continue;
    el.className = 'step';
    if (i < step) el.classList.add('done');
    else if (i === step) el.classList.add('active');
  }
}

// ===== 数据统计（localStorage）=====
function addStat(savedBytes) {
  let count = parseInt(localStorage.getItem('cio_count') || '0');
  let total = parseInt(localStorage.getItem('cio_bytes') || '0');
  count++; total += savedBytes;
  localStorage.setItem('cio_count', count);
  localStorage.setItem('cio_bytes', total);
  updateStats();
}
function updateStats() {
  const c = document.getElementById('totalProcessed');
  const s = document.getElementById('totalSaved');
  if (c) c.textContent = localStorage.getItem('cio_count') || '0';
  if (s) {
    const bytes = parseInt(localStorage.getItem('cio_bytes') || '0');
    s.textContent = (bytes / 1048576).toFixed(1) + ' MB';
  }
}
document.addEventListener('DOMContentLoaded', updateStats);

// ===== DOM 缓存 =====
const $ = (s) => document.querySelector(s);
const uploadZone = '#uploadZone';
const fileInput = '#fileInput';
const imageInfo = '#imageInfo';
const previewArea = '#previewArea';
const resultArea = '#resultArea';
const progressBar = '#progressBar';
const progressFill = '#progressFill';

// ===== 工具函数 =====
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function parseTargetSize(text) {
  const map = {
    '100kb': 100 * 1024,
    '200kb': 200 * 1024,
    '300kb': 300 * 1024,
    '500kb': 500 * 1024,
    '1mb': 1 * 1048576,
    '2mb': 2 * 1048576,
    '5mb': 5 * 1048576,
  };
  return map[text] || null;
}

// ===== 核心压缩函数（二分法） =====
function compressImage(file, targetBytes, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        // 如果原图已经小于目标大小，直接返回
        if (file.size <= targetBytes) {
          onProgress && onProgress(100);
          resolve({
            blob: file,
            quality: 1,
            size: file.size,
            width: img.naturalWidth,
            height: img.naturalHeight,
            skipped: true,
          });
          return;
        }

        // 二分法找最佳 quality
        let low = 0.05, high = 1.0, best = 0.8;
        let bestBlob = null;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 先尝试缩小图片尺寸
        let targetWidth = img.naturalWidth;
        let targetHeight = img.naturalHeight;
        const MAX_DIMENSION = 2048;
        
        if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / targetWidth, MAX_DIMENSION / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        for (let attempt = 0; attempt < 20; attempt++) {
          const quality = (low + high) / 2;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
          
          if (!blob) {
            high = quality;
            continue;
          }

          onProgress && onProgress(Math.round((attempt + 1) / 20 * 100));

          if (blob.size > targetBytes) {
            high = quality;
          } else {
            low = quality;
            best = quality;
            bestBlob = blob;
          }

          // 精度够了就停
          if (Math.abs(blob.size - targetBytes) < targetBytes * 0.02) break;
        }

        // 如果二分法没找到合适大小（bestBlob还是null），缩小尺寸再试
        if (!bestBlob) {
          // 缩小到 75% 再试一次
          canvas.width = Math.round(targetWidth * 0.75);
          canvas.height = Math.round(targetHeight * 0.75);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          low = 0.05; high = 1.0;
          for (let attempt = 0; attempt < 15; attempt++) {
            const quality = (low + high) / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
            if (!blob) { high = quality; continue; }
            
            onProgress && onProgress(100);
            
            if (blob.size > targetBytes) {
              high = quality;
            } else {
              low = quality;
              best = quality;
              bestBlob = blob;
            }
            if (Math.abs(blob.size - targetBytes) < targetBytes * 0.02) break;
          }
        }

        // 最后的兜底
        if (!bestBlob) {
          bestBlob = await new Promise((r) => {
            canvas.toBlob(r, 'image/jpeg', 0.05);
          });
          best = 0.05;
        }

        onProgress && onProgress(100);
        resolve({
          blob: bestBlob,
          quality: best,
          size: bestBlob.size,
          width: canvas.width,
          height: canvas.height,
          skipped: false,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ===== UI 初始化 =====
function initCompressor(options = {}) {
  const defaultTarget = options.defaultTarget || '500kb';
  const uploadEl = document.getElementById('uploadZone');
  const fileEl = document.getElementById('fileInput');
  const targetSelect = document.getElementById('targetSize');
  const compressBtn = document.getElementById('compressBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  if (targetSelect) targetSelect.value = defaultTarget;
  state.targetBytes = parseTargetSize(defaultTarget);

  // 更新目标大小
  if (targetSelect) {
    targetSelect.addEventListener('change', () => {
      state.targetBytes = parseTargetSize(targetSelect.value);
    });
  }

  // 上传区域点击
  if (uploadEl) {
    uploadEl.addEventListener('click', () => fileEl && fileEl.click());
    uploadEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadEl.classList.add('dragover');
    });
    uploadEl.addEventListener('dragleave', () => {
      uploadEl.classList.remove('dragover');
    });
    uploadEl.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadEl.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  // 文件选择
  if (fileEl) {
    fileEl.addEventListener('change', () => {
      if (fileEl.files.length > 0) handleFile(fileEl.files[0]);
    });
  }

  // 压缩按钮
  if (compressBtn) {
    compressBtn.addEventListener('click', runCompression);
  }

  // 示例图片点击
  document.querySelectorAll('.sample-item').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.sample;
      const imgPath = '/assets/samples/' + name + '.png';
      fetch(imgPath)
        .then(r => r.blob())
        .then(blob => {
          const file = new File([blob], name + '.png', { type: 'image/png' });
          handleFile(file);
        })
        .catch(() => alert('Failed to load sample image.'));
    });
  });

  // 下载按钮
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (state.compressedBlob) {
        const a = document.createElement('a');
        const ext = state.originalFile.name.match(/\.\w+$/) ? state.originalFile.name.match(/\.\w+$/)[0] : '.jpg';
        const name = state.originalFile.name.replace(/\.[^.]+$/, '') + '_compressed' + ext;
        a.href = URL.createObjectURL(state.compressedBlob);
        a.download = name;
        a.click();
      }
    });
  }

  // 重置
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAll);
  }

  // ===== 处理上传文件 =====
  async function handleFile(file) {
    // 检查是否图片
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP, etc.)');
      return;
    }

    // 清除上一轮结果
    state.compressedBlob = null;
    document.getElementById('resultArea').classList.remove('visible');
    if (document.getElementById('progressBar')) document.getElementById('progressBar').classList.remove('visible');
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
    document.getElementById('compPreview').src = '';
    // 隐藏结果预览框（避免空 src 显示破碎图标）
    const rp = document.querySelectorAll('#previewArea .preview-box');
    if (rp.length >= 2) rp[1].style.display = 'none';

    state.originalFile = file;
    state.originalSize = file.size;
    setStep(2);

    // 读取并显示原图
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;
        showImageInfo(file, img);
        showPreview(img, null);
        if (compressBtn) compressBtn.disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ===== 显示图片信息 =====
  function showImageInfo(file, img) {
    const el = document.getElementById('imageInfo');
    if (!el) return;
    el.classList.add('visible');

    document.getElementById('origName').textContent = file.name;
    document.getElementById('origSize').textContent = formatSize(file.size);
    document.getElementById('origDimensions').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
    document.getElementById('origType').textContent = file.type || 'Unknown';
  }

  // ===== 显示预览 =====
  function showPreview(original, compressed) {
    const el = document.getElementById('previewArea');
    if (!el) return;
    el.style.display = 'grid';

    const origPreview = document.getElementById('origPreview');
    const compPreview = document.getElementById('compPreview');

    if (origPreview && original) {
      origPreview.src = original.src || URL.createObjectURL(state.originalFile);
    }
    if (compPreview && compressed) {
      compPreview.src = compressed.src || URL.createObjectURL(state.compressedBlob);
      document.getElementById('compSize').textContent = formatSize(state.compressedBlob.size);
      const saved = state.originalSize - state.compressedBlob.size;
      const savedPct = ((saved / state.originalSize) * 100).toFixed(1);
      document.getElementById('compSaved').textContent = '-' + formatSize(saved) + ' (' + savedPct + '%)';
    }
  }

  // ===== 执行压缩 =====
  async function runCompression() {
    if (!state.originalFile || !state.targetBytes) return;
    
    const compressBtn = document.getElementById('compressBtn');
    const progressEl = document.getElementById('progressBar');
    const fillEl = document.getElementById('progressFill');
    const resultEl = document.getElementById('resultArea');
    
    if (compressBtn) compressBtn.disabled = true;
    if (progressEl) progressEl.classList.add('visible');
    if (resultEl) resultEl.classList.remove('visible');

    try {
      const result = await compressImage(
        state.originalFile,
        state.targetBytes,
        (pct) => {
          if (fillEl) fillEl.style.width = pct + '%';
        }
      );

      state.compressedBlob = result.blob;
      if (fillEl) fillEl.style.width = '100%';

      // 显示压缩后预览
      const blobUrl = URL.createObjectURL(result.blob);
      const compImg = new Image();
      compImg.onload = () => {
        state.compressedImage = compImg;
        showPreview(state.originalImage, compImg);
        
        // 显示结果
        if (resultEl) {
          // 显示结果预览框
          const rp = document.querySelectorAll('#previewArea .preview-box');
          if (rp.length >= 2) rp[1].style.display = '';
          resultEl.classList.add('visible');
          setStep(3);
          addStat(state.originalSize - result.size);
          document.getElementById('finalSize').textContent = formatSize(result.size);
          document.getElementById('finalReduction').textContent = 
            '-' + formatSize(state.originalSize - result.size) + 
            ' (' + ((1 - result.size / state.originalSize) * 100).toFixed(1) + '%)';
          
          // 自动启用下载
          if (downloadBtn) downloadBtn.classList.add('btn-success');
        }
        
        if (compressBtn) compressBtn.disabled = false;
        setTimeout(() => { if (progressEl) progressEl.classList.remove('visible'); }, 500);
      };
      compImg.src = blobUrl;
    } catch (err) {
      alert('Compression failed: ' + err.message);
      if (compressBtn) compressBtn.disabled = false;
      if (progressEl) progressEl.classList.remove('visible');
    }
  }

  // ===== 重置 =====
  function resetAll() {
    setStep(1);
    state = {
      originalFile: null,
      originalImage: null,
      compressedBlob: null,
      compressedImage: null,
      targetBytes: parseTargetSize(defaultTarget),
      originalSize: 0,
      currentQuality: 0.8,
    };
    
    if (fileEl) fileEl.value = '';
    const info = document.getElementById('imageInfo');
    if (info) info.classList.remove('visible');
    const preview = document.getElementById('previewArea');
    if (preview) preview.style.display = 'none';
    const result = document.getElementById('resultArea');
    if (result) result.classList.remove('visible');
    const progress = document.getElementById('progressBar');
    if (progress) progress.classList.remove('visible');
    if (compressBtn) compressBtn.disabled = true;
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
    if (targetSelect) targetSelect.value = defaultTarget;
  }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('compressApp')) {
    // 从页面meta读取默认目标大小
    const meta = document.querySelector('meta[name="compress-target"]');
    const defaultTarget = meta ? meta.getAttribute('content') : '500kb';
    initCompressor({ defaultTarget });
  }
});

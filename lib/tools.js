/* ============================================
   CompressIO — 多功能图片处理引擎
   支持：格式转换 / 裁剪 / 缩放 / 旋转
   ============================================ */

// ===== 工具函数 =====
function fSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

// 隐藏/显示 Result 预览框（避免空 src 显示破碎图标）
function hideResultPreview() {
  const boxes = document.querySelectorAll('#previewArea .preview-box');
  if (boxes.length >= 2) boxes[1].style.display = 'none';
}
function showResultPreview() {
  const boxes = document.querySelectorAll('#previewArea .preview-box');
  if (boxes.length >= 2) boxes[1].style.display = '';
}

// ===== 格式转换器 =====
function initConverter() {
  const upload = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('targetFormat');
  const convertBtn = document.getElementById('convertBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const previewArea = document.getElementById('previewArea');
  const infoArea = document.getElementById('imageInfo');

  let originalFile = null;
  let resultBlob = null;
  let originalImg = null;

  if (upload) {
    upload.addEventListener('click', () => fileInput && fileInput.click());
    upload.addEventListener('dragover', (e) => { e.preventDefault(); upload.classList.add('dragover'); });
    upload.addEventListener('dragleave', () => upload.classList.remove('dragover'));
    upload.addEventListener('drop', (e) => {
      e.preventDefault(); upload.classList.remove('dragover');
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
  }
  if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

  function loadFile(file) {
    // 检测 HEIC 格式 — 先解码再继续
    const isHeic = /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
    
    async function processFile(f) {
      if (!f.type.startsWith('image/') && !isHeic) {
        alert('Please select an image file.');
        return;
      }

      // 清除上一轮结果
      resultBlob = null;
      document.getElementById('resultArea').classList.remove('visible');
      if (downloadBtn) downloadBtn.classList.remove('btn-success');
      document.getElementById('compPreview').src = '';
      hideResultPreview();

      originalFile = f;
      const r = new FileReader();
      r.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          originalImg = img;
          if (infoArea) {
            infoArea.classList.add('visible');
            document.getElementById('origName').textContent = f.name;
            document.getElementById('origSize').textContent = fSize(f.size);
            document.getElementById('origDimensions').textContent = img.naturalWidth + ' × ' + img.naturalHeight;
            document.getElementById('origType').textContent = isHeic ? 'HEIC' : (f.type || 'image');
          }
          if (previewArea) {
            previewArea.style.display = 'block';
            document.getElementById('origPreview').src = e.target.result;
          }
          if (convertBtn) convertBtn.disabled = false;
        };
        img.src = e.target.result;
      };
      r.readAsDataURL(f);
    }

    if (isHeic) {
      if (typeof heic2any === 'undefined') {
        alert('HEIC decoder not loaded. Please refresh the page and try again.');
        return;
      }
      heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
        .then((resultBlob) => {
          const blob = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
          const jpgFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
          processFile(jpgFile);
        })
        .catch((err) => {
          alert('Failed to decode HEIC file: ' + err.message);
        });
    } else {
      processFile(file);
    }
  }

  if (convertBtn) {
    convertBtn.addEventListener('click', async () => {
      if (!originalFile || !originalImg) return;
      const fmt = formatSelect ? formatSelect.value : 'image/jpeg';
      convertBtn.disabled = true;

      const canvas = document.createElement('canvas');
      canvas.width = originalImg.naturalWidth;
      canvas.height = originalImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(originalImg, 0, 0);

      const quality = fmt === 'image/png' ? undefined : 0.92;
      resultBlob = await new Promise(r => canvas.toBlob(r, fmt, quality));

      if (resultBlob) {
        const url = URL.createObjectURL(resultBlob);
        document.getElementById('compPreview').src = url;
        showResultPreview();
        document.getElementById('resultArea').classList.add('visible');
        const ext = fmt.split('/')[1];
        document.getElementById('resultInfo').textContent =
          `Converted to ${ext.toUpperCase()} · ${fSize(resultBlob.size)} (${((1 - resultBlob.size / originalFile.size) * 100).toFixed(1)}% smaller)`;
        if (downloadBtn) {
          downloadBtn.classList.add('btn-success');
          downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFile.name.replace(/\.[^.]+$/, '') + '.' + ext.replace('jpeg', 'jpg');
            a.click();
          };
        }
      }
      convertBtn.disabled = false;
    });
  }

  if (resetBtn) resetBtn.addEventListener('click', () => {
    originalFile = null; originalImg = null; resultBlob = null;
    if (fileInput) fileInput.value = '';
    if (infoArea) infoArea.classList.remove('visible');
    if (previewArea) previewArea.style.display = 'none';
    document.getElementById('resultArea').classList.remove('visible');
    if (convertBtn) convertBtn.disabled = true;
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
  });
}

// ===== 裁剪工具 =====
function initCropper() {
  const upload = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const cropBtn = document.getElementById('cropBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const canvas = document.getElementById('cropCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const previewArea = document.getElementById('previewArea');

  let img = null;
  let imgData = null;
  let startX, startY, isDragging = false;
  let crop = { x: 0, y: 0, w: 0, h: 0 };
  let antOffset = 0;
  let antFrame = null;

  if (upload) {
    upload.addEventListener('click', () => fileInput && fileInput.click());
    upload.addEventListener('dragover', (e) => { e.preventDefault(); upload.classList.add('dragover'); });
    upload.addEventListener('dragleave', () => upload.classList.remove('dragover'));
    upload.addEventListener('drop', (e) => {
      e.preventDefault(); upload.classList.remove('dragover');
      if (e.dataTransfer.files[0]) loadImg(e.dataTransfer.files[0]);
    });
  }
  if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadImg(fileInput.files[0]); });

  function loadImg(file) {
    if (!file.type.startsWith('image/')) return alert('Please select an image.');
    // 清除上一轮结果
    document.getElementById('resultArea').classList.remove('visible');
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
    document.getElementById('compPreview').src = '';
    hideResultPreview();
    crop = { x: 0, y: 0, w: 0, h: 0 };
    document.getElementById('cropInfo').textContent = 'Drag to select area';

    const r = new FileReader();
    r.onload = (e) => {
      imgData = e.target.result;
      const i = new Image();
      i.onload = () => {
        img = i;
        drawCanvas();
        if (previewArea) {
          previewArea.style.display = 'block';
          document.getElementById('origPreview').src = imgData;
        }
        if (cropBtn) cropBtn.disabled = false;
      };
      i.src = e.target.result;
    };
    r.readAsDataURL(file);
  }
  // ===== 裁剪选区绘制（半透明遮罩 + 蚂蚁线 + 蓝色角标）=====
  function drawCanvas(sel) {
    if (!canvas || !ctx || !img) return;
    const cw = Math.min(img.naturalWidth, canvas.parentElement.clientWidth - 16);
    const ch = cw * (img.naturalHeight / img.naturalWidth);
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    ctx.drawImage(img, 0, 0, cw, ch);

    if (sel && sel.w > 0 && sel.h > 0) {
      // 半透明遮罩 — 用四个矩形覆盖非选区区域，不碰选区内图片
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      // 上
      ctx.fillRect(0, 0, cw, sel.y);
      // 下
      ctx.fillRect(0, sel.y + sel.h, cw, ch - sel.y - sel.h);
      // 左
      ctx.fillRect(0, sel.y, sel.x, sel.h);
      // 右
      ctx.fillRect(sel.x + sel.w, sel.y, cw - sel.x - sel.w, sel.h);

      // 蚂蚁线（白色虚线 + 滚动偏移）
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -antOffset;
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
      ctx.restore();

      // 四角蓝色角标
      const cs = 10;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      // 左上
      ctx.beginPath(); ctx.moveTo(sel.x, sel.y + cs); ctx.lineTo(sel.x, sel.y); ctx.lineTo(sel.x + cs, sel.y); ctx.stroke();
      // 右上
      ctx.beginPath(); ctx.moveTo(sel.x + sel.w - cs, sel.y); ctx.lineTo(sel.x + sel.w, sel.y); ctx.lineTo(sel.x + sel.w, sel.y + cs); ctx.stroke();
      // 左下
      ctx.beginPath(); ctx.moveTo(sel.x, sel.y + sel.h - cs); ctx.lineTo(sel.x, sel.y + sel.h); ctx.lineTo(sel.x + cs, sel.y + sel.h); ctx.stroke();
      // 右下
      ctx.beginPath(); ctx.moveTo(sel.x + sel.w - cs, sel.y + sel.h); ctx.lineTo(sel.x + sel.w, sel.y + sel.h); ctx.lineTo(sel.x + sel.w, sel.y + sel.h - cs); ctx.stroke();
    }
  }

  // 蚂蚁线动画
  function startAnts() {
    if (antFrame) return;
    function animate() {
      antOffset = (antOffset + 0.8) % 14;
      if (crop.w > 0 && crop.h > 0) {
        drawCanvas(crop);
      }
      antFrame = requestAnimationFrame(animate);
    }
    animate();
  }
  function stopAnts() {
    if (antFrame) { cancelAnimationFrame(antFrame); antFrame = null; }
  }

  // 鼠标事件
  if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      isDragging = true;
      crop = { x: startX, y: startY, w: 0, h: 0 };
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      crop = {
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        w: Math.abs(x - startX),
        h: Math.abs(y - startY),
      };
      drawCanvas(crop);
      startAnts();
      document.getElementById('cropInfo').textContent =
        `${Math.round(crop.w)} × ${Math.round(crop.h)} px`;
    });
    canvas.addEventListener('mouseup', () => {
      isDragging = false;
      if (crop.w > 5 && crop.h > 5 && cropBtn) cropBtn.disabled = false;
    });
    canvas.addEventListener('mouseleave', () => {
      if (isDragging) { isDragging = false; }
    });
  }

  if (cropBtn) {
    cropBtn.addEventListener('click', () => {
      if (!img || crop.w < 5 || crop.h < 5) return;
      const scaleX = img.naturalWidth / canvas.width;
      const scaleY = img.naturalHeight / canvas.height;
      const oc = document.createElement('canvas');
      oc.width = Math.round(crop.w * scaleX);
      oc.height = Math.round(crop.h * scaleY);
      const octx = oc.getContext('2d');
      octx.drawImage(img,
        Math.round(crop.x * scaleX), Math.round(crop.y * scaleY),
        Math.round(crop.w * scaleX), Math.round(crop.h * scaleY),
        0, 0, oc.width, oc.height);

      oc.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        document.getElementById('compPreview').src = url;
        showResultPreview();
        document.getElementById('resultArea').classList.add('visible');
        document.getElementById('resultInfo').textContent =
          `Cropped ${oc.width} × ${oc.height} · ${fSize(blob.size)}`;
        if (downloadBtn) {
          downloadBtn.classList.add('btn-success');
          downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cropped_image.jpg';
            a.click();
          };
        }
      }, 'image/jpeg', 0.95);
    });
  }

  if (resetBtn) resetBtn.addEventListener('click', () => {
    stopAnts();
    img = null; imgData = null; crop = { x: 0, y: 0, w: 0, h: 0 };
    if (fileInput) fileInput.value = '';
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    if (previewArea) previewArea.style.display = 'none';
    document.getElementById('resultArea').classList.remove('visible');
    document.getElementById('cropInfo').textContent = 'Drag to select area';
    if (cropBtn) cropBtn.disabled = true;
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
  });
}

// ===== 缩放工具 =====
function initResizer() {
  const upload = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const resizeBtn = document.getElementById('resizeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const widthInput = document.getElementById('newWidth');
  const heightInput = document.getElementById('newHeight');
  const lockCheck = document.getElementById('lockRatio');
  const previewArea = document.getElementById('previewArea');

  let img = null, imgData = null, resultBlob = null;

  if (upload) {
    upload.addEventListener('click', () => fileInput && fileInput.click());
    upload.addEventListener('dragover', (e) => { e.preventDefault(); upload.classList.add('dragover'); });
    upload.addEventListener('dragleave', () => upload.classList.remove('dragover'));
    upload.addEventListener('drop', (e) => {
      e.preventDefault(); upload.classList.remove('dragover');
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
  }
  if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

  function loadFile(file) {
    if (!file.type.startsWith('image/')) return alert('Please select an image file.');
    // 清除上一轮结果
    document.getElementById('resultArea').classList.remove('visible');
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
    document.getElementById('compPreview').src = '';
    hideResultPreview();
    resultBlob = null;

    const r = new FileReader();
    r.onload = (e) => {
      const i = new Image();
      i.onload = () => {
        img = i; imgData = e.target.result;
        if (widthInput) widthInput.value = i.naturalWidth;
        if (heightInput) heightInput.value = i.naturalHeight;
        if (previewArea) {
          previewArea.style.display = 'block';
          document.getElementById('origPreview').src = imgData;
        }
        if (resizeBtn) resizeBtn.disabled = false;
      };
      i.src = e.target.result;
    };
    r.readAsDataURL(file);
  }

  if (widthInput && heightInput && lockCheck) {
    widthInput.addEventListener('input', () => {
      if (lockCheck.checked && img) {
        heightInput.value = Math.round(widthInput.value * (img.naturalHeight / img.naturalWidth));
      }
    });
    heightInput.addEventListener('input', () => {
      if (lockCheck.checked && img) {
        widthInput.value = Math.round(heightInput.value * (img.naturalWidth / img.naturalHeight));
      }
    });
  }

  if (resizeBtn) {
    resizeBtn.addEventListener('click', () => {
      if (!img) return;
      const w = parseInt(widthInput.value) || img.naturalWidth;
      const h = parseInt(heightInput.value) || img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.min(w, 10000));
      canvas.height = Math.max(1, Math.min(h, 10000));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        document.getElementById('compPreview').src = url;
        showResultPreview();
        document.getElementById('resultArea').classList.add('visible');
        document.getElementById('resultInfo').textContent =
          `Resized to ${canvas.width} × ${canvas.height} · ${fSize(blob.size)}`;
        if (downloadBtn) {
          downloadBtn.classList.add('btn-success');
          downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'resized_image.jpg';
            a.click();
          };
        }
      }, 'image/jpeg', 0.92);
    });
  }

  if (resetBtn) resetBtn.addEventListener('click', () => {
    img = null; imgData = null;
    if (fileInput) fileInput.value = '';
    if (previewArea) previewArea.style.display = 'none';
    document.getElementById('resultArea').classList.remove('visible');
    if (resizeBtn) resizeBtn.disabled = true;
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
  });
}

// ===== 旋转工具 =====
function initRotator() {
  const upload = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const rotateBtn = document.getElementById('rotateBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const angleInput = document.getElementById('rotateAngle');
  const previewArea = document.getElementById('previewArea');

  let img = null, imgData = null, currentAngle = 0;

  if (upload) {
    upload.addEventListener('click', () => fileInput && fileInput.click());
    upload.addEventListener('dragover', (e) => { e.preventDefault(); upload.classList.add('dragover'); });
    upload.addEventListener('dragleave', () => upload.classList.remove('dragover'));
    upload.addEventListener('drop', (e) => {
      e.preventDefault(); upload.classList.remove('dragover');
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
  }
  if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

  function loadFile(file) {
    if (!file.type.startsWith('image/')) return alert('Please select an image file.');
    // 清除上一轮结果
    document.getElementById('resultArea').classList.remove('visible');
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
    document.getElementById('compPreview').src = '';
    hideResultPreview();
    currentAngle = 0;
    if (angleInput) angleInput.value = 90;
    document.getElementById('angleDisplay').textContent = '90°';

    const r = new FileReader();
    r.onload = (e) => {
      const i = new Image();
      i.onload = () => {
        img = i; imgData = e.target.result; currentAngle = 0;
        if (previewArea) {
          previewArea.style.display = 'block';
          document.getElementById('origPreview').src = imgData;
        }
        if (rotateBtn) rotateBtn.disabled = false;
      };
      i.src = e.target.result;
    };
    r.readAsDataURL(file);
  }

  if (angleInput) {
    angleInput.addEventListener('input', () => {
      document.getElementById('angleDisplay').textContent = angleInput.value + '°';
    });
  }

  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      if (!img) return;
      const angle = parseInt(angleInput ? angleInput.value : 90);
      const rad = angle * Math.PI / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const w = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
      const h = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        document.getElementById('compPreview').src = url;
        showResultPreview();
        document.getElementById('resultArea').classList.add('visible');
        document.getElementById('resultInfo').textContent =
          `Rotated ${angle}° · ${fSize(blob.size)} · ${w} × ${h}`;
        if (downloadBtn) {
          downloadBtn.classList.add('btn-success');
          downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rotated_image.jpg';
            a.click();
          };
        }
      }, 'image/jpeg', 0.95);
    });
  }

  const presets = document.querySelectorAll('[data-angle]');
  presets.forEach(el => {
    el.addEventListener('click', () => {
      const angle = parseInt(el.dataset.angle);
      if (angleInput) angleInput.value = angle;
      document.getElementById('angleDisplay').textContent = angle + '°';
    });
  });

  if (resetBtn) resetBtn.addEventListener('click', () => {
    img = null; imgData = null; currentAngle = 0;
    if (fileInput) fileInput.value = '';
    if (previewArea) previewArea.style.display = 'none';
    document.getElementById('resultArea').classList.remove('visible');
    if (rotateBtn) rotateBtn.disabled = true;
    if (downloadBtn) downloadBtn.classList.remove('btn-success');
  });
}

// ===== 自动初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  const tool = document.querySelector('meta[name="tool-type"]');
  if (!tool) return;
  switch (tool.getAttribute('content')) {
    case 'convert': initConverter(); break;
    case 'crop': initCropper(); break;
    case 'resize': initResizer(); break;
    case 'rotate': initRotator(); break;
  }
});

(() => {
  'use strict';

  const MAX_FILE_SIZE = 8 * 1024 * 1024;
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  const els = {
    workerUrl: document.getElementById('workerUrl'),
    password: document.getElementById('adminPassword'),
    fileName: document.getElementById('fileName'),
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
    previewWrap: document.getElementById('previewWrap'),
    preview: document.getElementById('preview'),
    previewName: document.getElementById('previewName'),
    previewSize: document.getElementById('previewSize'),
    commitMessage: document.getElementById('commitMessage'),
    uploadButton: document.getElementById('uploadButton'),
    status: document.getElementById('status'),
    presetGrid: document.getElementById('presetGrid')
  };

  let selectedFile = null;
  els.workerUrl.value = localStorage.getItem('trpgTeamWorkerUrl') || '';

  function setStatus(message, type = '') {
    els.status.textContent = message;
    els.status.className = `status ${type}`.trim();
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  }

  function validateFileName(fileName) {
    if (!/^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)) {
      throw new Error('파일명 형식이 올바르지 않습니다. 폴더 경로 없이 파일명만 입력하세요.');
    }
    const ext = fileName.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) throw new Error('지원하지 않는 확장자입니다.');
  }

  function selectFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('이미지 파일만 선택할 수 있습니다.', 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus('파일이 8MB를 초과합니다. 이미지 크기를 줄여주세요.', 'error');
      return;
    }

    selectedFile = file;
    els.preview.src = URL.createObjectURL(file);
    els.previewName.textContent = file.name;
    els.previewSize.textContent = formatBytes(file.size);
    els.previewWrap.hidden = false;
    setStatus('');
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
      reader.readAsDataURL(file);
    });
  }

  els.presetGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-path]');
    if (!button) return;
    els.presetGrid.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    els.fileName.value = button.dataset.path;
  });

  els.fileInput.addEventListener('change', () => selectFile(els.fileInput.files[0]));
  ['dragenter', 'dragover'].forEach(type => els.dropZone.addEventListener(type, event => {
    event.preventDefault();
    els.dropZone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(type => els.dropZone.addEventListener(type, event => {
    event.preventDefault();
    els.dropZone.classList.remove('dragover');
  }));
  els.dropZone.addEventListener('drop', event => selectFile(event.dataTransfer.files[0]));

  els.uploadButton.addEventListener('click', async () => {
    try {
      const workerUrl = els.workerUrl.value.trim().replace(/\/$/, '');
      const password = els.password.value;
      const fileName = els.fileName.value.trim();
      const commitMessage = els.commitMessage.value.trim() || '관리자 페이지에서 이미지 변경';

      if (!workerUrl) throw new Error('Worker 주소를 입력하세요.');
      if (!password) throw new Error('관리자 비밀번호를 입력하세요.');
      if (!selectedFile) throw new Error('업로드할 이미지를 선택하세요.');
      validateFileName(fileName);

      localStorage.setItem('trpgTeamWorkerUrl', workerUrl);
      els.uploadButton.disabled = true;
      setStatus('이미지를 변환하고 GitHub에 저장하는 중입니다…');

      const content = await fileToBase64(selectedFile);
      const response = await fetch(`${workerUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ fileName, content, commitMessage })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `업로드 실패 (${response.status})`);

      setStatus(`업로드 완료: assets/images/${fileName}\n사이트 반영까지 잠시 기다린 뒤 새로고침하세요.`, 'success');
    } catch (error) {
      setStatus(error.message || '알 수 없는 오류가 발생했습니다.', 'error');
    } finally {
      els.uploadButton.disabled = false;
    }
  });
})();

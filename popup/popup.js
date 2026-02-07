document.addEventListener('DOMContentLoaded', async () => {
  const linesInput = document.getElementById('lines');
  const summarizeBtn = document.getElementById('summarize');
  const summarizeMindmapBtn = document.getElementById('summarize-mindmap');
  const settingsBtn = document.getElementById('settings');
  const loadingDiv = document.getElementById('loading');
  const loadingText = document.getElementById('loading-text');
  const resultDiv = document.getElementById('result');
  const summaryContent = document.getElementById('summary-content');
  const copySummaryBtn = document.getElementById('copy-summary');
  const mindmapResultDiv = document.getElementById('mindmap-result');
  const mindmapContainer = document.getElementById('mindmap-container');
  const copyMermaidBtn = document.getElementById('copy-mermaid');
  const errorDiv = document.getElementById('error');

  // Mermaidの初期化
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose'
  });

  // 保存された設定を読み込む
  const settings = await chrome.storage.sync.get(['defaultLines']);
  if (settings.defaultLines) {
    linesInput.value = settings.defaultLines;
  }

  // ページ内容を取得する共通関数
  async function getPageContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          title: document.title,
          content: document.body.innerText
        };
      }
    });
    return result.result;
  }

  // 設定を取得する共通関数
  async function getConfig() {
    const config = await chrome.storage.sync.get(['llmProvider', 'openaiApiKey', 'claudeApiKey', 'geminiApiKey']);
    if (!config.llmProvider) {
      throw new Error('LLMプロバイダーが設定されていません。設定画面から設定してください。');
    }
    return config;
  }

  // UIをリセットする共通関数
  function resetUI() {
    errorDiv.style.display = 'none';
    resultDiv.style.display = 'none';
    mindmapResultDiv.style.display = 'none';
  }

  // ローディング表示
  function showLoading(text) {
    loadingText.textContent = text;
    loadingDiv.style.display = 'block';
  }

  // ローディング非表示
  function hideLoading() {
    loadingDiv.style.display = 'none';
  }

  // ボタンの有効/無効切り替え
  function setButtonsDisabled(disabled) {
    summarizeBtn.disabled = disabled;
    summarizeMindmapBtn.disabled = disabled;
  }

  // 要約ボタンのクリックイベント
  summarizeBtn.addEventListener('click', async () => {
    try {
      resetUI();
      showLoading('要約中...');
      setButtonsDisabled(true);

      const lines = parseInt(linesInput.value) || 10;
      const config = await getConfig();
      const pageData = await getPageContent();

      const response = await chrome.runtime.sendMessage({
        action: 'summarize',
        data: {
          title: pageData.title,
          content: pageData.content,
          lines: lines,
          provider: config.llmProvider,
          apiKeys: {
            openai: config.openaiApiKey,
            claude: config.claudeApiKey,
            gemini: config.geminiApiKey
          }
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // 結果を表示(MarkdownをHTMLに変換)
      summaryContent.dataset.markdown = response.summary;
      summaryContent.innerHTML = marked.parse(response.summary);
      hideLoading();
      resultDiv.style.display = 'block';

    } catch (error) {
      hideLoading();
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    } finally {
      setButtonsDisabled(false);
    }
  });

  // 要約+マインドマップボタンのクリックイベント
  summarizeMindmapBtn.addEventListener('click', async () => {
    try {
      resetUI();
      showLoading('要約とマインドマップを生成中...');
      setButtonsDisabled(true);

      const lines = parseInt(linesInput.value) || 10;
      const config = await getConfig();
      const pageData = await getPageContent();

      const response = await chrome.runtime.sendMessage({
        action: 'summarizeWithMindmap',
        data: {
          title: pageData.title,
          content: pageData.content,
          lines: lines,
          provider: config.llmProvider,
          apiKeys: {
            openai: config.openaiApiKey,
            claude: config.claudeApiKey,
            gemini: config.geminiApiKey
          }
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // 要約を表示
      summaryContent.dataset.markdown = response.summary;
      summaryContent.innerHTML = marked.parse(response.summary);
      resultDiv.style.display = 'block';

      // マインドマップを表示
      mindmapContainer.dataset.mermaid = response.mindmap;
      await renderMindmap(response.mindmap);
      mindmapResultDiv.style.display = 'block';

      hideLoading();

    } catch (error) {
      hideLoading();
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    } finally {
      setButtonsDisabled(false);
    }
  });

  // マインドマップをレンダリング
  async function renderMindmap(mermaidCode) {
    try {
      // コンテナをクリア
      mindmapContainer.innerHTML = '';

      // ユニークなIDを生成
      const id = 'mindmap-' + Date.now();

      // Mermaidでレンダリング
      const { svg } = await mermaid.render(id, mermaidCode);
      mindmapContainer.innerHTML = svg;
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      // エラー時はコードをそのまま表示
      mindmapContainer.innerHTML = `<pre style="white-space: pre-wrap; color: #666;">${mermaidCode}</pre>
        <p style="color: #f44336; font-size: 12px; margin-top: 10px;">マインドマップの描画に失敗しました。Mermaid記法をコピーして外部ツールで確認してください。</p>`;
    }
  }

  // 設定ボタンのクリックイベント
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 要約コピーボタンのクリックイベント
  copySummaryBtn.addEventListener('click', async () => {
    try {
      const textToCopy = summaryContent.dataset.markdown || summaryContent.textContent;
      await navigator.clipboard.writeText(textToCopy);
      const originalText = copySummaryBtn.textContent;
      copySummaryBtn.textContent = 'コピーしました！';
      setTimeout(() => {
        copySummaryBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      errorDiv.textContent = 'コピーに失敗しました';
      errorDiv.style.display = 'block';
    }
  });

  // Mermaidコピーボタンのクリックイベント
  copyMermaidBtn.addEventListener('click', async () => {
    try {
      const mermaidCode = mindmapContainer.dataset.mermaid;
      if (!mermaidCode) {
        throw new Error('Mermaid記法がありません');
      }
      await navigator.clipboard.writeText(mermaidCode);
      const originalText = copyMermaidBtn.textContent;
      copyMermaidBtn.textContent = 'コピーしました！';
      setTimeout(() => {
        copyMermaidBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      errorDiv.textContent = error.message || 'コピーに失敗しました';
      errorDiv.style.display = 'block';
    }
  });

  // ================================================
  // 単語説明機能
  // ================================================

  const MAX_EXPLANATION_DEPTH = 5; // 最大ネストレベル
  const EXPLANATION_DEBOUNCE_MS = 300; // 連続リクエスト防止
  let lastExplanationTime = 0;

  // モーダルマネージャー - 全ての開いているモーダルを追跡
  const ExplanationModalManager = {
    modals: [], // {id, element, depth, word}の配列
    baseZIndex: 1000,

    create(word, depth) {
      const modalId = 'explanation-modal-' + Date.now();
      const zIndex = this.baseZIndex + (depth * 10);

      const overlay = document.createElement('div');
      overlay.className = 'explanation-modal-overlay';
      overlay.style.zIndex = zIndex;
      overlay.dataset.modalId = modalId;

      const modal = document.createElement('div');
      modal.className = 'explanation-modal';

      modal.innerHTML = `
        <div class="explanation-modal-header">
          <h3>${this.escapeHtml(word)}</h3>
          <button class="explanation-close-btn" data-modal-id="${modalId}">&times;</button>
        </div>
        <div class="explanation-modal-content">
          <div class="modal-loading">
            <div class="spinner"></div>
            <div class="modal-loading-text">説明を取得中...</div>
          </div>
        </div>
      `;

      overlay.appendChild(modal);

      // オーバーレイクリックで閉じる
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.remove(modalId);
        }
      });

      // 閉じるボタンハンドラ
      const closeBtn = modal.querySelector('.explanation-close-btn');
      closeBtn.addEventListener('click', () => {
        this.remove(modalId);
      });

      // DOMに追加
      const container = document.getElementById('explanation-modal-container');
      container.appendChild(overlay);

      // 参照を保存
      this.modals.push({ id: modalId, element: overlay, depth, word });

      return modalId;
    },

    updateContent(modalId, content) {
      const modal = this.modals.find(m => m.id === modalId);
      if (!modal) return;

      const contentDiv = modal.element.querySelector('.explanation-modal-content');
      contentDiv.innerHTML = marked.parse(content);

      // ネストされた説明を有効化 - マウスアップ（ドラッグ選択後）で自動的に説明を表示
      contentDiv.addEventListener('mouseup', async (event) => {
        // 少し遅延させて選択が確定するのを待つ
        setTimeout(async () => {
          const selectedText = window.getSelection().toString().trim();
          if (selectedText && selectedText.split(/\s+/).length <= 5 && selectedText.length > 0) {
            const context = this.getSurroundingText(event.target, selectedText);
            await explainWord(selectedText, context, modal.depth + 1);
          }
        }, 100);
      });
    },

    showError(modalId, errorMessage) {
      const modal = this.modals.find(m => m.id === modalId);
      if (!modal) return;

      const contentDiv = modal.element.querySelector('.explanation-modal-content');
      contentDiv.innerHTML = `
        <div style="color: #f44336; padding: 20px; text-align: center;">
          <p style="font-weight: 600; margin-bottom: 10px;">エラーが発生しました</p>
          <p style="font-size: 13px;">${this.escapeHtml(errorMessage)}</p>
        </div>
      `;
    },

    remove(modalId) {
      const modalIndex = this.modals.findIndex(m => m.id === modalId);
      if (modalIndex === -1) return;

      const modal = this.modals[modalIndex];

      // クロージングアニメーションを追加
      modal.element.classList.add('closing');
      modal.element.querySelector('.explanation-modal').classList.add('closing');

      setTimeout(() => {
        modal.element.remove();
        this.modals.splice(modalIndex, 1);
      }, 200); // アニメーション時間に合わせる
    },

    removeAll() {
      this.modals.forEach(modal => {
        modal.element.remove();
      });
      this.modals = [];
    },

    getSurroundingText(element, selectedText) {
      try {
        const fullText = element.textContent || element.innerText || '';
        const selectedIndex = fullText.indexOf(selectedText);
        if (selectedIndex === -1) return '';

        const start = Math.max(0, selectedIndex - 50);
        const end = Math.min(fullText.length, selectedIndex + selectedText.length + 50);
        return fullText.substring(start, end);
      } catch (error) {
        return '';
      }
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // メイン説明関数
  async function explainWord(word, context = '', depth = 0) {
    // 深さ制限チェック
    if (depth >= MAX_EXPLANATION_DEPTH) {
      showToast('これ以上の階層は開けません（最大5階層）');
      return;
    }

    // デバウンスチェック
    const now = Date.now();
    if (now - lastExplanationTime < EXPLANATION_DEBOUNCE_MS) {
      return;
    }
    lastExplanationTime = now;

    // バリデーション
    if (!word || word.trim().length === 0) {
      return;
    }

    // 単語数のバリデーション（最大5単語）
    const wordCount = word.trim().split(/\s+/).length;
    if (wordCount > 5) {
      showToast('選択は5単語以内にしてください');
      return;
    }

    // ローディングモーダルを作成
    const modalId = ExplanationModalManager.create(word, depth);

    try {
      // 設定を取得
      const config = await getConfig();

      // バックグラウンドスクリプトを呼び出す
      const response = await chrome.runtime.sendMessage({
        action: 'explainWord',
        data: {
          word: word,
          context: context,
          provider: config.llmProvider,
          apiKeys: {
            openai: config.openaiApiKey,
            claude: config.claudeApiKey,
            gemini: config.geminiApiKey
          }
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // モーダルを説明で更新
      ExplanationModalManager.updateContent(modalId, response.explanation);

    } catch (error) {
      console.error('Explanation error:', error);
      ExplanationModalManager.showError(modalId, error.message);
    }
  }

  // トースト通知システム
  function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'explanation-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('closing');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  // 単語説明用のイベントリスナー

  // 1. マウスアップ（ドラッグ選択後）で自動的に説明を表示
  summaryContent.addEventListener('mouseup', async (event) => {
    // 少し遅延させて選択が確定するのを待つ
    setTimeout(async () => {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText && selectedText.split(/\s+/).length <= 5 && selectedText.length > 0) {
        const context = ExplanationModalManager.getSurroundingText(event.target, selectedText);
        await explainWord(selectedText, context, 0);
      }
    }, 100);
  });

  // 2. キーボードショートカット（Ctrl/Cmd + E） - グローバルに監視
  document.addEventListener('keydown', async (event) => {
    // Ctrl+E または Cmd+E の処理
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText && selectedText.split(/\s+/).length <= 5) {
        event.preventDefault();
        // 選択テキストの親要素を取得してコンテキストを抽出
        const selection = window.getSelection();
        const anchorNode = selection.anchorNode;
        const context = anchorNode ? ExplanationModalManager.getSurroundingText(anchorNode.parentElement || anchorNode, selectedText) : '';
        await explainWord(selectedText, context, 0);
        return;
      }
    }

    // ESCキーの処理 - 最上位のモーダルのみを閉じる
    if (event.key === 'Escape' && ExplanationModalManager.modals.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      const topModal = ExplanationModalManager.modals[ExplanationModalManager.modals.length - 1];
      ExplanationModalManager.remove(topModal.id);
    }
  });

  // 4. ポップアップが閉じる時に全てのモーダルをクリーンアップ
  window.addEventListener('beforeunload', () => {
    ExplanationModalManager.removeAll();
  });
});

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
});

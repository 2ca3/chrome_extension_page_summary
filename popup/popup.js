document.addEventListener('DOMContentLoaded', async () => {
  const linesInput = document.getElementById('lines');
  const summarizeBtn = document.getElementById('summarize');
  const settingsBtn = document.getElementById('settings');
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  const summaryContent = document.getElementById('summary-content');
  const copyBtn = document.getElementById('copy');
  const errorDiv = document.getElementById('error');

  // 保存された設定を読み込む
  const settings = await chrome.storage.sync.get(['defaultLines']);
  if (settings.defaultLines) {
    linesInput.value = settings.defaultLines;
  }

  // 要約ボタンのクリックイベント
  summarizeBtn.addEventListener('click', async () => {
    try {
      errorDiv.style.display = 'none';
      resultDiv.style.display = 'none';
      loadingDiv.style.display = 'block';
      summarizeBtn.disabled = true;

      const lines = parseInt(linesInput.value) || 10;

      // APIキーとLLMプロバイダーの設定を確認
      const config = await chrome.storage.sync.get(['llmProvider', 'openaiApiKey', 'claudeApiKey', 'geminiApiKey']);

      if (!config.llmProvider) {
        throw new Error('LLMプロバイダーが設定されていません。設定画面から設定してください。');
      }

      // アクティブなタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // コンテンツスクリプトからページ内容を取得
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return {
            title: document.title,
            content: document.body.innerText
          };
        }
      });

      const pageData = result.result;

      // バックグラウンドスクリプトに要約リクエストを送信
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
      summaryContent.dataset.markdown = response.summary; // Markdown元データを保存
      summaryContent.innerHTML = marked.parse(response.summary);
      loadingDiv.style.display = 'none';
      resultDiv.style.display = 'block';

    } catch (error) {
      loadingDiv.style.display = 'none';
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    } finally {
      summarizeBtn.disabled = false;
    }
  });

  // 設定ボタンのクリックイベント
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // コピーボタンのクリックイベント
  copyBtn.addEventListener('click', async () => {
    try {
      // Markdownの元のテキストをコピー(summaryContent.dataset.markdownに保存されたもの)
      const textToCopy = summaryContent.dataset.markdown || summaryContent.textContent;
      await navigator.clipboard.writeText(textToCopy);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'コピーしました！';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      errorDiv.textContent = 'コピーに失敗しました';
      errorDiv.style.display = 'block';
    }
  });
});

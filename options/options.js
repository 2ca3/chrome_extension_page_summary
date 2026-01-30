document.addEventListener('DOMContentLoaded', async () => {
  const defaultLinesInput = document.getElementById('defaultLines');
  const llmProviderSelect = document.getElementById('llmProvider');
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const openaiModelSelect = document.getElementById('openaiModel');
  const claudeApiKeyInput = document.getElementById('claudeApiKey');
  const claudeModelSelect = document.getElementById('claudeModel');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const geminiModelSelect = document.getElementById('geminiModel');
  const saveBtn = document.getElementById('save');
  const testBtn = document.getElementById('test');
  const messageDiv = document.getElementById('message');

  const openaiSection = document.getElementById('openai-section');
  const claudeSection = document.getElementById('claude-section');
  const geminiSection = document.getElementById('gemini-section');

  // 保存された設定を読み込む
  const settings = await chrome.storage.sync.get([
    'defaultLines',
    'llmProvider',
    'openaiApiKey',
    'openaiModel',
    'claudeApiKey',
    'claudeModel',
    'geminiApiKey',
    'geminiModel'
  ]);

  if (settings.defaultLines) defaultLinesInput.value = settings.defaultLines;
  if (settings.llmProvider) llmProviderSelect.value = settings.llmProvider;
  if (settings.openaiApiKey) openaiApiKeyInput.value = settings.openaiApiKey;
  if (settings.openaiModel) openaiModelSelect.value = settings.openaiModel;
  if (settings.claudeApiKey) claudeApiKeyInput.value = settings.claudeApiKey;
  if (settings.claudeModel) claudeModelSelect.value = settings.claudeModel;
  if (settings.geminiApiKey) geminiApiKeyInput.value = settings.geminiApiKey;
  if (settings.geminiModel) geminiModelSelect.value = settings.geminiModel;

  // プロバイダー切り替え時の表示切り替え
  function updateProviderSections() {
    openaiSection.style.display = 'none';
    claudeSection.style.display = 'none';
    geminiSection.style.display = 'none';

    const provider = llmProviderSelect.value;
    if (provider === 'openai') openaiSection.style.display = 'block';
    if (provider === 'claude') claudeSection.style.display = 'block';
    if (provider === 'gemini') geminiSection.style.display = 'block';
  }

  llmProviderSelect.addEventListener('change', updateProviderSections);
  updateProviderSections();

  // 保存ボタンのクリックイベント
  saveBtn.addEventListener('click', async () => {
    try {
      const settingsToSave = {
        defaultLines: parseInt(defaultLinesInput.value),
        llmProvider: llmProviderSelect.value,
        openaiApiKey: openaiApiKeyInput.value,
        openaiModel: openaiModelSelect.value,
        claudeApiKey: claudeApiKeyInput.value,
        claudeModel: claudeModelSelect.value,
        geminiApiKey: geminiApiKeyInput.value,
        geminiModel: geminiModelSelect.value
      };

      await chrome.storage.sync.set(settingsToSave);

      showMessage('設定を保存しました', 'success');
    } catch (error) {
      showMessage('設定の保存に失敗しました: ' + error.message, 'error');
    }
  });

  // 接続テストボタンのクリックイベント
  testBtn.addEventListener('click', async () => {
    try {
      const provider = llmProviderSelect.value;
      if (!provider) {
        showMessage('LLMプロバイダーを選択してください', 'error');
        return;
      }

      const apiKeys = {
        openai: openaiApiKeyInput.value,
        claude: claudeApiKeyInput.value,
        gemini: geminiApiKeyInput.value
      };

      const models = {
        openai: openaiModelSelect.value,
        claude: claudeModelSelect.value,
        gemini: geminiModelSelect.value
      };

      testBtn.disabled = true;
      testBtn.textContent = 'テスト中...';

      const response = await chrome.runtime.sendMessage({
        action: 'testConnection',
        data: {
          provider: provider,
          apiKeys: apiKeys,
          models: models
        }
      });

      if (response.error) {
        showMessage('接続テスト失敗: ' + response.error, 'error');
      } else {
        showMessage('接続テスト成功！', 'success');
      }
    } catch (error) {
      showMessage('接続テストエラー: ' + error.message, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '接続テスト';
    }
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
    messageDiv.style.display = 'block';
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);
  }
});

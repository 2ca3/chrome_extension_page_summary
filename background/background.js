// バックグラウンドサービスワーカー
// LLM APIとの通信を処理

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    handleSummarize(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // 非同期レスポンスを示す
  }

  if (request.action === 'testConnection') {
    handleTestConnection(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

// 要約処理のメイン関数
async function handleSummarize(data) {
  const { title, content, lines, provider, apiKeys } = data;

  if (!content || content.trim().length === 0) {
    throw new Error('ページ内容が空です');
  }

  // プロバイダーに応じてAPIを呼び出す
  let summary;
  switch (provider) {
    case 'openai':
      if (!apiKeys.openai) throw new Error('OpenAI APIキーが設定されていません');
      summary = await callOpenAI(content, lines, apiKeys.openai);
      break;
    case 'claude':
      if (!apiKeys.claude) throw new Error('Claude APIキーが設定されていません');
      summary = await callClaude(content, lines, apiKeys.claude);
      break;
    case 'gemini':
      if (!apiKeys.gemini) throw new Error('Gemini APIキーが設定されていません');
      summary = await callGemini(content, lines, apiKeys.gemini);
      break;
    default:
      throw new Error('未対応のLLMプロバイダーです');
  }

  return { summary };
}

// 接続テスト処理
async function handleTestConnection(data) {
  const { provider, apiKeys, models } = data;

  const testContent = 'これはAPIの接続テストです。';
  const testLines = 1;

  try {
    switch (provider) {
      case 'openai':
        await callOpenAI(testContent, testLines, apiKeys.openai, models.openai);
        break;
      case 'claude':
        await callClaude(testContent, testLines, apiKeys.claude, models.claude);
        break;
      case 'gemini':
        await callGemini(testContent, testLines, apiKeys.gemini, models.gemini);
        break;
      default:
        throw new Error('未対応のLLMプロバイダーです');
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
}

// OpenAI API呼び出し
async function callOpenAI(content, lines, apiKey, model = 'gpt-4o') {
  const settings = await chrome.storage.sync.get(['openaiModel']);
  const selectedModel = model || settings.openaiModel || 'gpt-4o';

  const prompt = `以下のWebページの内容を${lines}行程度で要約してください。
要点を簡潔にまとめてください。

**必ずMarkdown形式で出力してください:**
- 見出しには # を使用
- 重要なポイントは箇条書き(- または *)を使用
- 強調したい部分は **太字** を使用
- 必要に応じてコードブロックや引用も使用可能

${content}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: 'あなたは優秀な要約アシスタントです。Webページの内容を簡潔に要約してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Claude API呼び出し
async function callClaude(content, lines, apiKey, model = 'claude-sonnet-4-5') {
  const settings = await chrome.storage.sync.get(['claudeModel']);
  const selectedModel = model || settings.claudeModel || 'claude-sonnet-4-5';

  const prompt = `以下のWebページの内容を${lines}行程度で要約してください。
要点を簡潔にまとめてください。

**必ずMarkdown形式で出力してください:**
- 見出しには # を使用
- 重要なポイントは箇条書き(- または *)を使用
- 強調したい部分は **太字** を使用
- 必要に応じてコードブロックや引用も使用可能

${content}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: selectedModel,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// Gemini API呼び出し
async function callGemini(content, lines, apiKey, model = 'gemini-2.5-flash') {
  const settings = await chrome.storage.sync.get(['geminiModel']);
  const selectedModel = model || settings.geminiModel || 'gemini-2.5-flash';

  const prompt = `以下のWebページの内容を${lines}行程度で要約してください。
要点を簡潔にまとめてください。

**必ずMarkdown形式で出力してください:**
- 見出しには # を使用
- 重要なポイントは箇条書き(- または *)を使用
- 強調したい部分は **太字** を使用
- 必要に応じてコードブロックや引用も使用可能

${content}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// インストール時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('Page Summary extension installed');
});

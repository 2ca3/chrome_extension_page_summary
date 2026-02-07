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

  if (request.action === 'summarizeWithMindmap') {
    handleSummarizeWithMindmap(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'testConnection') {
    handleTestConnection(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'explainWord') {
    handleExplainWord(request.data)
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

// 要約+マインドマップ処理のメイン関数
async function handleSummarizeWithMindmap(data) {
  const { title, content, lines, provider, apiKeys } = data;

  if (!content || content.trim().length === 0) {
    throw new Error('ページ内容が空です');
  }

  // プロバイダーに応じてAPIを呼び出す
  let result;
  switch (provider) {
    case 'openai':
      if (!apiKeys.openai) throw new Error('OpenAI APIキーが設定されていません');
      result = await callOpenAIWithMindmap(content, lines, apiKeys.openai);
      break;
    case 'claude':
      if (!apiKeys.claude) throw new Error('Claude APIキーが設定されていません');
      result = await callClaudeWithMindmap(content, lines, apiKeys.claude);
      break;
    case 'gemini':
      if (!apiKeys.gemini) throw new Error('Gemini APIキーが設定されていません');
      result = await callGeminiWithMindmap(content, lines, apiKeys.gemini);
      break;
    default:
      throw new Error('未対応のLLMプロバイダーです');
  }

  return result;
}

// 単語説明処理のメイン関数
async function handleExplainWord(data) {
  const { word, context, provider, apiKeys } = data;

  if (!word || word.trim().length === 0) {
    throw new Error('単語が指定されていません');
  }

  // プロバイダーに応じてAPIを呼び出す
  let explanation;
  switch (provider) {
    case 'openai':
      if (!apiKeys.openai) throw new Error('OpenAI APIキーが設定されていません');
      explanation = await callOpenAIExplanation(word, context, apiKeys.openai);
      break;
    case 'claude':
      if (!apiKeys.claude) throw new Error('Claude APIキーが設定されていません');
      explanation = await callClaudeExplanation(word, context, apiKeys.claude);
      break;
    case 'gemini':
      if (!apiKeys.gemini) throw new Error('Gemini APIキーが設定されていません');
      explanation = await callGeminiExplanation(word, context, apiKeys.gemini);
      break;
    default:
      throw new Error('未対応のLLMプロバイダーです');
  }

  return { explanation };
}

// 単語説明用のプロンプトを生成
function getExplanationPrompt(word, context) {
  return `以下の単語について、簡潔に説明してください(2-3文程度)。

単語: ${word}

${context ? `文脈: ${context}` : ''}

説明は平易な日本語で、初心者にも分かりやすく記述してください。
**Markdown形式で出力してください**（見出し、箇条書き、太字を適宜使用）。`;
}

// OpenAI APIで単語説明
async function callOpenAIExplanation(word, context, apiKey) {
  const settings = await chrome.storage.sync.get(['openaiModel']);
  const selectedModel = settings.openaiModel || 'gpt-4o';

  const prompt = getExplanationPrompt(word, context);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: 'system', content: 'あなたは優秀な辞書アシスタントです。単語を分かりやすく説明してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Claude APIで単語説明
async function callClaudeExplanation(word, context, apiKey) {
  const settings = await chrome.storage.sync.get(['claudeModel']);
  const selectedModel = settings.claudeModel || 'claude-sonnet-4-5';

  const prompt = getExplanationPrompt(word, context);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: selectedModel,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
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

// Gemini APIで単語説明
async function callGeminiExplanation(word, context, apiKey) {
  const settings = await chrome.storage.sync.get(['geminiModel']);
  const selectedModel = settings.geminiModel || 'gemini-2.5-flash';

  const prompt = getExplanationPrompt(word, context);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300
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

// マインドマップ用プロンプト生成
function getMindmapPrompt(content, lines) {
  return `以下のWebページの内容を分析し、要約とマインドマップを生成してください。

【重要】必ず以下の形式で出力してください。形式を厳守してください。

---SUMMARY---
# タイトル

- ポイント1
- ポイント2
- ポイント3

（${lines}行程度のMarkdown形式の要約をここに記述。見出し#、箇条書き-、**太字**を使用）

---MINDMAP---
mindmap
  root((テーマ))
    トピック1
      サブ1A
      サブ1B
    トピック2
    トピック3

【マインドマップのルール】
- 必ず「mindmap」で始める
- root((テーマ名))の形式でルートを記述
- 子ノードはスペース2つでインデント
- 各ノードは10文字以内
- 階層は3階層まで
- 括弧やコロンなどの特殊文字は使わない（ルートの(())は除く）

---

Webページ内容:
${content}`;
}

// OpenAI API呼び出し（マインドマップ付き）
async function callOpenAIWithMindmap(content, lines, apiKey, model = 'gpt-4o') {
  const settings = await chrome.storage.sync.get(['openaiModel']);
  const selectedModel = model || settings.openaiModel || 'gpt-4o';

  const prompt = getMindmapPrompt(content, lines);

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
          content: 'あなたは優秀な要約アシスタントです。指示されたフォーマットに厳密に従って出力してください。'
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
  return parseResponse(data.choices[0].message.content);
}

// Claude API呼び出し（マインドマップ付き）
async function callClaudeWithMindmap(content, lines, apiKey, model = 'claude-sonnet-4-5') {
  const settings = await chrome.storage.sync.get(['claudeModel']);
  const selectedModel = model || settings.claudeModel || 'claude-sonnet-4-5';

  const prompt = getMindmapPrompt(content, lines);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: selectedModel,
      max_tokens: 2048,
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
  return parseResponse(data.content[0].text);
}

// Gemini API呼び出し（マインドマップ付き）
async function callGeminiWithMindmap(content, lines, apiKey, model = 'gemini-2.5-flash') {
  const settings = await chrome.storage.sync.get(['geminiModel']);
  const selectedModel = model || settings.geminiModel || 'gemini-2.5-flash';

  const prompt = getMindmapPrompt(content, lines);

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
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return parseResponse(data.candidates[0].content.parts[0].text);
}

// レスポンスをパースして要約とマインドマップを分離
function parseResponse(responseText) {
  let summary = '';
  let mindmap = '';

  // コードブロックを先に処理
  let cleanedText = responseText;
  cleanedText = cleanedText.replace(/```mermaid\s*/g, '');
  cleanedText = cleanedText.replace(/```markdown\s*/g, '');
  cleanedText = cleanedText.replace(/```\s*/g, '');

  // ---SUMMARY--- と ---MINDMAP--- の形式でパース（大文字小文字を無視）
  const summaryMatch = cleanedText.match(/---\s*SUMMARY\s*---\s*([\s\S]*?)\s*---\s*MINDMAP\s*---/i);
  const mindmapMatch = cleanedText.match(/---\s*MINDMAP\s*---\s*([\s\S]*?)$/i);

  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }

  if (mindmapMatch && mindmapMatch[1]) {
    mindmap = mindmapMatch[1].trim();
  }

  // 要約が空の場合のフォールバック処理
  if (!summary) {
    // mindmapの前のテキストを要約として使用
    const mindmapIndex = cleanedText.search(/mindmap\s/i);
    if (mindmapIndex > 0) {
      summary = cleanedText.substring(0, mindmapIndex).trim();
      // マーカーを削除
      summary = summary.replace(/---\s*SUMMARY\s*---/gi, '');
      summary = summary.replace(/---\s*MINDMAP\s*---/gi, '');
      summary = summary.replace(/---+/g, '');
      summary = summary.trim();
    }
    // それでも空の場合
    if (!summary) {
      // レスポンス全体からmindmap部分を除外
      const mindmapStart = cleanedText.search(/mindmap\s/i);
      if (mindmapStart > 0) {
        summary = cleanedText.substring(0, mindmapStart);
      } else {
        summary = cleanedText;
      }
      summary = summary.replace(/---\s*SUMMARY\s*---/gi, '');
      summary = summary.replace(/---\s*MINDMAP\s*---/gi, '');
      summary = summary.replace(/---+/g, '');
      summary = summary.trim();
    }
  }

  // mindmapが空またはパースに失敗した場合のフォールバック
  if (!mindmap || !mindmap.match(/^mindmap\s/i)) {
    // レスポンス内からmindmapを直接探す
    const directMindmapMatch = cleanedText.match(/(mindmap[\s\S]*)/i);
    if (directMindmapMatch && directMindmapMatch[1]) {
      mindmap = directMindmapMatch[1].trim();
    }
  }

  // mindmapが正しい形式で始まっているか確認
  if (mindmap && !mindmap.match(/^mindmap\s/i)) {
    const fixMatch = mindmap.match(/(mindmap[\s\S]*)/i);
    if (fixMatch) {
      mindmap = fixMatch[1].trim();
    }
  }

  // それでもmindmapが空の場合のフォールバック
  if (!mindmap || !mindmap.match(/^mindmap\s/i)) {
    mindmap = `mindmap
  root((要約))
    内容を取得できませんでした`;
  }

  console.log('Parsed summary:', summary.substring(0, 100));
  console.log('Parsed mindmap:', mindmap.substring(0, 100));

  return { summary, mindmap };
}

// インストール時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('Page Summary extension installed');
});

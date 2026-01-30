// コンテンツスクリプト
// このスクリプトは各Webページに注入され、ページの内容を抽出する役割を担います

// ページの主要なコンテンツを抽出する関数
function extractPageContent() {
  // メインコンテンツを抽出（ナビゲーション、フッター、広告などを除外）
  const mainContent = document.querySelector('main, article, [role="main"]');

  let content = '';

  if (mainContent) {
    content = mainContent.innerText;
  } else {
    // mainタグがない場合はbody全体から抽出
    content = document.body.innerText;
  }

  // 空白行を削除し、内容を整形
  content = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return {
    title: document.title,
    url: window.location.href,
    content: content,
    timestamp: new Date().toISOString()
  };
}

// メッセージリスナー（必要に応じて使用）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const pageData = extractPageContent();
    sendResponse(pageData);
  }
  return true;
});

// ページ読み込み完了時のログ（デバッグ用）
console.log('Page Summary: Content script loaded');

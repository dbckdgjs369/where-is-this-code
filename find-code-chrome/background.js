// Background Script - 익스텐션의 백그라운드에서 실행
chrome.runtime.onInstalled.addListener(() => {
  console.log("Find Code extension installed");
});

// 탭이 업데이트될 때 content script 상태 확인
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    // localhost 페이지인지 확인
    if (tab.url.includes("localhost")) {
      console.log("Localhost page detected:", tab.url);

      // content script가 로드되었는지 확인
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { type: "PING" }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("Content script not loaded yet for tab:", tabId);
          } else {
            console.log("Content script is active for tab:", tabId);
          }
        });
      }, 1000); // 1초 후 확인
    }
  }
});

// 익스텐션 아이콘 클릭 시 팝업 표시
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes("localhost")) {
    // 팝업 표시
    chrome.action.setPopup({ tabId: tab.id, popup: "popup.html" });
  }
});

// 메시지 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_STATUS") {
    // 현재 상태 반환
    sendResponse({
      status: "active",
      timestamp: Date.now(),
    });
  }

  if (request.type === "TOGGLE_ACTIVE") {
    // content script에 활성화/비활성화 메시지 전달
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "TOGGLE_ACTIVE",
        });
      }
    });
  }
});

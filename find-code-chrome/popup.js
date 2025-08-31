// Popup Script - 익스텐션 팝업의 동작을 제어
class PopupController {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateStatus();
    this.checkPageStatus();
    this.updateShortcuts();
  }

  bindEvents() {
    // 토글 버튼 이벤트
    document.getElementById("toggle-btn").addEventListener("click", () => {
      this.toggleElementFinder();
    });

    // 새로고침 버튼 이벤트
    document.getElementById("refresh-btn").addEventListener("click", () => {
      this.refreshConnection();
    });
  }

  async updateStatus() {
    try {
      // 현재 활성 탭 가져오기
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab && tab.url && tab.url.includes("localhost")) {
        // localhost 페이지인 경우
        document.getElementById("page-status").textContent = "Localhost Page";
        document.getElementById("page-status").className =
          "status-value connected";

        // content script 상태 확인
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: "GET_STATUS",
          });
          if (response && response.status) {
            document.getElementById("extension-status").textContent = "Active";
            document.getElementById("extension-status").className =
              "status-value connected";
          }
        } catch (error) {
          // content script가 로드되지 않은 경우
          document.getElementById("extension-status").textContent =
            "Not Loaded";
          document.getElementById("extension-status").className =
            "status-value disconnected";
        }
      } else {
        // localhost 페이지가 아닌 경우
        document.getElementById("page-status").textContent = "Not Localhost";
        document.getElementById("page-status").className =
          "status-value disconnected";
        document.getElementById("extension-status").textContent = "Inactive";
        document.getElementById("extension-status").className =
          "status-value disconnected";
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }

  async checkPageStatus() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab && tab.url) {
        // VSCode 연결 상태 확인
        this.checkVSCodeConnection();
      }
    } catch (error) {
      console.error("Error checking page status:", error);
    }
  }

  async checkVSCodeConnection() {
    try {
      // WebSocket 연결 테스트
      const ws = new WebSocket("ws://localhost:3000");

      ws.onopen = () => {
        document.getElementById("vscode-status").textContent = "Connected";
        document.getElementById("vscode-status").className =
          "status-value connected";
        ws.close();
      };

      ws.onerror = () => {
        document.getElementById("vscode-status").textContent = "Disconnected";
        document.getElementById("vscode-status").className =
          "status-value disconnected";
      };

      // 3초 후 연결 시도 중단
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          document.getElementById("vscode-status").textContent = "Disconnected";
          document.getElementById("vscode-status").className =
            "status-value disconnected";
        }
      }, 3000);
    } catch (error) {
      document.getElementById("vscode-status").textContent = "Disconnected";
      document.getElementById("vscode-status").className =
        "status-value disconnected";
    }
  }

  async toggleElementFinder() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab && tab.url && tab.url.includes("localhost")) {
        // content script에 토글 메시지 전송
        await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_ACTIVE" });

        // 버튼 텍스트 업데이트
        const toggleBtn = document.getElementById("toggle-btn");
        if (toggleBtn.textContent === "Activate Element Finder") {
          toggleBtn.textContent = "Deactivate Element Finder";
          toggleBtn.className = "btn secondary";
        } else {
          toggleBtn.textContent = "Activate Element Finder";
          toggleBtn.className = "btn";
        }

        // 상태 업데이트
        setTimeout(() => this.updateStatus(), 100);
      } else {
        alert("This extension only works on localhost pages.");
      }
    } catch (error) {
      console.error("Error toggling element finder:", error);
      alert(
        "Error: Make sure you are on a localhost page and refresh the page."
      );
    }
  }

  async refreshConnection() {
    try {
      // VSCode 연결 상태 다시 확인
      this.checkVSCodeConnection();

      // 페이지 상태 업데이트
      this.updateStatus();

      // 새로고침 버튼에 로딩 표시
      const refreshBtn = document.getElementById("refresh-btn");
      const originalText = refreshBtn.textContent;
      refreshBtn.textContent = "Refreshing...";
      refreshBtn.disabled = true;

      setTimeout(() => {
        refreshBtn.textContent = originalText;
        refreshBtn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("Error refreshing connection:", error);
    }
  }

  updateShortcuts() {
    // 운영체제 감지하여 적절한 단축키 표시
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const toggleShortcut = document.getElementById("toggle-shortcut");

    if (toggleShortcut) {
      if (isMac) {
        toggleShortcut.textContent = "Cmd+Shift+E";
        toggleShortcut.title = "Command+Shift+E";
      } else {
        toggleShortcut.textContent = "Ctrl+Shift+E";
        toggleShortcut.title = "Control+Shift+E";
      }
    }
  }
}

// 팝업 초기화
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});

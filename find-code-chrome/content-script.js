// Content Script - 페이지에서 실행되어 요소 클릭 감지
class ElementFinder {
  constructor() {
    this.isActive = false;
    this.highlightedElement = null;
    this.init();
  }

  init() {
    // VSCode와의 통신을 위한 WebSocket 연결
    this.connectToVSCode();

    // 마우스 이벤트 리스너 등록
    this.addEventListeners();

    // 상태 표시 UI 추가
    this.addStatusUI();
  }

  connectToVSCode() {
    // VSCode 익스텐션과의 WebSocket 연결
    this.ws = new WebSocket("ws://localhost:5173");

    this.ws.onopen = () => {
      console.log("Connected to VSCode extension");
      this.updateStatus("Connected to VSCode");
    };

    this.ws.onclose = () => {
      console.log("Disconnected from VSCode extension");
      this.updateStatus("Disconnected from VSCode");
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.updateStatus("Connection error");
    };
  }

  addEventListeners() {
    // 마우스 오버 시 요소 하이라이트
    document.addEventListener("mouseover", (e) => {
      if (this.isActive && e.target !== this.highlightedElement) {
        this.highlightElement(e.target);
      }
    });

    // 마우스 아웃 시 하이라이트 제거
    document.addEventListener("mouseout", (e) => {
      if (this.isActive && e.target === this.highlightedElement) {
        this.removeHighlight();
      }
    });

    // 클릭 시 요소 정보 전송
    document.addEventListener("click", (e) => {
      if (this.isActive) {
        e.preventDefault();
        e.stopPropagation();
        this.handleElementClick(e.target);
      }
    });

    // 키보드 단축키 (Ctrl+Shift+E 또는 Cmd+Shift+E, ESC)
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E") {
        this.toggleActive();
      } else if (e.key === "Escape" && this.isActive) {
        // ESC 키로 비활성화
        this.toggleActive();
      }
    });

    // background script로부터의 메시지 처리
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "PING") {
        // PING 메시지에 응답
        sendResponse({
          status: "pong",
          timestamp: Date.now(),
          message: "Content script is active",
        });
        return true; // 비동기 응답을 위해 true 반환
      }

      if (request.type === "TOGGLE_ACTIVE") {
        // 토글 메시지 처리
        this.toggleActive();
        sendResponse({ success: true });
        return true;
      }
    });
  }

  toggleActive() {
    this.isActive = !this.isActive;
    this.updateStatus(
      this.isActive
        ? "Active - Click elements to find code (Ctrl+Shift+E to toggle)"
        : "Inactive (Ctrl+Shift+E to activate)"
    );

    if (this.isActive) {
      // 활성화 시 커서를 crosshair로 변경하고 전체 페이지에 적용
      document.body.style.cursor = "crosshair";
      document.documentElement.style.cursor = "crosshair";

      // 모든 요소에 crosshair 커서 적용 (더 명확한 시각적 피드백)
      this.applyCursorToAllElements("crosshair");

      // 활성화 상태를 시각적으로 표시
      this.showActiveIndicator();
    } else {
      // 비활성화 시 기본 커서로 복원
      document.body.style.cursor = "default";
      document.documentElement.style.cursor = "default";

      // 모든 요소의 커서를 기본값으로 복원
      this.applyCursorToAllElements("default");

      // 활성화 표시 제거
      this.hideActiveIndicator();

      this.removeHighlight();
    }
  }

  highlightElement(element) {
    this.removeHighlight();
    this.highlightedElement = element;

    // 요소 하이라이트 스타일 적용
    element.style.outline = "2px solid #007acc";
    element.style.outlineOffset = "2px";
    element.style.backgroundColor = "rgba(0, 122, 204, 0.1)";
  }

  removeHighlight() {
    if (this.highlightedElement) {
      this.highlightedElement.style.outline = "";
      this.highlightedElement.style.outlineOffset = "";
      this.highlightedElement.style.backgroundColor = "";
      this.highlightedElement = null;
    }
  }

  applyCursorToAllElements(cursorStyle) {
    // 모든 요소에 커서 스타일 적용
    const allElements = document.querySelectorAll("*");
    allElements.forEach((element) => {
      // 특정 요소들은 제외 (버튼, 링크 등)
      if (!this.shouldExcludeFromCursor(element)) {
        element.style.cursor = cursorStyle;
      }
    });
  }

  shouldExcludeFromCursor(element) {
    // 커서 변경을 제외할 요소들
    const excludeSelectors = [
      "button",
      "input",
      "select",
      "textarea",
      "a",
      '[role="button"]',
      '[role="link"]',
      "[tabindex]",
    ];

    return excludeSelectors.some(
      (selector) => element.matches(selector) || element.closest(selector)
    );
  }

  showActiveIndicator() {
    // 활성화 상태를 시각적으로 표시하는 오버레이 생성
    if (this.activeIndicator) {
      this.activeIndicator.remove();
    }

    this.activeIndicator = document.createElement("div");
    this.activeIndicator.id = "find-code-active-indicator";
    this.activeIndicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #007acc, #00d4ff, #007acc);
      background-size: 200% 100%;
      animation: find-code-active 2s linear infinite;
      z-index: 10001;
      pointer-events: none;
    `;

    // 애니메이션 스타일 추가
    if (!this.activeIndicatorStyle) {
      this.activeIndicatorStyle = document.createElement("style");
      this.activeIndicatorStyle.textContent = `
        @keyframes find-code-active {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `;
      document.head.appendChild(this.activeIndicatorStyle);
    }

    document.body.appendChild(this.activeIndicator);

    // 상태 메시지 업데이트
    this.updateStatus(
      "Active - Click elements to find code (Ctrl+Shift+E to toggle, ESC to deactivate)"
    );
  }

  hideActiveIndicator() {
    // 활성화 표시 제거
    if (this.activeIndicator) {
      this.activeIndicator.remove();
      this.activeIndicator = null;
    }
  }

  async handleElementClick(element) {
    try {
      // 요소 정보 수집
      const elementInfo = this.collectElementInfo(element);

      // VSCode로 정보 전송
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "FIND_ELEMENT",
            data: elementInfo,
          })
        );

        this.updateStatus("Element info sent to VSCode");
      } else {
        // WebSocket이 연결되지 않은 경우 HTTP 요청으로 대체
        await this.sendViaHTTP(elementInfo);
      }

      // 하이라이트 제거
      this.removeHighlight();
    } catch (error) {
      console.error("Error handling element click:", error);
      this.updateStatus("Error sending element info");
    }
  }

  collectElementInfo(element) {
    // 요소의 상세 정보 수집
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    // Source Map 관련 정보 수집
    const sourceMapInfo = this.collectSourceMapInfo(element);

    return {
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      id: element.id,
      textContent: element.textContent?.substring(0, 100) || "",
      attributes: this.getAttributes(element),
      position: {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      },
      styles: {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight,
      },
      path: this.getElementPath(element),
      // Source Map 정보 추가
      sourceMap: sourceMapInfo,
      // 현재 페이지 정보
      pageInfo: {
        url: window.location.href,
        title: document.title,
        sourceFile: this.getCurrentSourceFile(),
      },
      timestamp: Date.now(),
    };
  }

  getAttributes(element) {
    const attributes = {};
    for (let attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        selector += `.${current.className.split(" ").join(".")}`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(" > ");
  }

  collectSourceMapInfo(element) {
    try {
      // 개발자 도구에서 Source Map 정보 수집 시도
      const sourceMapInfo = {
        hasSourceMap: false,
        sourceFile: null,
        line: null,
        column: null,
      };

      // 현재 스크립트의 Source Map 정보 확인
      const scripts = document.querySelectorAll("script[src]");
      for (const script of scripts) {
        if (script.src.includes(".js") || script.src.includes(".ts")) {
          sourceMapInfo.hasSourceMap = true;
          sourceMapInfo.sourceFile = script.src.split("/").pop(); // 파일명만 추출
          break;
        }
      }

      // CSS Source Map 정보 확인
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      for (const link of links) {
        if (link.href.includes(".css")) {
          sourceMapInfo.hasSourceMap = true;
          break;
        }
      }

      return sourceMapInfo;
    } catch (error) {
      console.error("Error collecting Source Map info:", error);
      return {
        hasSourceMap: false,
        sourceFile: null,
        line: null,
        column: null,
      };
    }
  }

  getCurrentSourceFile() {
    try {
      // 현재 페이지의 소스 파일 정보 추출
      const url = window.location.href;
      const pathname = window.location.pathname;

      // localhost 개발 환경에서 일반적인 파일명 추출
      if (pathname.endsWith("/") || pathname === "") {
        return "index.html"; // 루트 페이지
      } else if (pathname.endsWith(".html")) {
        return pathname.split("/").pop(); // HTML 파일
      } else if (pathname.includes("/")) {
        // 경로가 있는 경우
        const parts = pathname.split("/");
        const lastPart = parts[parts.length - 1];
        if (pathname.includes(".")) {
          return lastPart; // 확장자가 있는 파일
        } else {
          return "index.html"; // 디렉토리인 경우
        }
      }

      return "index.html";
    } catch (error) {
      console.error("Error getting current source file:", error);
      return "index.html";
    }
  }

  async sendViaHTTP(elementInfo) {
    try {
      const response = await fetch("http://localhost:3000/find-element", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(elementInfo),
      });

      if (response.ok) {
        this.updateStatus("Element info sent via HTTP");
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("HTTP request failed:", error);
      this.updateStatus("HTTP request failed");
    }
  }

  addStatusUI() {
    // 상태 표시 UI 생성
    const statusDiv = document.createElement("div");
    statusDiv.id = "find-code-status";
    statusDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #007acc;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      border: 2px solid transparent;
    `;
    statusDiv.textContent = "Find Code Extension Loaded";

    document.body.appendChild(statusDiv);
    this.statusElement = statusDiv;
  }

  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;

      // 활성화 상태에 따라 UI 스타일 변경
      if (message.includes("Active")) {
        this.statusElement.style.background = "#28a745";
        this.statusElement.style.borderColor = "#20c997";
        this.statusElement.style.transform = "scale(1.05)";
        this.statusElement.style.boxShadow =
          "0 4px 16px rgba(40, 167, 69, 0.4)";
      } else if (message.includes("Inactive")) {
        this.statusElement.style.background = "#007acc";
        this.statusElement.style.borderColor = "transparent";
        this.statusElement.style.transform = "scale(1)";
        this.statusElement.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      } else if (message.includes("Error")) {
        this.statusElement.style.background = "#dc3545";
        this.statusElement.style.borderColor = "#c82333";
        this.statusElement.style.transform = "scale(1.05)";
        this.statusElement.style.boxShadow =
          "0 4px 16px rgba(220, 53, 69, 0.4)";
      }
    }
  }
}

// 익스텐션 초기화
const elementFinder = new ElementFinder();

// 페이지 언로드 시 정리
window.addEventListener("beforeunload", () => {
  if (elementFinder.ws) {
    elementFinder.ws.close();
  }
});

// content script 로드 완료 신호 전송
console.log("Find Code Extension: Content script loaded successfully");
document.dispatchEvent(
  new CustomEvent("findCodeLoaded", {
    detail: { status: "loaded", timestamp: Date.now() },
  })
);

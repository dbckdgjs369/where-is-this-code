const vscode = require("vscode");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const sourceMap = require("source-map");

class FindCodeExtension {
  constructor() {
    this.wsServer = null;
    this.port = 3000;
    this.isServerRunning = false;
    this.statusBarItem = null;
    this.connections = new Set();
    this.sourceMapFinder = new SourceMapFinder();
  }

  activate(context) {
    console.log("Find Code extension is now active!");

    // 상태바 아이템 생성
    this.createStatusBarItem();

    // 명령어 등록
    const startServerCommand = vscode.commands.registerCommand(
      "find-code.startServer",
      () => {
        this.startServer();
      }
    );

    const stopServerCommand = vscode.commands.registerCommand(
      "find-code.stopServer",
      () => {
        this.stopServer();
      }
    );

    const showStatusCommand = vscode.commands.registerCommand(
      "find-code.showStatus",
      () => {
        this.showStatus();
      }
    );

    context.subscriptions.push(
      startServerCommand,
      stopServerCommand,
      showStatusCommand
    );

    // Source Map Finder 초기화
    this.initializeSourceMaps();

    // 자동으로 서버 시작
    this.startServer();
  }

  deactivate() {
    this.stopServer();
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }
    if (this.sourceMapFinder) {
      this.sourceMapFinder.dispose();
    }
  }

  async initializeSourceMaps() {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        await this.sourceMapFinder.initialize(workspaceRoot);
        console.log("Source Map Finder initialized");
      }
    } catch (error) {
      console.error("Error initializing Source Map Finder:", error);
    }
  }

  createStatusBarItem() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "find-code.showStatus";
    this.statusBarItem.show();
    this.updateStatusBar();
  }

  updateStatusBar() {
    if (this.isServerRunning) {
      this.statusBarItem.text = "$(search) Find Code $(check)";
      this.statusBarItem.tooltip =
        "Find Code Server Running (Click for status)";
    } else {
      this.statusBarItem.text = "$(search) Find Code $(x)";
      this.statusBarItem.tooltip =
        "Find Code Server Stopped (Click for status)";
    }
  }

  async startServer() {
    if (this.isServerRunning) {
      vscode.window.showInformationMessage(
        "Find Code server is already running."
      );
      return;
    }

    try {
      // WebSocket 서버 생성
      this.wsServer = new WebSocket.Server({ port: this.port });

      this.wsServer.on("connection", (ws) => {
        console.log("New WebSocket connection established");
        this.connections.add(ws);

        ws.on("message", (data) => {
          this.handleMessage(ws, data);
        });

        ws.on("close", () => {
          console.log("WebSocket connection closed");
          this.connections.delete(ws);
        });

        ws.on("error", (error) => {
          console.error("WebSocket error:", error);
          this.connections.delete(ws);
        });

        // 연결 확인 메시지 전송
        ws.send(
          JSON.stringify({
            type: "CONNECTION_ESTABLISHED",
            message: "Connected to VSCode Find Code extension",
          })
        );
      });

      this.wsServer.on("listening", () => {
        this.isServerRunning = true;
        this.updateStatusBar();
        console.log(`Find Code WebSocket server started on port ${this.port}`);
        vscode.window.showInformationMessage(
          `Find Code server started on port ${this.port}`
        );
      });

      this.wsServer.on("error", (error) => {
        console.error("WebSocket server error:", error);
        vscode.window.showErrorMessage(
          `Failed to start Find Code server: ${error.message}`
        );
        this.isServerRunning = false;
        this.updateStatusBar();
      });
    } catch (error) {
      console.error("Error starting server:", error);
      vscode.window.showErrorMessage(
        `Failed to start Find Code server: ${error.message}`
      );
    }
  }

  stopServer() {
    if (!this.isServerRunning) {
      vscode.window.showInformationMessage("Find Code server is not running.");
      return;
    }

    try {
      // 모든 연결 종료
      this.connections.forEach((ws) => {
        ws.close();
      });
      this.connections.clear();

      // 서버 종료
      if (this.wsServer) {
        this.wsServer.close();
        this.wsServer = null;
      }

      this.isServerRunning = false;
      this.updateStatusBar();
      console.log("Find Code WebSocket server stopped");
      vscode.window.showInformationMessage("Find Code server stopped");
    } catch (error) {
      console.error("Error stopping server:", error);
      vscode.window.showErrorMessage(
        `Failed to stop Find Code server: ${error.message}`
      );
    }
  }

  async handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      console.log("Received message:", message);

      if (message.type === "FIND_ELEMENT") {
        await this.handleFindElement(message.data);
      } else if (message.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
      }
    } catch (error) {
      console.error("Error handling message:", error);
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "Failed to process message",
          error: error.message,
        })
      );
    }
  }

  async handleFindElement(elementInfo) {
    try {
      console.log("Processing element info:", elementInfo);

      // 1. Source Map을 사용하여 정확한 위치 찾기 시도
      let sourceMapResult = null;
      if (this.sourceMapFinder) {
        sourceMapResult = await this.sourceMapFinder.findOriginalPosition(
          elementInfo
        );
        if (sourceMapResult) {
          console.log("Source Map result:", sourceMapResult);
        }
      }

      let filePath = null;
      let position = null;
      let accuracy = "fallback";

      if (sourceMapResult && sourceMapResult.source) {
        // Source Map으로 찾은 경우
        filePath = this.sourceMapFinder.resolveSourcePath(
          sourceMapResult.source
        );
        if (filePath && fs.existsSync(filePath)) {
          accuracy = "source-map";
          position = new vscode.Position(
            sourceMapResult.line - 1, // VSCode는 0-based
            sourceMapResult.column - 1
          );
        }
      }

      // 2. Source Map으로 찾지 못한 경우 기존 방식 사용
      if (!filePath) {
        filePath = await this.findFileInWorkspace(elementInfo);
        if (filePath) {
          const document = await vscode.workspace.openTextDocument(filePath);
          position = await this.findElementPosition(document, elementInfo);
        }
      }

      if (filePath) {
        // 파일 열기
        const document = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(document);

        if (position) {
          // 커서를 해당 위치로 이동
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(new vscode.Range(position, position));

          // 정확도에 따른 메시지 표시
          if (accuracy === "source-map") {
            vscode.window.showInformationMessage(
              `🎯 Found element via Source Map in ${path.basename(
                filePath
              )} at line ${position.line + 1} (95% accuracy)`
            );
          } else {
            vscode.window.showInformationMessage(
              `🔍 Found element via fallback in ${path.basename(
                filePath
              )} at line ${position.line + 1} (70-80% accuracy)`
            );
          }
        } else {
          vscode.window.showWarningMessage(
            `File opened but couldn't locate exact element position in ${path.basename(
              filePath
            )}`
          );
        }
      } else {
        vscode.window.showWarningMessage(
          "Could not find matching file in workspace"
        );
      }
    } catch (error) {
      console.error("Error handling find element:", error);
      vscode.window.showErrorMessage(`Error finding element: ${error.message}`);
    }
  }

  async findFileInWorkspace(elementInfo) {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        return null;
      }

      // 워크스페이스에서 HTML, JS, TS, JSX, TSX 파일 찾기
      const pattern = "**/*.{html,js,ts,jsx,tsx,vue}";
      const files = await vscode.workspace.findFiles(pattern);

      // 요소 정보를 기반으로 가장 적합한 파일 찾기
      let bestMatch = null;
      let bestScore = 0;

      for (const file of files) {
        const score = this.calculateFileMatchScore(file, elementInfo);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = file;
        }
      }

      return bestMatch;
    } catch (error) {
      console.error("Error finding file in workspace:", error);
      return null;
    }
  }

  calculateFileMatchScore(file, elementInfo) {
    let score = 0;
    const fileName = path.basename(file.fsPath).toLowerCase();
    const fileContent = fs.readFileSync(file.fsPath, "utf8");

    // 태그명 매칭
    if (fileContent.includes(`<${elementInfo.tagName}`)) {
      score += 10;
    }

    // 클래스명 매칭
    if (elementInfo.className && fileContent.includes(elementInfo.className)) {
      score += 8;
    }

    // ID 매칭
    if (elementInfo.id && fileContent.includes(elementInfo.id)) {
      score += 15;
    }

    // 텍스트 내용 매칭
    if (
      elementInfo.textContent &&
      fileContent.includes(elementInfo.textContent.trim())
    ) {
      score += 5;
    }

    // 파일 확장자별 가중치
    if (fileName.endsWith(".html")) {
      score += 3;
    } else if (fileName.endsWith(".jsx") || fileName.endsWith(".tsx")) {
      score += 2;
    }

    return score;
  }

  async findElementPosition(document, elementInfo) {
    try {
      const text = document.getText();
      const lines = text.split("\n");

      // 요소의 위치를 찾기 위한 여러 전략 시도
      let position = null;

      // 1. ID로 찾기
      if (elementInfo.id) {
        position = this.findPositionById(lines, elementInfo.id);
      }

      // 2. 클래스명으로 찾기
      if (!position && elementInfo.className) {
        position = this.findPositionByClass(lines, elementInfo.className);
      }

      // 3. 태그명과 텍스트로 찾기
      if (!position && elementInfo.tagName && elementInfo.textContent) {
        position = this.findPositionByTagAndText(
          lines,
          elementInfo.tagName,
          elementInfo.textContent
        );
      }

      // 4. 태그명만으로 찾기
      if (!position && elementInfo.tagName) {
        position = this.findPositionByTag(lines, elementInfo.tagName);
      }

      return position;
    } catch (error) {
      console.error("Error finding element position:", error);
      return null;
    }
  }

  findPositionById(lines, id) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`id="${id}"`) || lines[i].includes(`id='${id}'`)) {
        return new vscode.Position(i, lines[i].indexOf(`id="${id}"`));
      }
    }
    return null;
  }

  findPositionByClass(lines, className) {
    const classNames = className.split(" ");
    for (let i = 0; i < lines.length; i++) {
      for (const cls of classNames) {
        if (
          (cls && lines[i].includes(`class="${cls}"`)) ||
          lines[i].includes(`class='${cls}'`)
        ) {
          return new vscode.Position(i, lines[i].indexOf(`class="${cls}"`));
        }
      }
    }
    return null;
  }

  findPositionByTagAndText(lines, tagName, textContent) {
    const searchText = textContent.trim().substring(0, 50);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`<${tagName}`) && lines[i].includes(searchText)) {
        return new vscode.Position(i, lines[i].indexOf(`<${tagName}`));
      }
    }
    return null;
  }

  findPositionByTag(lines, tagName) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`<${tagName}`)) {
        return new vscode.Position(i, lines[i].indexOf(`<${tagName}`));
      }
    }
    return null;
  }

  showStatus() {
    const status = this.isServerRunning ? "Running" : "Stopped";
    const connections = this.connections.size;

    vscode.window
      .showInformationMessage(
        `Find Code Server: ${status}\nPort: ${this.port}\nActive Connections: ${connections}`,
        "Start Server",
        "Stop Server"
      )
      .then((selection) => {
        if (selection === "Start Server") {
          this.startServer();
        } else if (selection === "Stop Server") {
          this.stopServer();
        }
      });
  }
}

// Source Map을 사용하여 정확한 코드 위치를 찾는 클래스
class SourceMapFinder {
  constructor() {
    this.sourceMaps = new Map();
    this.consumers = new Map();
    this.workspaceRoot = null;
  }

  async initialize(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    await this.detectSourceMaps();
  }

  async detectSourceMaps() {
    try {
      // 워크스페이스에서 .map 파일들 찾기
      const mapFiles = await vscode.workspace.findFiles("**/*.map");
      console.log(`Found ${mapFiles.length} source map files`);

      for (const mapFile of mapFiles) {
        await this.loadSourceMap(mapFile);
      }
    } catch (error) {
      console.error("Error detecting source maps:", error);
    }
  }

  async loadSourceMap(mapFile) {
    try {
      const content = fs.readFileSync(mapFile.fsPath, "utf8");
      const consumer = await new sourceMap.SourceMapConsumer(content);
      this.consumers.set(mapFile.fsPath, consumer);

      console.log(`Source Map loaded: ${path.basename(mapFile.fsPath)}`);
    } catch (error) {
      console.error(`Failed to load Source Map: ${mapFile.fsPath}`, error);
    }
  }

  async findOriginalPosition(elementInfo) {
    // Source Map을 사용하여 원본 위치 찾기
    for (const [mapPath, consumer] of this.consumers) {
      try {
        // 브라우저에서 수집한 위치 정보를 기반으로 원본 위치 찾기
        const original = await this.findPositionInSourceMap(
          consumer,
          elementInfo
        );

        if (original && original.source && original.line) {
          return {
            source: original.source,
            line: original.line,
            column: original.column,
            name: original.name,
            sourceMap: mapPath,
            accuracy: "source-map",
          };
        }
      } catch (error) {
        console.error("Source Map 변환 오류:", error);
      }
    }

    return null;
  }

  async findPositionInSourceMap(consumer, elementInfo) {
    try {
      // 여러 방법으로 위치 찾기 시도
      const positions = [
        // 1. 파일명과 라인 번호로 찾기
        {
          source: elementInfo.sourceFile,
          line: elementInfo.line,
          column: elementInfo.column,
        },
        // 2. 파일명만으로 찾기
        { source: elementInfo.sourceFile, line: 1, column: 1 },
        // 3. 모든 소스 파일에서 찾기
        ...consumer.sources.map((source) => ({ source, line: 1, column: 1 })),
      ];

      for (const pos of positions) {
        if (pos.source) {
          const original = consumer.originalPositionFor(pos);
          if (original.source && original.line) {
            return original;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding position in source map:", error);
      return null;
    }
  }

  resolveSourcePath(sourcePath) {
    if (!this.workspaceRoot) return null;

    // Source Map의 상대 경로를 절대 경로로 변환
    const absolutePath = path.resolve(this.workspaceRoot, sourcePath);

    // 워크스페이스 내에 있는지 확인
    if (absolutePath.startsWith(this.workspaceRoot)) {
      return absolutePath;
    }

    return null;
  }

  dispose() {
    // Source Map consumers 정리
    for (const consumer of this.consumers.values()) {
      consumer.destroy();
    }
    this.consumers.clear();
    this.sourceMaps.clear();
  }
}

// 익스텐션 활성화
function activate(context) {
  return new FindCodeExtension().activate(context);
}

// 익스텐션 비활성화
function deactivate() {
  // FindCodeExtension 인스턴스 정리
}

module.exports = {
  activate,
  deactivate,
};

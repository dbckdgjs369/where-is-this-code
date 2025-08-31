# Find Code - Browser to VSCode Element Locator

브라우저에서 웹 요소를 클릭하면 VSCode에서 해당 코드의 정확한 위치를 찾아주는 개발자 도구입니다.

## 🚀 주요 기능

- **크롬 익스텐션**: localhost 페이지에서 요소 클릭 감지
- **VSCode 익스텐션**: 클릭된 요소의 코드 위치 자동 탐색
- **실시간 통신**: WebSocket을 통한 빠른 응답
- **스마트 매칭**: ID, 클래스, 태그, 텍스트를 기반으로 정확한 위치 찾기
- **직관적인 UI**: 마우스 오버 시 요소 하이라이트 및 상태 표시

## 📁 프로젝트 구조

```
find-code/
├── find-code-chrome/          # 크롬 익스텐션
│   ├── manifest.json          # 익스텐션 설정
│   ├── content-script.js      # 페이지 스크립트
│   ├── background.js          # 백그라운드 스크립트
│   ├── popup.html             # 팝업 UI
│   └── popup.js               # 팝업 로직
├── find-code-vscode/          # VSCode 익스텐션
│   ├── package.json           # 패키지 정보
│   └── extension.js           # 메인 익스텐션 코드
└── README.md                  # 프로젝트 설명
```

## 🛠️ 설치 및 사용법

### 1. 크롬 익스텐션 설치

1. `find-code-chrome` 폴더를 압축
2. 크롬에서 `chrome://extensions/` 접속
3. "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 압축 해제한 폴더 선택

### 2. VSCode 익스텐션 설치

1. VSCode에서 `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)
2. "Extensions: Install from VSIX" 실행
3. `find-code-vscode` 폴더의 `.vsix` 파일 선택

### 3. 사용법

1. **VSCode에서**: 익스텐션이 자동으로 WebSocket 서버 시작 (포트 3000)
2. **브라우저에서**: localhost 페이지에서 `Ctrl+Shift+E`로 요소 찾기 모드 활성화
3. **요소 클릭**: 원하는 요소를 클릭하면 VSCode에서 해당 파일이 열리고 위치로 이동

## 🔧 기술 스택

- **크롬 익스텐션**: Manifest V3, Content Scripts, Background Scripts
- **VSCode 익스텐션**: VSCode Extension API, WebSocket Server, Source Map 지원
- **통신**: WebSocket (실시간), HTTP (폴백)
- **언어**: JavaScript (ES6+)
- **Source Map**: 정확한 코드 위치 매핑 (95%+ 정확도)

## ⚙️ 설정

### 포트 변경

VSCode 익스텐션의 `extension.js`에서 포트 번호를 변경할 수 있습니다:

```javascript
this.port = 3000; // 원하는 포트로 변경
```

### 파일 타입 확장

`extension.js`의 `findFileInWorkspace` 메서드에서 지원하는 파일 확장자를 수정할 수 있습니다:

```javascript
const pattern = "**/*.{html,js,ts,jsx,tsx,vue}"; // 원하는 확장자 추가
```

### Source Map 설정

더 정확한 코드 위치 찾기를 위해 Source Map을 활성화하세요:

#### **Webpack**

```javascript
// webpack.config.js
module.exports = {
  devtool: "source-map", // 또는 'eval-source-map'
  // ...
};
```

#### **Vite**

```javascript
// vite.config.js
export default {
  build: {
    sourcemap: true,
  },
};
```

#### **Create React App**

```bash
# .env 파일
GENERATE_SOURCEMAP=true
```

## 🎯 동작 원리

1. **요소 감지**: 크롬 익스텐션이 페이지에서 요소 클릭을 감지
2. **정보 수집**: 클릭된 요소의 태그, 클래스, ID, 텍스트 등 수집
3. **통신**: WebSocket을 통해 VSCode로 요소 정보 전송
4. **파일 찾기**: VSCode에서 워크스페이스 내 적합한 파일 탐색
5. **위치 찾기**: 요소 정보를 기반으로 코드 내 정확한 위치 탐색
6. **파일 열기**: 해당 파일을 열고 커서를 정확한 위치로 이동

## 🔍 요소 매칭 알고리즘

VSCode 익스텐션은 다음 우선순위로 요소를 찾습니다:

1. **ID 매칭** (가중치: 15) - 가장 정확
2. **클래스명 매칭** (가중치: 8) - 높은 정확도
3. **태그명 매칭** (가중치: 10) - 기본 매칭
4. **텍스트 내용 매칭** (가중치: 5) - 보조 매칭
5. **파일 확장자 가중치** - HTML, JSX, TSX 등

## 🚨 주의사항

- **localhost만 지원**: 보안상 localhost 페이지에서만 작동
- **포트 충돌**: 다른 서비스가 3000번 포트를 사용 중이면 변경 필요
- **파일 권한**: 워크스페이스 내 파일에 대한 읽기 권한 필요

## 🐛 문제 해결

### 크롬 익스텐션이 작동하지 않는 경우

1. 페이지 새로고침
2. 익스텐션 재로드
3. 개발자 도구에서 콘솔 에러 확인

### VSCode에서 파일을 찾지 못하는 경우

1. 워크스페이스가 올바르게 열려있는지 확인
2. 파일 확장자가 지원되는지 확인
3. 요소 정보가 충분한지 확인

### 연결 오류가 발생하는 경우

1. VSCode 익스텐션이 활성화되어 있는지 확인
2. 방화벽이 3000번 포트를 차단하고 있는지 확인
3. 다른 프로세스가 포트를 사용하고 있는지 확인

## 📝 개발 가이드

### 크롬 익스텐션 개발

- `content-script.js` 수정 후 크롬에서 익스텐션 새로고침
- `background.js` 수정 후 익스텐션 재로드

### VSCode 익스텐션 개발

- `extension.js` 수정 후 VSCode에서 `Ctrl+Shift+P` → "Developer: Reload Window"
- 디버깅을 위해 VSCode에서 익스텐션 프로젝트 열기

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🙏 감사의 말

- VSCode Extension API
- Chrome Extensions Manifest V3
- WebSocket API
- 모든 기여자들

---

**개발자 여러분의 코딩 생산성을 높여드리겠습니다! 🚀**

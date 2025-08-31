# Find Code - VSCode Extension

브라우저에서 클릭한 웹 요소의 코드 위치를 VSCode에서 자동으로 찾아주는 익스텐션입니다.

## 🚀 기능

- **WebSocket 서버**: 크롬 익스텐션과의 실시간 통신
- **스마트 파일 찾기**: 요소 정보를 기반으로 적합한 파일 자동 탐색
- **정확한 위치 찾기**: ID, 클래스, 태그, 텍스트를 활용한 위치 매칭
- **자동 파일 열기**: 찾은 파일을 자동으로 열고 커서 이동
- **상태 표시**: 서버 상태를 상태바에서 실시간 확인

## 📦 설치

### 방법 1: VSIX 파일로 설치

1. 릴리즈 페이지에서 `.vsix` 파일 다운로드
2. VSCode에서 `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)
3. "Extensions: Install from VSIX" 실행
4. 다운로드한 `.vsix` 파일 선택

### 방법 2: 개발자 모드로 설치

1. 이 저장소를 클론
2. `find-code-vscode` 폴더에서 `npm install` 실행
3. VSCode에서 `find-code-vscode` 폴더 열기
4. `F5`를 눌러 디버그 모드로 실행

## ⚙️ 사용법

### 자동 시작

익스텐션이 활성화되면 자동으로 WebSocket 서버가 시작됩니다 (포트 3000).

### 수동 제어

- `Ctrl+Shift+P` → "Find Code: Start Server" - 서버 시작
- `Ctrl+Shift+P` → "Find Code: Stop Server" - 서버 중지
- `Ctrl+Shift+P` → "Find Code: Show Status" - 상태 확인

### 상태바

VSCode 하단 상태바에서 서버 상태를 확인할 수 있습니다:

- 🟢 `$(search) Find Code $(check)` - 서버 실행 중
- 🔴 `$(search) Find Code $(x)` - 서버 중지됨

## 🔧 설정

### 포트 변경

`extension.js`에서 포트 번호를 수정할 수 있습니다:

```javascript
this.port = 3000; // 원하는 포트로 변경
```

### 지원 파일 확장자

기본적으로 다음 파일 타입을 지원합니다:

- HTML (`.html`)
- JavaScript (`.js`)
- TypeScript (`.ts`)
- React JSX (`.jsx`)
- React TSX (`.tsx`)
- Vue (`.vue`)

`extension.js`의 `findFileInWorkspace` 메서드에서 패턴을 수정할 수 있습니다.

## 🎯 동작 원리

1. **서버 시작**: VSCode 익스텐션 활성화 시 WebSocket 서버 시작
2. **연결 대기**: 크롬 익스텐션의 연결을 대기
3. **요소 정보 수신**: 브라우저에서 클릭된 요소의 정보를 WebSocket으로 수신
4. **파일 탐색**: 워크스페이스에서 요소와 매칭되는 파일 검색
5. **위치 찾기**: 파일 내에서 요소의 정확한 위치 탐색
6. **파일 열기**: 해당 파일을 열고 커서를 정확한 위치로 이동

## 🔍 요소 매칭 알고리즘

### 파일 매칭 점수 시스템

- **ID 매칭**: 15점 (가장 정확)
- **클래스명 매칭**: 8점
- **태그명 매칭**: 10점
- **텍스트 내용 매칭**: 5점
- **파일 확장자 가중치**: HTML +3, JSX/TSX +2

### 위치 찾기 전략

1. ID 속성으로 정확한 위치 찾기
2. 클래스명으로 위치 찾기
3. 태그명과 텍스트 조합으로 위치 찾기
4. 태그명만으로 위치 찾기

## 🐛 문제 해결

### 서버 시작 실패

- 포트 3000이 다른 프로세스에 의해 사용 중인지 확인
- 방화벽 설정 확인
- VSCode를 관리자 권한으로 실행

### 파일을 찾지 못하는 경우

- 워크스페이스가 올바르게 열려있는지 확인
- 파일 확장자가 지원되는지 확인
- 요소에 충분한 식별 정보가 있는지 확인

### 연결 오류

- 크롬 익스텐션이 올바르게 설치되어 있는지 확인
- localhost 페이지에서 테스트하고 있는지 확인
- 브라우저 콘솔에서 에러 메시지 확인

## 🔧 개발

### 로컬 개발 환경 설정

```bash
git clone <repository-url>
cd find-code-vscode
npm install
```

### 디버깅

1. VSCode에서 `find-code-vscode` 폴더 열기
2. `F5`를 눌러 디버그 모드로 실행
3. 새 VSCode 창에서 익스텐션 테스트

### 빌드

```bash
npm run package
```

## 📝 로그

익스텐션의 동작을 추적하려면 VSCode의 출력 패널을 확인하세요:

1. `Ctrl+Shift+P` → "Developer: Toggle Developer Tools"
2. Console 탭에서 로그 메시지 확인

## 🤝 기여하기

버그 리포트, 기능 제안, 코드 기여를 환영합니다!

1. Issue 생성
2. Fork 후 Pull Request
3. 코드 리뷰 및 병합

## 📄 라이선스

MIT License

---

**개발자 여러분의 생산성을 높여드리겠습니다! 🚀**

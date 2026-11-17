# 놀다가 팀 문서 허브

축제 플랫폼을 개발하는 팀이 기획 문서, WBS, 결정 사항, 일정과 공유 산출물을 확인하는 공개 웹사이트입니다.

- 공개 사이트: https://festival-team-hub.workspace-594920.chatgpt.site
- 팀 대시보드: 사이트 상단의 `팀 대시보드` 버튼에서 이동
- GitHub 기준 문서: `site/docs/`
- 사이트 전용 팀 문서: 배포 환경의 R2 저장소에 보관

## 구조

- `site/`: 화면, 스타일, 브라우저 동작과 기본 문서
- `worker/`: 문서 목록·업로드·열람 API
- `scripts/`: 배포용 Worker 빌드와 산출물 검증
- `.openai/hosting.json`: ChatGPT Sites 프로젝트 및 저장소 바인딩

## 빌드

```bash
npm run build
```

빌드 결과는 `dist/server/index.js`에 생성됩니다. 팀 업로드 코드는 Sites 런타임 비밀값 `TEAM_UPLOAD_CODE`로 관리하며 저장소에 넣지 않습니다.

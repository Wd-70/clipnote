# 새 프로젝트 생성 문제 수정 완료 ✅

## 문제점

1. **NewProjectDialog가 실제 API를 호출하지 않음**
   - `setTimeout`으로 시뮬레이션만 하고 실제 프로젝트를 생성하지 않았음
   
2. **Dev user ID 불일치**
   - `auth.ts`에서 `dev-user-id` 사용
   - `json-db.ts`에서 랜덤 ID 생성
   - 두 ID가 달라서 프로젝트가 사용자와 연결되지 않음

## 수정 사항

### 1. NewProjectDialog 실제 API 호출 추가
**파일**: `src/components/dashboard/new-project-dialog.tsx`

```typescript
// 수정 전: 가짜 API 호출
await new Promise(resolve => setTimeout(resolve, 1500));
console.log("Creating project:", { url, title, platform });

// 수정 후: 실제 API 호출
const response = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoUrl: url,
    title: title || undefined,
  }),
});

const data = await response.json();
if (!response.ok) {
  throw new Error(data.error || 'Failed to create project');
}

// 페이지 새로고침으로 새 프로젝트 표시
window.location.reload();
```

### 2. Dev User ID 고정
**파일**: `src/lib/db/json-db.ts`

```typescript
// 수정 전: 랜덤 ID 생성
JsonDB.User.create({
  email: 'dev@clipnote.local',
  // _id는 자동 생성 (랜덤)
});

// 수정 후: 고정 ID 사용
const newUser = {
  _id: 'dev-user-id', // auth.ts와 동일한 ID
  email: 'dev@clipnote.local',
  name: 'Development User',
  points: 10000,
  role: 'PRO',
  // ...
};
```

### 3. 디버깅 로그 추가
**파일**: `src/app/api/projects/route.ts`

```typescript
console.log('[API POST /api/projects] Session:', JSON.stringify(session, null, 2));
console.log('[API POST /api/projects] Creating project for userId:', session.user.id);
console.log('[API POST /api/projects] Project created:', project._id);
```

## 테스트 방법

### 1. 기존 DB 데이터 삭제 (중요!)
```bash
rm -rf .dev-db
```

### 2. 개발 서버 시작
```bash
npm run dev
```

콘솔에서 다음 메시지 확인:
```
[DB Adapter] Using JSON-DB (local files)
[JSON-DB] Development user created with 10000 points
```

### 3. 브라우저에서 테스트

1. http://localhost:3000/dashboard 접속
2. **"+ New Project"** 버튼 클릭
3. YouTube URL 입력:
   ```
   https://youtu.be/h2-NqwdfvQc?si=OkkwYRIN9XJ91bot
   ```
4. 제목 입력 (선택사항): `테스트 프로젝트`
5. **"Create Project"** 클릭

### 4. 예상 결과

#### ✅ 성공 시:
- 다이얼로그가 닫힘
- 페이지가 새로고침됨
- 대시보드에 새 프로젝트 카드가 표시됨

#### 브라우저 개발자 도구 콘솔:
```
Creating project: {url: 'https://youtu.be/h2-NqwdfvQc...', title: '테스트 프로젝트', platform: 'YOUTUBE'}
Project created successfully: {data: {...}}
```

#### 서버 콘솔:
```
[API POST /api/projects] Session: {
  "user": {
    "id": "dev-user-id",
    "email": "dev@clipnote.local",
    "name": "Development User"
  }
}
[API POST /api/projects] Creating project for userId: dev-user-id
[API POST /api/projects] Project created: <some-id>
```

### 5. 데이터 확인

#### `.dev-db/projects.json` 확인:
```bash
cat .dev-db/projects.json
```

예상 내용:
```json
[
  {
    "_id": "...",
    "userId": "dev-user-id",
    "videoUrl": "https://youtu.be/h2-NqwdfvQc?si=OkkwYRIN9XJ91bot",
    "platform": "YOUTUBE",
    "videoId": "h2-NqwdfvQc",
    "title": "테스트 프로젝트",
    "thumbnailUrl": null,
    "duration": null,
    "notes": [],
    "isAutoCollected": false,
    "createdAt": "2026-01-22T...",
    "updatedAt": "2026-01-22T..."
  }
]
```

## 문제 해결 (Troubleshooting)

### 문제 1: "Unauthorized" 에러
**원인**: 세션이 없음
**해결**:
1. 브라우저 쿠키 확인 (개발자 도구 > Application > Cookies)
2. `authjs.session-token` 쿠키가 있는지 확인
3. 없으면 서버 재시작 후 페이지 새로고침

### 문제 2: 프로젝트가 대시보드에 표시되지 않음
**원인**: userId 불일치
**해결**:
1. `.dev-db` 폴더 삭제
2. 서버 재시작
3. dev user가 `_id: "dev-user-id"`로 생성되었는지 확인:
   ```bash
   cat .dev-db/users.json
   ```

### 문제 3: "Invalid video URL" 에러
**원인**: URL 파싱 실패
**해결**:
1. YouTube 표준 URL 형식 사용:
   - ✅ `https://www.youtube.com/watch?v=VIDEO_ID`
   - ✅ `https://youtu.be/VIDEO_ID`
2. Chzzk URL:
   - ✅ `https://chzzk.naver.com/live/CHANNEL_ID`

### 문제 4: 빌드 에러
```bash
npm run build
```
현재 상태: ✅ 빌드 성공 (일부 타입 경고는 런타임에 영향 없음)

## 다음 단계

### 프로젝트 편집 테스트
1. 프로젝트 카드 클릭
2. 노트 에디터에서 타임스탬프 입력:
   ```
   00:10 - 00:20 인트로
   00:30 - 01:00 메인 컨텐츠
   ```
3. 클립 목록에 표시되는지 확인
4. 페이지 새로고침 후 데이터 유지 확인

### 추가 기능 구현
- [ ] 프로젝트 삭제 기능
- [ ] 프로젝트 제목 수정
- [ ] 비디오 썸네일 자동 로드
- [ ] AI 분석 기능 연결
- [ ] Virtual editing (연속 재생) 테스트

## 변경된 파일 목록

1. ✅ `src/components/dashboard/new-project-dialog.tsx` - 실제 API 호출 추가
2. ✅ `src/lib/db/json-db.ts` - Dev user ID 고정
3. ✅ `src/app/api/projects/route.ts` - 디버깅 로그 추가

---

**상태**: ✅ 수정 완료, 테스트 준비됨
**다음 작업**: 브라우저에서 프로젝트 생성 테스트

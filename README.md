# 코스터디 수학학원 학생관리 앱

## 🚀 시작하기 (처음 세팅)

### 1. Supabase 프로젝트 만들기

1. [https://supabase.com](https://supabase.com) 접속 → 회원가입 → New Project
2. 프로젝트 이름: `costudymath` (원하는 이름)
3. 프로젝트 생성 후 **SQL Editor** 탭으로 이동
4. `supabase/schema.sql` 파일 내용을 복사해서 실행 (Run)
5. **Project Settings > API** 에서 아래 두 값 복사:
   - `Project URL`
   - `anon public key`

### 2. 선생님 계정 만들기

Supabase 대시보드 → **Authentication > Users** → **Add User**
- 이메일과 비밀번호 입력

계정 생성 후 **SQL Editor**에서 실행:
```sql
INSERT INTO teachers (id, name)
VALUES ('여기에_방금_만든_user_id', '선생님 이름');
```
(user id는 Authentication > Users에서 확인)

### 3. 로컬 개발 환경

```bash
# 패키지 설치
npm install

# 환경변수 파일 생성
cp .env.local.example .env.local
```

`.env.local` 파일 열어서 Supabase 값 채우기:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

```bash
# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 📦 GitHub + Vercel 배포

### GitHub 올리기

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/본인아이디/costudymath.git
git push -u origin main
```

### Vercel 배포

1. [https://vercel.com](https://vercel.com) → GitHub 계정으로 로그인
2. **Add New Project** → GitHub 저장소 선택
3. **Environment Variables** 탭에서 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
4. **Deploy** 클릭

배포 완료 후 Vercel이 URL 제공 (예: `costudymath.vercel.app`)

---

## 📱 사용 방법

### 기본 세팅 순서
1. **반 관리** → 반 추가 (이름, 과목, 일정, 교재, 진도 입력)
2. **학생 관리** → 학생 추가 (이름, 학부모 연락처, 수강 반 배정)
3. **반 관리** → 반 클릭 → 수업 기록 추가

### 수업 기록
- 날짜 선택 → 테스트 총 문항 입력 (없으면 비워둠)
- 학생별로 펼쳐서: 출결 / 태도 / 과제 / 테스트 점수 / 특이사항 입력
- 저장하면 반 평균 자동 계산

### 월말 문자
- **월말 문자** 탭 → 월 선택 → 반 → 학생 선택
- **문구 자동 생성** 클릭 → AI가 한 달치 기록 분석해서 문구 생성
- 수정 후 복사 → 카카오톡에 붙여넣기
- 학부모 답장/피드백을 기록 저장

---

## 🛠 기술 스택
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Pretendard 폰트
- **Database**: Supabase (PostgreSQL)
- **AI 문구 생성**: Claude API (claude-sonnet-4)
- **배포**: Vercel

## 📁 주요 파일 구조
```
src/
├── app/
│   ├── auth/login/         # 로그인 페이지
│   └── (app)/
│       ├── dashboard/      # 대시보드
│       ├── classes/        # 반 관리 + 수업 기록
│       ├── students/       # 학생 관리
│       └── messages/       # 월말 문자 생성
├── components/
│   ├── layout/Sidebar.tsx  # 사이드바 네비게이션
│   └── forms/LessonForm.tsx # 수업 기록 폼 (핵심)
└── lib/
    ├── supabase.ts         # Supabase 클라이언트
    └── constants.ts        # 태도/과제 항목 정의
```

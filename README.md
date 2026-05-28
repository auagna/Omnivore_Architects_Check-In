# 잡식건축가 출석 체크인

잡식건축가 연사 강연 참석자가 QR로 접속해 체크인하고, 관리자가 이벤트와 출석 명단을 운영하는 Next.js 웹앱입니다.

## 주요 기능

- 참석자 체크인: 이름, 휴대폰 뒷번호 4자리, 멤버/게스트 타입, 선택 메모
- 관리자 PIN 로그인
- 이벤트 추가, 편집, 삭제
- 이벤트별 QR 배포 링크 및 QR 이미지
- 참가자 출석 명단 확인, 검색, 타입 필터
- 엑셀 내보내기
- 개별 출석 삭제 및 전체 초기화
- 관리자 PIN 변경
- 전체 UI 한글 지원

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

- 체크인: `http://localhost:3000`
- 관리자: `http://localhost:3000/admin`

## 환경변수

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PIN=6040
EVENT_CAPACITY=60
```

`ADMIN_PIN`이 없으면 기본값은 `1030`입니다. 앱에서 PIN 변경을 사용하면 Supabase `admin_settings` 테이블의 값이 우선됩니다.

## Supabase 설정

Supabase SQL Editor에서 `supabase/schema.sql`을 실행하세요. 서버 API route가 service role key로만 DB에 접근하므로 service role key를 `NEXT_PUBLIC_*` 환경변수에 넣지 마세요.

## 배포

Vercel에서 GitHub 저장소를 연결하고 위 환경변수를 추가한 뒤 배포합니다. 관리자 화면에서 이벤트를 만든 후 QR 배포 링크를 복사하거나 QR 이미지를 사용하면 됩니다.

# TRPG_TEAM 이미지 관리자 설치

## GitHub에 올릴 파일

저장소 루트에 다음 파일과 폴더를 추가합니다.

```text
admin.html
assets/css/admin.css
assets/js/admin.js
```

업로드 후 관리자 주소는 다음과 같습니다.

```text
https://ttory-kor.github.io/TRPG_TEAM/admin.html
```

관리자 페이지는 검색엔진 비노출 설정만 되어 있습니다. 실제 보안은 Cloudflare Worker의 비밀번호 검증이 담당합니다.

## 1. GitHub 토큰 만들기

GitHub에서 Fine-grained personal access token을 생성합니다.

- Repository access: `Only select repositories`
- Repository: `TRPG_TEAM`
- Repository permissions → Contents: `Read and write`
- 가능한 짧은 만료기간 설정 권장

토큰 문자열은 GitHub Pages 파일이나 `admin.js`에 절대 넣지 않습니다.

## 2. Cloudflare Worker 만들기

1. Cloudflare Dashboard → Workers & Pages → Create
2. Worker를 만든 뒤 `cloudflare-worker/worker.js` 내용을 붙여넣고 배포
3. Worker Settings → Variables and Secrets에서 아래 항목 설정

일반 변수:

```text
GITHUB_OWNER = TTORY-kor
GITHUB_REPO = TRPG_TEAM
GITHUB_BRANCH = main
ALLOWED_ORIGIN = https://ttory-kor.github.io
```

암호화된 Secret:

```text
GITHUB_TOKEN = 위에서 만든 GitHub 토큰
ADMIN_PASSWORD = 관리자 페이지에서 사용할 긴 비밀번호
```

`GITHUB_TOKEN`과 `ADMIN_PASSWORD`는 반드시 Secret으로 설정합니다.

## 3. 관리자 페이지 연결

Worker 배포 후 받은 주소를 관리자 페이지의 `Worker 주소` 칸에 입력합니다.

예시:

```text
https://trpg-team-admin.계정명.workers.dev
```

관리자 비밀번호를 입력하고 이미지 위치와 파일을 선택한 뒤 업로드합니다.

## 이미지 교체 방식

관리자 페이지에서 지정한 파일명으로 `assets/images`에 생성 또는 덮어쓰기 됩니다.

```text
office.jpg       헤더 배너
icon.jpg         프로필
main.png         메인 이미지
Ho1.png          HO1 배너
Ho1Standing.png  HO1 스탠딩
gallery1.jpg     갤러리 첫 번째 칸
```

확장자가 HTML의 경로와 일치해야 합니다. 예를 들어 HTML이 `main.png`를 읽는다면 관리자에서도 `main.png`로 저장해야 합니다.

## 반영 시간

업로드는 GitHub 커밋을 생성합니다. 이후 GitHub Pages가 다시 배포되고 브라우저 캐시가 갱신될 때까지 수십 초가 걸릴 수 있습니다. 같은 파일명으로 교체했는데 이전 이미지가 보이면 강력 새로고침을 사용합니다.

## 보안 메모

- 관리자 페이지 주소를 숨기는 것만으로는 보안이 되지 않습니다.
- GitHub 토큰을 HTML/JavaScript에 직접 넣지 않습니다.
- 토큰은 `TRPG_TEAM` 저장소만 접근하도록 제한합니다.
- 비밀번호와 토큰은 주기적으로 교체합니다.

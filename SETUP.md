# TRPG_TEAM v2 설치

## 1. GitHub에 업로드
이 ZIP의 내용물을 저장소 최상단에 그대로 덮어 올립니다.

필수 구조:
- index.html
- admin.html
- assets/css
- assets/js
- assets/data
- assets/images

## 2. 이미지 넣기
`assets/images/` 안에 다음 파일을 넣습니다.

- office.jpg
- icon.jpg
- main.png
- Ho1.png
- Ho1Standing.png
- gallery1.jpg 등

없는 이미지는 사이트에서 깨진 이미지로 보입니다.

## 3. GitHub Fine-grained token
GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens에서 생성합니다.

- Repository access: TRPG_TEAM만 선택
- Repository permissions → Contents: Read and write

토큰은 절대 admin.html 또는 JavaScript에 넣지 않습니다.

## 4. Cloudflare Worker
Cloudflare Workers & Pages에서 새 Worker를 만든 뒤 `cloudflare-worker/worker.js` 내용을 붙여넣습니다.

Variables and Secrets에 다음을 등록합니다.

- `GITHUB_TOKEN`: GitHub 토큰 (Secret)
- `ADMIN_PASSWORD`: 관리자 비밀번호 (Secret)
- `GITHUB_OWNER`: TTORY-kor
- `GITHUB_REPO`: TRPG_TEAM
- `GITHUB_BRANCH`: main

배포 후 생성된 `https://...workers.dev` 주소를 복사합니다.

## 5. 관리자 접속

`https://ttory-kor.github.io/TRPG_TEAM/admin.html`

1. Worker 주소 입력
2. 관리자 비밀번호 입력
3. 저장소 데이터 불러오기
4. 수정
5. 변경사항 게시

## 참고
GitHub Pages 재배포까지 보통 수십 초가 걸립니다. 이미지가 바로 안 바뀌면 강력 새로고침(Ctrl+F5)을 하세요.

[Uploading NETLIFY_SETUP.md…]()
# Netlify 설정 순서

## 1. GitHub에 파일 올리기

이 폴더의 파일을 `TRPG_TEAM` 저장소 최상단에 덮어 올립니다.

## 2. Netlify에서 GitHub 저장소 연결

1. Netlify 로그인
2. `Add new project` → `Import an existing project`
3. GitHub 선택
4. `TTORY-kor/TRPG_TEAM` 선택
5. Build command는 비워두기
6. Publish directory는 `.` 입력
7. Deploy

## 3. 관리자 로그인 기능 켜기

Netlify 프로젝트에서:

1. `Project configuration`
2. `Identity`
3. `Enable Identity`
4. Registration을 `Invite only`로 설정

## 4. Git Gateway 켜기

같은 Identity 설정에서:

1. `Services`
2. `Git Gateway`
3. `Enable Git Gateway`

## 5. 관리자 계정 초대

1. Identity 화면에서 `Invite users`
2. 본인 이메일 입력
3. 이메일의 초대 링크 열기
4. 비밀번호 설정

## 6. 관리자 페이지 접속

`https://발급된-netlify-주소/admin/`

로그인 후 이미지를 올리고 저장하면 GitHub 저장소에 자동으로 커밋됩니다.
Netlify가 새 커밋을 감지해 사이트를 다시 배포합니다.

## 참고

기존 GitHub Pages 주소 대신 Netlify에서 발급한 주소를 사용합니다.
원하는 경우 나중에 별도 도메인을 연결할 수 있습니다.

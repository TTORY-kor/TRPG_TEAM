# Character Profile Site

GitHub Pages에서 바로 배포할 수 있도록 HTML, CSS, JavaScript를 분리한 정적 사이트입니다.

## 폴더 구조

```text
.
├─ index.html
├─ .nojekyll
└─ assets/
   ├─ css/
   │  └─ style.css
   ├─ js/
   │  └─ script.js
   └─ images/
      └─ 이미지 파일들
```

## 반드시 추가할 이미지

`assets/images/` 폴더에 아래 파일을 넣으세요. GitHub는 파일명의 대소문자를 구분합니다.

```text
office.jpg
icon.jpg
main.png
Ho1.png
Ho2.png
Ho3.png
Ho4.png
Ho1Standing.png
gallery1.jpg
gallery2.jpg
gallery3.jpg
gallery4.jpg
gallery5.jpg
gallery6.jpg
```

## GitHub Pages 배포

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더 안의 파일과 폴더를 저장소 최상단에 업로드합니다.
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Build and deployment**에서 `Deploy from a branch`를 선택합니다.
5. Branch를 `main`, 폴더를 `/(root)`로 선택한 후 저장합니다.
6. 배포가 완료되면 `https://사용자명.github.io/저장소명/`에서 열립니다.

## 주요 수정 위치

- 페이지 내용과 캐릭터 정보: `index.html`
- 색상과 레이아웃: `assets/css/style.css`의 `:root`
- 캘린더 일정과 로그 색상: `assets/js/script.js`
- 이미지: `assets/images/`

## 주의 사항

- 이미지 파일명이 HTML에 적힌 이름과 정확히 같아야 합니다.
- 
- 탐사자 시트 버튼은 현재 비활성화되어 있습니다. `index.html`에서 해당 링크의 `href`를 실제 URL로 바꾸고 `onclick`, `aria-disabled`, `title` 속성을 제거하세요.
- `Ho2`, `Ho3`, `Ho4` 상세 페이지는 원본 안내대로 `char-ho1` 섹션을 복사해 추가해야 합니다.
- 외부 Google Fonts, YouTube 썸네일, placeholder.com 이미지를 사용하므로 인터넷 연결이 필요합니다.

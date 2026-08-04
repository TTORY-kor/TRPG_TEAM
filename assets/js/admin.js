const FILES = { site:'site.json', characters:'characters.json', npc:'npc.json', gallery:'gallery.json', events:'events.json' };
let data = { site:{}, characters:[], npc:[], gallery:[], events:[] };
let selectedImage = null;
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function status(message,type=''){const element=$('#status');element.textContent=message;element.className=`status ${type}`;}
function worker(){return $('#workerUrl').value.trim().replace(/\/$/,'');}
function password(){return $('#adminPassword').value;}
function counts(){$('#countCharacters').textContent=data.characters.length;$('#countNpc').textContent=data.npc.length;$('#countGallery').textContent=data.gallery.length;$('#countEvents').textContent=data.events.length;}
function normalizeSite(){
  data.site.colors ||= {};
  const defaults={accent:data.site.accent||'#7ccf2d',background:'#eef1f4',card:'#ffffff',text:'#181a1e',subText:'#70757d',line:'#e5e8ec',darkCard:'#22252b',darkText:'#ffffff',heroShade:'#000000'};
  Object.entries(defaults).forEach(([key,value])=>data.site.colors[key] ||= value);
  if(!Array.isArray(data.site.profileLinks)) data.site.profileLinks = data.site.mainLinkLabel && data.site.mainLinkUrl ? [{label:data.site.mainLinkLabel,url:data.site.mainLinkUrl}] : [];
}
function siteEditor(){
  normalizeSite();
  const fields=[['teamName','팀 이름'],['title','사이트 제목'],['description','설명'],['heroImage','헤더 이미지 파일명'],['profileImage','프로필 이미지 파일명'],['profileName','프로필 이름'],['profileSub1','소개 1'],['profileSub2','소개 2'],['profileSince','Since'],['mainImage','메인 이미지 파일명'],['musicTitle','음악 제목'],['musicArtist','음악 아티스트'],['musicYoutubeId','YouTube ID'],['footer','푸터']];
  const colorFields=[['accent','강조색'],['background','전체 배경색'],['card','카드 배경색'],['text','기본 글자색'],['subText','보조 글자색'],['line','테두리색'],['darkCard','캘린더·음악 배경색'],['darkText','어두운 카드 글자색'],['heroShade','배너 음영색']];
  $('#siteFields').innerHTML = fields.map(([key,label])=>`<label><span>${label}</span><input data-site="${key}" value="${esc(data.site[key])}"></label>`).join('') + colorFields.map(([key,label])=>`<label><span>${label}</span><div class="color-control"><input type="color" data-color-picker="${key}" value="${esc(data.site.colors[key])}"><input data-site-color="${key}" value="${esc(data.site.colors[key])}"></div></label>`).join('');
  document.querySelectorAll('[data-color-picker]').forEach((picker)=>picker.oninput=()=>{const text=$(`[data-site-color="${picker.dataset.colorPicker}"]`);text.value=picker.value;});
  document.querySelectorAll('[data-site-color]').forEach((text)=>text.oninput=()=>{const picker=$(`[data-color-picker="${text.dataset.siteColor}"]`);if(/^#[0-9a-f]{6}$/i.test(text.value))picker.value=text.value;});
}
function profileLinkEditor(){
  $('#profileLinkEditor').innerHTML = data.site.profileLinks.map((link,index)=>`<div class="editor-item compact"><div class="editor-fields"><label><span>링크 이름</span><input data-profile-link="${index}:label" value="${esc(link.label)}"></label><label><span>URL</span><input data-profile-link="${index}:url" value="${esc(link.url)}"></label><button class="delete row-delete" data-del-link="${index}">삭제</button></div></div>`).join('') || '<p class="empty-note">등록된 링크가 없습니다.</p>';
}
function characterEditor(){const element=$('#characterEditor');element.innerHTML=data.characters.map((character,index)=>`<details class="editor-item" open><summary>${esc(character.name||'새 캐릭터')} <button class="delete" data-del-char="${index}">삭제</button></summary><div class="editor-fields">${[['id','ID'],['name','이름'],['banner','배너 파일'],['standing','스탠딩 파일'],['quote','한마디'],['accent','강조색'],['job','직업'],['age','나이'],['location','거주지'],['sheetUrl','시트 URL']].map(([key,label])=>`<label><span>${label}</span><input data-char="${index}:${key}" value="${esc(character[key])}"></label>`).join('')}<label class="full"><span>스탯 8개</span><input data-char="${index}:stats" value="${(character.stats||[]).join(',')}"></label><label class="full"><span>성격 4개</span><input data-char="${index}:personality" value="${(character.personality||[]).join(',')}"></label></div></details>`).join('');}
function simpleEditor(type,fields){const key=type==='event'?'events':type;const element=$(`#${type}Editor`);element.innerHTML=data[key].map((item,index)=>`<details class="editor-item" open><summary>${esc(item.name||item.title||item.date||'새 항목')} <button class="delete" data-del="${type}:${index}">삭제</button></summary><div class="editor-fields">${fields.map(([field,label])=>`<label class="${field==='description'||field==='credit'?'full':''}"><span>${label}</span><input data-item="${type}:${index}:${field}" value="${esc(item[field])}"></label>`).join('')}</div></details>`).join('');}
function render(){normalizeSite();counts();siteEditor();profileLinkEditor();characterEditor();simpleEditor('npc',[['name','이름'],['relation','관계'],['image','이미지 파일'],['description','설명']]);simpleEditor('gallery',[['image','이미지 파일'],['credit','크레딧']]);simpleEditor('event',[['date','날짜'],['title','일정명'],['time','시간']]);}
async function api(path,body){const response=await fetch(worker()+path,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Password':password()},body:JSON.stringify(body)});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||`요청 실패 ${response.status}`);return result;}
async function load(){if(!worker()||!password())throw new Error('Worker 주소와 비밀번호를 입력하세요.');localStorage.setItem('trpgWorker',worker());status('저장소 데이터를 불러오는 중…');for(const [key,file] of Object.entries(FILES))data[key]=await api('/read',{path:`assets/data/${file}`});render();status('불러오기 완료','success');}
function collectForm(){
  document.querySelectorAll('[data-site]').forEach((input)=>data.site[input.dataset.site]=input.value);
  document.querySelectorAll('[data-site-color]').forEach((input)=>data.site.colors[input.dataset.siteColor]=input.value);
  document.querySelectorAll('[data-profile-link]').forEach((input)=>{const [index,key]=input.dataset.profileLink.split(':');data.site.profileLinks[index][key]=input.value;});
  document.querySelectorAll('[data-char]').forEach((input)=>{const [index,key]=input.dataset.char.split(':');data.characters[index][key]=['stats','personality'].includes(key)?input.value.split(',').map(Number):input.value;});
  document.querySelectorAll('[data-item]').forEach((input)=>{const [type,index,key]=input.dataset.item.split(':');data[type==='event'?'events':type][index][key]=input.value;});
}
async function saveAll(){collectForm();status('GitHub에 변경사항을 게시하는 중…');for(const [key,file] of Object.entries(FILES))await api('/write-json',{path:`assets/data/${file}`,data:data[key],message:`관리자: ${file} 업데이트`});status('게시 완료. GitHub Pages 반영까지 잠시 기다리세요.','success');}
window.addEventListener('DOMContentLoaded',()=>{
  $('#workerUrl').value=localStorage.getItem('trpgWorker')||'';
  document.querySelectorAll('.admin-nav').forEach((button)=>button.onclick=()=>{document.querySelectorAll('.admin-nav').forEach((item)=>item.classList.remove('active'));button.classList.add('active');document.querySelectorAll('.view').forEach((view)=>view.classList.remove('active'));$(`#view-${button.dataset.view}`).classList.add('active');$('#viewTitle').textContent=button.textContent;});
  $('#loadRemote').onclick=()=>load().catch((error)=>status(error.message,'error'));
  $('#saveAll').onclick=()=>saveAll().catch((error)=>status(error.message,'error'));
  $('#addProfileLink').onclick=()=>{collectForm();data.site.profileLinks.push({label:'새 링크',url:'https://'});render();};
  $('#addCharacter').onclick=()=>{collectForm();data.characters.push({id:'new',name:'새 캐릭터',banner:'Ho1.png',standing:'Ho1Standing.png',quote:'',accent:'#7ccf2d',job:'',age:'',location:'',sheetUrl:'#',stats:[50,50,50,50,50,50,50,50],personality:[50,50,50,50],story:[]});render();};
  $('#addNpc').onclick=()=>{collectForm();data.npc.push({name:'새 NPC',relation:'중립',image:'npc.jpg',description:''});render();};
  $('#addGallery').onclick=()=>{collectForm();data.gallery.push({image:'gallery.jpg',credit:''});render();};
  $('#addEvent').onclick=()=>{collectForm();data.events.push({date:'2026-01-01',title:'새 일정',time:'20:00'});render();};
  document.body.onclick=(event)=>{if(event.target.dataset.delChar!==undefined){event.preventDefault();collectForm();data.characters.splice(Number(event.target.dataset.delChar),1);render();}if(event.target.dataset.del){event.preventDefault();collectForm();const [type,index]=event.target.dataset.del.split(':');data[type==='event'?'events':type].splice(Number(index),1);render();}if(event.target.dataset.delLink!==undefined){event.preventDefault();collectForm();data.site.profileLinks.splice(Number(event.target.dataset.delLink),1);render();}};
  $('#imageFile').onchange=(event)=>{selectedImage=event.target.files[0];if(!selectedImage)return;const preview=$('#imagePreview');preview.hidden=false;preview.querySelector('img').src=URL.createObjectURL(selectedImage);preview.querySelector('div').textContent=`${selectedImage.name} · ${(selectedImage.size/1024/1024).toFixed(2)}MB`;};
  $('#uploadImage').onclick=async()=>{try{if(!selectedImage)throw new Error('이미지를 선택하세요.');const name=$('#imageFileName').value.trim();if(!/^[A-Za-z0-9_-]+\.(png|jpe?g|webp|gif)$/i.test(name))throw new Error('파일명을 확인하세요.');const content=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(selectedImage);});status('이미지 업로드 중…');await api('/upload',{fileName:name,content,commitMessage:'관리자 이미지 업로드'});status('이미지 업로드 완료','success');}catch(error){status(error.message,'error');}};
  render();
});

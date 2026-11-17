const docs={plan:{title:'놀다가 서비스 기획서 · v2.2',url:'./docs/놀다가_기획서.md'},wbs:{title:'작업 분해 구조와 일정 · v2.5',url:'./docs/WBS.md'}};
const dialog=document.querySelector('#reader'),body=document.querySelector('#reader-body'),title=document.querySelector('#reader-title');
document.querySelectorAll('.open-doc').forEach(button=>button.addEventListener('click',async()=>{const doc=docs[button.dataset.doc];title.textContent=doc.title;body.innerHTML='<p class="loading">문서를 불러오는 중…</p>';dialog.showModal();try{const response=await fetch(doc.url);if(!response.ok)throw new Error('문서를 불러오지 못했습니다.');body.innerHTML=renderMarkdown(await response.text());}catch(e){body.textContent=e.message;}}));
document.querySelector('.close-reader').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function inline(s){return escapeHtml(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');}
function renderMarkdown(md){const lines=md.replace(/\r/g,'').split('\n');let out='',i=0;while(i<lines.length){let line=lines[i],t=line.trim();if(!t){i++;continue;}if(/^---+$/.test(t)){out+='<hr>';i++;continue;}if(/^```/.test(t)){i++;let code='';while(i<lines.length&&!/^```/.test(lines[i]))code+=lines[i++]+'\n';i++;out+='<pre><code>'+escapeHtml(code)+'</code></pre>';continue;}if(/^\|/.test(t)){const rows=[];while(i<lines.length&&/^\s*\|/.test(lines[i]))rows.push(lines[i++].trim());const cells=r=>r.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());const data=rows.filter(r=>!/^\|?[\s|:-]+\|?$/.test(r)).map(cells);if(data.length){out+='<table><thead><tr>'+data[0].map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+data.slice(1).map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}continue;}const h=t.match(/^(#{1,6})\s+(.*)$/);if(h){const n=h[1].length;out+=`<h${n}>${inline(h[2].replace(/\\#/g,'#'))}</h${n}>`;i++;continue;}if(/^>/.test(t)){let q='';while(i<lines.length&&/^\s*>/.test(lines[i]))q+=inline(lines[i++].replace(/^\s*>\s?/,''))+'<br>';out+='<blockquote>'+q+'</blockquote>';continue;}if(/^\s*[-*+]\s+/.test(line)){let items='';while(i<lines.length&&/^\s*[-*+]\s+/.test(lines[i]))items+='<li>'+inline(lines[i++].replace(/^\s*[-*+]\s+/,''))+'</li>';out+='<ul>'+items+'</ul>';continue;}if(/^\s*\d+\.\s+/.test(line)){let items='';while(i<lines.length&&/^\s*\d+\.\s+/.test(lines[i]))items+='<li>'+inline(lines[i++].replace(/^\s*\d+\.\s+/,''))+'</li>';out+='<ol>'+items+'</ol>';continue;}let p=inline(t);i++;while(i<lines.length&&lines[i].trim()&&!/^(#{1,6}\s|>|\||```|[-*+]\s|\d+\.\s)/.test(lines[i].trim()))p+=' '+inline(lines[i++].trim());out+='<p>'+p+'</p>'; }return out;}
const search=document.querySelector('#doc-search'),cards=[...document.querySelectorAll('.doc-card')];search.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();let shown=0;cards.forEach(card=>{const match=!q||card.dataset.search.toLowerCase().includes(q);card.hidden=!match;if(match)shown++;});document.querySelector('#empty-search').hidden=shown!==0;});
const toast=document.querySelector('#toast');let toastTimer;function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);}
document.querySelector('#copy-questions').addEventListener('click',async()=>{const text=[...document.querySelectorAll('.decision-row')].map(row=>row.querySelector('h3').textContent+' — '+row.querySelector('.decision-main p').textContent).join('\n');try{await navigator.clipboard.writeText(text);showToast('질문 목록을 복사했어요.');}catch{showToast('브라우저에서 복사를 허용해 주세요.');}});

const uploadDialog=document.querySelector('#upload-dialog');
const uploadForm=document.querySelector('#upload-form');
const libraryGrid=document.querySelector('#library-grid');
const libraryEmpty=document.querySelector('#library-empty');
const librarySearch=document.querySelector('#library-search');
const libraryCount=document.querySelector('#library-count');
const libraryNavCount=document.querySelector('#library-nav-count');
let libraryDocuments=[];

function formatBytes(bytes){if(bytes<1024)return bytes+' B';if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';return (bytes/(1024*1024)).toFixed(1)+' MB';}
function formatDate(value){if(!value)return '';const date=new Date(value);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function fileLabel(fileName){const ext=(fileName.split('.').pop()||'FILE').toUpperCase();return ext.slice(0,5);}

function renderLibrary(){
  const query=librarySearch.value.trim().toLowerCase();
  const visible=libraryDocuments.filter(doc=>[doc.title,doc.category,doc.uploader,doc.fileName].join(' ').toLowerCase().includes(query));
  libraryGrid.innerHTML='';
  libraryEmpty.hidden=visible.length!==0||query!=='';
  if(visible.length===0&&query){libraryGrid.innerHTML='<div class="library-loading"><p>검색 결과가 없습니다.</p></div>';}
  visible.forEach(doc=>{
    const card=document.createElement('article');card.className='library-card';
    const top=document.createElement('div');top.className='library-card-top';
    const badge=document.createElement('span');badge.className='file-badge';badge.textContent=fileLabel(doc.fileName);
    const size=document.createElement('span');size.className='file-size';size.textContent=formatBytes(doc.size||0);top.append(badge,size);
    const category=document.createElement('span');category.className='library-category';category.textContent=doc.category||'기타';
    const heading=document.createElement('h3');heading.textContent=doc.title||doc.fileName;
    const description=document.createElement('p');description.textContent=doc.description||doc.fileName;
    const meta=document.createElement('div');meta.className='library-meta';meta.textContent=(doc.uploader||'팀원')+' · '+formatDate(doc.uploadedAt);
    const open=document.createElement('a');open.className='library-open';open.href=doc.url;open.target='_blank';open.rel='noopener';open.innerHTML='<span>문서 열기</span><span>↗</span>';
    card.append(top,category,heading,description,meta,open);libraryGrid.append(card);
  });
  const total=libraryDocuments.length;libraryCount.textContent=`팀 문서 ${total}개`;libraryNavCount.textContent=String(total).padStart(2,'0');
}

async function loadLibrary(){
  try{const response=await fetch('/api/library',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'문서함을 불러오지 못했습니다.');libraryDocuments=data.documents||[];renderLibrary();}
  catch(error){libraryGrid.innerHTML='<div class="library-loading"><p>'+escapeHtml(error.message)+'</p></div>';libraryCount.textContent='연결 확인 필요';}
}

document.querySelector('#show-upload').addEventListener('click',()=>{const savedName=localStorage.getItem('teamUploaderName');if(savedName)uploadForm.elements.uploader.value=savedName;uploadDialog.showModal();});
document.querySelector('.close-upload').addEventListener('click',()=>uploadDialog.close());
document.querySelector('.cancel-upload').addEventListener('click',()=>uploadDialog.close());
uploadDialog.addEventListener('click',event=>{if(event.target===uploadDialog)uploadDialog.close();});
librarySearch.addEventListener('input',renderLibrary);
uploadForm.addEventListener('submit',async event=>{
  event.preventDefault();const errorBox=document.querySelector('#upload-error');const submit=document.querySelector('#submit-upload');errorBox.hidden=true;
  const formData=new FormData(uploadForm);const file=formData.get('file');if(file&&file.size>20*1024*1024){errorBox.textContent='파일은 20MB까지 올릴 수 있습니다.';errorBox.hidden=false;return;}
  const teamCode=String(formData.get('teamCode')||'');formData.delete('teamCode');submit.disabled=true;submit.innerHTML='올리는 중…';
  try{const response=await fetch('/api/library/upload',{method:'POST',headers:{'x-team-code':teamCode},body:formData});const data=await response.json();if(!response.ok)throw new Error(data.error||'문서를 올리지 못했습니다.');localStorage.setItem('teamUploaderName',String(formData.get('uploader')||''));uploadForm.reset();uploadDialog.close();showToast('팀 문서함에 추가했어요.');await loadLibrary();}
  catch(error){errorBox.textContent=error.message;errorBox.hidden=false;}
  finally{submit.disabled=false;submit.innerHTML='문서 올리기 <span>↗</span>';}
});

loadLibrary();

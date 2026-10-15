const $=id=>document.getElementById(id),frames=new Map();let studios=[];
function select(id){
  const studio=studios.find(s=>s.id===id),home=!studio;
  $('home').hidden=!home;$('editorArea').hidden=home;
  for(const button of document.querySelectorAll('nav button')){if(button.dataset.studio===id||home&&button.id==='homeButton')button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  if(studio){
    $('editorTitle').textContent=studio.title;
    if(!frames.has(id)){
      const frame=document.createElement('iframe');frame.title=studio.title;frame.src=studio.origin+'/';
      frame.onload=()=>{frame.contentWindow?.postMessage({type:'benteng-engine-visibility',active:!frame.hidden},studio.origin);if(!frame.hidden)$('status').textContent=`${studio.title} terbuka · simpan melalui kontrol studio.`;};
      $('frames').append(frame);frames.set(id,frame);
    }
  }
  for(const [key,frame]of frames){frame.hidden=key!==id;frame.contentWindow?.postMessage({type:'benteng-engine-visibility',active:key===id},studios.find(s=>s.id===key).origin);}
  if(home){document.body.classList.remove('focus-mode');$('focusButton').setAttribute('aria-pressed','false');$('focusButton').textContent='Perbesar workspace';$('status').textContent='Siap · pilih editor. Studio yang sudah dibuka tetap hidup di belakang layar.';}
  else $('status').textContent=`${studio.title} · draft tidak dibuang saat berpindah editor.`;
  history.replaceState(null,'',home?'#home':`#${id}`);
}
$('homeButton').onclick=()=>select('home');
$('focusButton').onclick=()=>{const active=document.body.classList.toggle('focus-mode');$('focusButton').setAttribute('aria-pressed',String(active));$('focusButton').textContent=active?'Kembali ke navigasi':'Perbesar workspace';};
try{
  const response=await fetch('/api/studios'),data=await response.json();if(!response.ok)throw new Error('Studio belum siap. Periksa proses engine lalu muat ulang.');studios=data.studios;
  for(const studio of studios){
    const nav=document.createElement('button');nav.dataset.studio=studio.id;nav.textContent=studio.title;nav.onclick=()=>select(studio.id);$('studioNav').append(nav);
    const card=document.createElement('button');card.className='card';card.setAttribute('aria-label',`Buka ${studio.title}`);
    for(const [className,text]of [['icon',{maps:'◇',sprites:'▷',characters:'♫'}[studio.id]],['title',studio.title],['description',studio.summary],['open','Buka studio →']]){const element=document.createElement(className==='title'?'strong':'span');element.className=className;element.textContent=text;card.append(element);}
    card.onclick=()=>select(studio.id);$('cards').append(card);
  }
  select(location.hash.slice(1)||'home');
}catch(error){$('status').textContent=error.message;}

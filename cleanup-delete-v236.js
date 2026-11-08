/* Clean Up V-2.36: selección y eliminación transaccional por módulo. */
window.PACleanupDelete=function(o){
 'use strict';let mode=false,busy=false,chosen=new Set(),menu=null;
 const body=document.getElementById(o.table),table=body.closest('table'),section=table.closest('section');
 const bar=document.createElement('div');bar.className='cu-delete-toolbar';bar.setAttribute('aria-label','Eliminar polígonos de '+o.module);
 const enter=button('Eliminar polígonos',()=>{mode=true;chosen.clear();refresh()}),all=button('Seleccionar todo el filtro',()=>{for(const p of o.items())chosen.add(p.id);refresh()}),none=button('Quitar selección',()=>{chosen.clear();refresh()}),remove=button('',()=>confirmDelete([...chosen])),cancel=button('Cancelar',()=>{mode=false;chosen.clear();refresh()});
 remove.classList.add('cu-delete-danger');const info=document.createElement('span');info.setAttribute('role','status');bar.append(enter,all,none,remove,cancel,info);table.parentElement.before(bar);
 function button(label,fn){const b=document.createElement('button');b.type='button';b.className='mini';b.textContent=label;b.onclick=fn;return b}
 function closeMenu(){if(menu){menu.remove();menu=null}for(const tr of body.rows)tr.classList.remove('cu-delete-target')}
 function refresh(){
  const ids=new Set(o.items().map(p=>p.id));for(const id of chosen)if(!ids.has(id))chosen.delete(id);
  enter.hidden=mode;for(const b of [all,none,remove,cancel])b.hidden=!mode;
  remove.textContent='Eliminar seleccionados ('+chosen.size+')';remove.disabled=busy||!chosen.size;enter.disabled=busy||!ids.size;all.disabled=busy||!ids.size;none.disabled=busy||!chosen.size;cancel.disabled=busy;
  info.textContent=mode?ids.size+' polígonos en el filtro · '+chosen.size+' seleccionados':'';
  const head=table.tHead.rows[0];let th=head.querySelector('.cu-delete-column');if(mode&&!th){th=document.createElement('th');th.className='cu-delete-column';th.textContent='Eliminar';head.insertBefore(th,head.children[1])}if(!mode&&th)th.remove();
  for(const tr of body.rows){tr.querySelector('.cu-delete-column')?.remove();const id=tr.dataset.polygonId;if(!id){tr.cells[0].colSpan=mode?5:4;continue}tr.classList.toggle('cu-delete-selected',chosen.has(id));if(mode){const td=document.createElement('td');td.className='cu-delete-column';const c=document.createElement('input');c.type='checkbox';c.checked=chosen.has(id);c.disabled=busy;c.setAttribute('aria-label','Eliminar '+o.name(id));c.onchange=()=>{c.checked?chosen.add(id):chosen.delete(id);refresh()};td.append(c);tr.insertBefore(td,tr.children[1])}}
 }
 function confirmDelete(ids){
  closeMenu();ids=ids.filter(id=>o.exists(id));if(!ids.length||busy)return;
  const dialog=document.createElement('dialog');dialog.className='cu-delete-dialog';dialog.setAttribute('aria-label','Confirmar eliminación');
  const title=document.createElement('h3');title.textContent=ids.length===1?'¿Eliminar este polígono?':'¿Eliminar '+ids.length+' polígonos?';
  const detail=document.createElement('p');detail.textContent=ids.length===1?o.name(ids[0]):'Se eliminarán únicamente los '+ids.length+' polígonos seleccionados de Clean Up de '+o.module+'.';
  const error=document.createElement('p');error.setAttribute('role','alert');const actions=document.createElement('div');actions.className='cu-delete-actions';
  const no=button('Cancelar',()=>dialog.close()),yes=button('Eliminar ('+ids.length+')',async()=>{busy=true;no.disabled=yes.disabled=true;try{await o.delete(ids);for(const id of ids)chosen.delete(id);mode=false;o.render();dialog.close();info.textContent=ids.length+' polígonos eliminados de '+o.module+'.'}catch(e){error.textContent='No se pudo eliminar. Se conservaron los polígonos. '+e.message}finally{busy=false;no.disabled=yes.disabled=false;refresh()}});yes.classList.add('cu-delete-danger');actions.append(no,yes);dialog.append(title,detail,error,actions);document.body.append(dialog);dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});dialog.onclose=()=>dialog.remove();dialog.showModal();no.focus();
 }
 body.addEventListener('contextmenu',e=>{const tr=e.target.closest('tr[data-polygon-id]');if(!tr||busy)return;e.preventDefault();closeMenu();tr.classList.add('cu-delete-target');menu=document.createElement('div');menu.className='cu-delete-menu';menu.setAttribute('role','menu');const b=button('Eliminar polígono',()=>confirmDelete([tr.dataset.polygonId]));b.setAttribute('role','menuitem');menu.append(b);document.body.append(menu);menu.style.left=Math.max(8,Math.min(e.clientX,innerWidth-210))+'px';menu.style.top=Math.max(8,Math.min(e.clientY,innerHeight-65))+'px';b.focus()});
 document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target))closeMenu()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});document.addEventListener('scroll',closeMenu,true);
 refresh();return {refresh,filterChanged(){chosen.clear();closeMenu();refresh()}};
};

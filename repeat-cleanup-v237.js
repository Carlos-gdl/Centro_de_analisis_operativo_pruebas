/* Repeat 60 V-2.34: módulo Clean Up independiente de soportes, base de clientes, Repeat 60 y Planta Externa. */
(()=>{'use strict';
 const byId=id=>document.getElementById(id);
 const DBNAME='primavera_repeat_cleanup',STORE='polygons';
 const polygons=new Map(),shown=new Map();let deletion=null;
 const pane=map.createPane('cleanupPolygons');pane.style.zIndex='450';
 const group=L.layerGroup();let cleanupOn=false;
 function setCleanupOn(on){cleanupOn=on;if(on){if(!map.hasLayer(group))group.addTo(map)}else if(map.hasLayer(group))map.removeLayer(group);byId('rc34-toggle').setAttribute('aria-pressed',String(on));}
 let storageReady=null,storageLoaded=false;
 let cleanDb=null, selectedStatuses=new Set(['TERMINADOS','EN PROCESO','MANCHAS A TRABAJAR']);
 const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const colors={'TERMINADOS':'#22a447','EN PROCESO':'#ffd600','MANCHAS A TRABAJAR':'#ff6900'};
 const statusName=s=>s==='TERMINADOS'?'Terminado':s==='EN PROCESO'?'En proceso':'Pendiente';
 const visible=p=>selectedStatuses.has(p.status);
 function ringKey(ring){let pts=ring.map(p=>[p[0],p[1]]);if(pts.length>1&&JSON.stringify(pts[0])===JSON.stringify(pts.at(-1)))pts.pop();
  const variants=[];for(const order of [pts,[...pts].reverse()]){let min=0;for(let i=1;i<order.length;i++)if(JSON.stringify(order[i])<JSON.stringify(order[min]))min=i;
   for(let i=0;i<order.length;i++)if(JSON.stringify(order[i])===JSON.stringify(order[min]))variants.push(JSON.stringify([...order.slice(i),...order.slice(0,i)]))}return variants.sort()[0]||'[]'}
 const idFor=p=>'geometry:'+JSON.stringify(p.parts.map(rings=>[ringKey(rings[0]),...rings.slice(1).map(ringKey).sort()]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
 function dbOpen(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DBNAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 function dbAll(){return new Promise((resolve,reject)=>{const req=cleanDb.transaction(STORE).objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 function dbSave(records){return new Promise((resolve,reject)=>{const tx=cleanDb.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);records.forEach(r=>store.put(r));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
 function elementChildren(node,name){return [...node.children].filter(e=>e.localName===name)}
 function directText(node,name){const child=elementChildren(node,name)[0];return child?child.textContent.trim():''}
 function coordinates(s){const points=s.trim().split(/\s+/).filter(Boolean).map(x=>x.split(',').map(Number)).map(v=>[v[1],v[0]]);if(points.length<4||points.some(v=>!v.every(Number.isFinite)||Math.abs(v[0])>90||Math.abs(v[1])>180))throw Error('Coordenadas inválidas en un polígono.');return points}
 function parseGeometry(poly){const rings=[];for(const outer of elementChildren(poly,'outerBoundaryIs'))for(const ring of elementChildren(outer,'LinearRing')){const c=directText(ring,'coordinates');if(c)rings.push(coordinates(c))}if(!rings.length)throw Error('Polígono sin contorno exterior.');for(const inner of elementChildren(poly,'innerBoundaryIs'))for(const ring of elementChildren(inner,'LinearRing')){const c=directText(ring,'coordinates');if(c)rings.push(coordinates(c))}return rings}
 function extract(xml){const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('El archivo KML contiene XML inválido.');const result=[];
  function visit(node,parents){for(const child of node.children){const tag=child.localName;if(tag==='Folder'||tag==='Document'){const n=directText(child,'name');visit(child,tag==='Folder'?[...parents,n]:parents)}else if(tag==='Placemark'){
    const name=directText(child,'name'), status=parents.map(x=>x.trim().toUpperCase()).reverse().find(x=>x==='TERMINADOS'||x==='EN PROCESO'||x==='MANCHAS A TRABAJAR'||x==='PENDIENTES');if(!status)continue;
    const geometries=[...child.getElementsByTagNameNS('*','Polygon')];if(!geometries.length)continue;
    if(!name)throw Error('Hay un polígono sin nombre.');const parts=geometries.map(parseGeometry);
    const p={name,sourceName:name,status:status==='PENDIENTES'?'MANCHAS A TRABAJAR':status,parts,description:directText(child,'description'),enabled:true};p.id=idFor(p);result.push(p);
  }}}
  visit(doc.documentElement,[]);if(!result.length)throw Error('No se encontraron polígonos dentro de carpetas TERMINADOS, EN PROCESO o MANCHAS A TRABAJAR.');
  return [...new Map(result.map(p=>[p.id,p])).values()];
 }
 async function readFile(file){if(!/\.(kmz|kml)$/i.test(file.name))throw Error('Selecciona un archivo .kmz o .kml.');if(file.name.toLowerCase().endsWith('.kml'))return file.text();if(typeof JSZip==='undefined')throw Error('No se cargó la librería JSZip para leer KMZ.');const zip=await JSZip.loadAsync(file);const candidates=Object.values(zip.files).filter(f=>!f.dir&&/\.kml$/i.test(f.name));if(!candidates.length)throw Error('El KMZ no contiene archivos KML.');const kml=candidates.find(f=>/(^|\/)doc\.kml$/i.test(f.name))||candidates[0];return kml.async('string')}
 function layerFor(p){const shapes=p.parts.map(rings=>L.polygon(rings,{pane:'cleanupPolygons',color:'#111d24',weight:2,fillColor:colors[p.status],fillOpacity:.35,interactive:true}));const layer=L.featureGroup(shapes);layer.bindPopup(()=>{const wrap=document.createElement('div');const strong=document.createElement('strong');strong.textContent=p.name;wrap.append(strong,document.createElement('br'),document.createTextNode(statusName(p.status)));return wrap});return layer}
 function refreshLayers(){for(const [id,l] of shown){if(!polygons.has(id)||!polygons.get(id).enabled||!visible(polygons.get(id))){group.removeLayer(l);shown.delete(id)}}for(const p of polygons.values()){if(p.enabled&&visible(p)&&!shown.has(p.id)){const l=layerFor(p);group.addLayer(l);shown.set(p.id,l)}}}
 function locate(id){const p=polygons.get(id);if(!p)return;p.enabled=true;dbSave([p]).catch(reportError);refreshLayers();renderList();const layer=shown.get(id);if(layer){const bounds=layer.getBounds();if(bounds.isValid())map.fitBounds(bounds,{padding:[35,35],maxZoom:17})}}
 function setOne(id,on,focus){const p=polygons.get(id);if(!p)return;p.enabled=on;dbSave([p]).catch(reportError);refreshLayers();renderList();if(on&&focus)locate(id)}
 function setAll(on){for(const p of polygons.values())if(visible(p))p.enabled=on;dbSave([...polygons.values()]).catch(reportError);refreshLayers();renderList()}
 function makeCheck(p){const c=document.createElement('input');c.type='checkbox';c.checked=p.enabled;c.addEventListener('change',()=>setOne(p.id,c.checked,c.checked));return c}
 function makeLocate(p){const b=document.createElement('button');b.type='button';b.className='mini';b.textContent='Ubicar';b.onclick=()=>locate(p.id);return b}
 function renderList(){const items=[...polygons.values()].filter(visible).sort((a,b)=>a.status.localeCompare(b.status)||a.name.localeCompare(b.name,'es'));
  byId('rc34-toggle').disabled=!polygons.size;byId('rc34-kImports').textContent=String(polygons.size);byId('rc34-cleanupInfo').textContent=polygons.size?`${items.length} polígonos en los estados seleccionados · ${items.filter(x=>x.enabled).length} encendidos. Total almacenado: ${polygons.size}.`:'Carga un KMZ o KML para comenzar.';
  const list=byId('rc34-cleanupList'),table=byId('rc34-cleanupTable');list.replaceChildren();table.replaceChildren();
  if(!items.length){const t=document.createElement('p');t.className='muted';t.textContent='No hay polígonos para los estados seleccionados.';list.append(t);const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent=t.textContent;tr.append(td);table.append(tr);deletion?.refresh();return}
  for(const p of items){const row=document.createElement('div');row.className='cleanup-row';const dot=document.createElement('span');dot.className='cleanup-dot';dot.style.background=colors[p.status];const label=document.createElement('label');label.append(makeCheck(p),document.createTextNode(' '+p.name));row.append(dot,label,makeRename(p),makeLocate(p));list.append(row);
   const tr=document.createElement('tr');const td1=document.createElement('td');td1.append(makeCheck(p));const td2=document.createElement('td');td2.append(document.createTextNode(p.name+' '),makeRename(p));const td3=document.createElement('td');td3.append(makeStatus(p));const td4=document.createElement('td');td4.append(makeLocate(p));tr.dataset.polygonId=p.id;tr.append(td1,td2,td3,td4);table.append(tr)}
  deletion?.refresh();
 }

 function reportError(err){byId('rc34-cleanupInfo').textContent='No se pudo guardar: '+err.message}
 function makeStatus(p){const select=document.createElement('select');select.className='cleanup-state-edit';select.setAttribute('aria-label','Estado de '+p.name);select.style.color=colors[p.status];
  for(const [value,text] of [['MANCHAS A TRABAJAR','Pendiente'],['EN PROCESO','En proceso'],['TERMINADOS','Terminado']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option)}select.value=p.status;
  select.onchange=async()=>{const status=select.value;select.disabled=true;try{const next={...p,status,statusEdited:true};await dbSave([next]);Object.assign(p,next);const old=shown.get(p.id);if(old){group.removeLayer(old);shown.delete(p.id)}refreshLayers();renderList();}catch(err){select.value=p.status;select.disabled=false;reportError(err)}};return select}
 function makeRename(p){const b=document.createElement('button');b.type='button';b.className='mini';b.textContent='Renombrar';b.onclick=()=>editName(p);return b}
 function editName(p){
  const dialog=document.createElement('dialog');dialog.className='cleanup-dialog';
  const form=document.createElement('form');form.method='dialog';
  const title=document.createElement('h3');title.textContent='Cambiar nombre del polígono';
  const label=document.createElement('label');label.textContent='Nombre';
  const input=document.createElement('input');input.value=p.name;input.required=true;input.maxLength=200;label.append(input);
  const error=document.createElement('p');error.setAttribute('role','alert');
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.onclick=()=>dialog.close();
  const save=document.createElement('button');save.type='submit';save.textContent='Guardar nombre';
  form.append(title,label,error,cancel,save);dialog.append(form);document.body.append(dialog);
  dialog.onclose=()=>dialog.remove();
  form.onsubmit=async e=>{e.preventDefault();const name=input.value.trim();if(!name){error.textContent='Escribe un nombre.';return}save.disabled=true;
   try{const updated={...p,name,renamed:true};await dbSave([updated]);Object.assign(p,updated);renderList();dialog.close()}catch(err){error.textContent='No se pudo guardar: '+err.message;save.disabled=false}};
  dialog.showModal();input.focus();input.select();
 }
 function exportKml(records){
  const ring=(points,tag)=>'<'+tag+'><LinearRing><coordinates>'+points.map(v=>v[1]+','+v[0]+',0').join(' ')+'</coordinates></LinearRing></'+tag+'>';
  const polygon=rings=>'<Polygon>'+rings.map((r,i)=>ring(r,i?'innerBoundaryIs':'outerBoundaryIs')).join('')+'</Polygon>';
  const folders=['TERMINADOS','EN PROCESO','MANCHAS A TRABAJAR'].map(status=>'<Folder><name>'+status+'</name>'+records.filter(p=>p.status===status).map(p=>'<Placemark><name>'+escapeHtml(p.name)+'</name><description>'+escapeHtml(p.description||'')+'</description><Style><LineStyle><color>ff241d11</color><width>2</width></LineStyle><PolyStyle><color>59'+colors[p.status].slice(5,7)+colors[p.status].slice(3,5)+colors[p.status].slice(1,3)+'</color></PolyStyle></Style>'+(p.parts.length>1?'<MultiGeometry>'+p.parts.map(polygon).join('')+'</MultiGeometry>':polygon(p.parts[0]))+'</Placemark>').join('')+'</Folder>').join('');
  return '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Clean Up</name>'+folders+'</Document></kml>';
 }
 byId('rc34-cleanupExport').onclick=()=>{
  const dialog=document.createElement('dialog');dialog.className='cleanup-dialog';const title=document.createElement('h3');title.textContent='Exportar polígonos';
  const label=document.createElement('label');label.textContent='Estado a exportar';const select=document.createElement('select');
  for(const [value,text] of [['TODOS','Todos'],['TERMINADOS','Terminados'],['EN PROCESO','En proceso'],['MANCHAS A TRABAJAR','Pendientes']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o)}label.append(select);
  const info=document.createElement('p');info.textContent='Archivo KML: solo polígonos, sin cuentas ni bases de clientes. Incluye los nombres editados y los polígonos ocultos del estado elegido.';
  const error=document.createElement('p');error.setAttribute('role','alert');const cancel=document.createElement('button');cancel.textContent='Cancelar';cancel.onclick=()=>dialog.close();
  const download=document.createElement('button');download.textContent='Descargar KML';download.onclick=()=>{const records=[...polygons.values()].filter(p=>select.value==='TODOS'||p.status===select.value);if(!records.length){error.textContent='No hay polígonos para esta opción.';return}
   const url=URL.createObjectURL(new Blob([exportKml(records)],{type:'application/vnd.google-earth.kml+xml;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Clean_Up_'+select.value.replaceAll(' ','_')+'.kml';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);dialog.close()};
  dialog.append(title,label,info,error,cancel,download);document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
 };

 document.addEventListener('click',e=>{if(e.target.closest('#rc34-cleanupExportTable'))byId('rc34-cleanupExport').onclick()});
 let closeTimer=null, insideMenu=false;
 const panel=byId('rc34-cleanupPanel'),kpi=byId('rc34-cleanupKpi');
 function stopClose(){clearTimeout(closeTimer);closeTimer=null}
 function scheduleClose(){stopClose();if(!panel.hidden&&!insideMenu)closeTimer=setTimeout(()=>setPanel(false),3000)}
 function syncStateButtons(){for(const b of panel.querySelectorAll('[data-cleanup-state]')){const status=b.dataset.cleanupState;const active=status==='ALL'?selectedStatuses.size===3:selectedStatuses.size===1&&selectedStatuses.has(status);b.setAttribute('aria-pressed',String(active))}}
 function chooseStatus(status){deletion?.filterChanged();selectedStatuses=status==='ALL'?new Set(['TERMINADOS','EN PROCESO','MANCHAS A TRABAJAR']):new Set([status]);for(const p of polygons.values())if(visible(p))p.enabled=true;refreshLayers();renderList();syncStateButtons();scheduleClose()}
 function setPanel(open,anchor=kpi){panel.hidden=!open;kpi.setAttribute('aria-expanded',String(open));kpi.setAttribute('aria-pressed',String(open));kpi.classList.toggle('cleanup-pressed',open);stopClose();if(open){
   chooseStatus('ALL');const box=anchor.getBoundingClientRect();panel.style.top=Math.min(box.bottom+8,window.innerHeight-240)+'px';panel.style.left=Math.max(8,Math.min(box.left,window.innerWidth-290))+'px';insideMenu=false;scheduleClose();
 }}
 kpi.onclick=()=>setPanel(panel.hidden);kpi.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();kpi.click()}};
 byId('rc34-cleanupClose').onclick=()=>setPanel(false);
 for(const b of panel.querySelectorAll('[data-cleanup-state]'))b.onclick=()=>chooseStatus(b.dataset.cleanupState);
 panel.addEventListener('pointerenter',()=>{insideMenu=true;stopClose()});panel.addEventListener('pointerleave',()=>{insideMenu=false;scheduleClose()});
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){setPanel(false);kpi.focus()}});
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!kpi.contains(e.target))setPanel(false)});
 document.addEventListener('pointermove',()=>{if(!panel.hidden&&!insideMenu)scheduleClose()});
 let isolated=false;
 function toggleIsolate(){isolated=!isolated;map.closePopup();map.getContainer().classList.toggle('cleanup-isolate',isolated);byId('rc34-cleanupIsolate').setAttribute('aria-pressed',String(isolated));if(isolated){setCleanupOn(true);for(const p of polygons.values())if(visible(p))p.enabled=true;refreshLayers();renderList()}}
 document.addEventListener('click',e=>{if(e.target.closest('#rc34-cleanupIsolate'))toggleIsolate()});
 syncStateButtons();
 byId('rc34-cleanupAllOn').onclick=()=>setAll(true);byId('rc34-cleanupAllOff').onclick=()=>setAll(false);
 byId('rc34-cleanupFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;e.target.disabled=true;const progress=(pct,detail)=>{byId('rc34-importModalBar').value=pct;byId('rc34-importModalPercent').textContent=pct+'%';byId('rc34-importModalDetail').textContent=detail};
  try{byId('rc34-importModal').hidden=false;byId('rc34-importModalTitle').textContent='Importando Clean Up';byId('rc34-importModalFile').textContent=file.name;byId('rc34-importModalAccept').hidden=true;progress(5,'Leyendo KMZ/KML…');await storageReady;if(!storageLoaded)throw Error('No se pudo recuperar la base Clean Up de Repeat; se conserva la base anterior.');const xml=await readFile(file);progress(35,'Validando polígonos…');const incoming=extract(xml);if(!cleanDb)throw Error('El almacenamiento Clean Up no está disponible.');
   const oldRecords=[...polygons.values()];
   const byGeometry=new Map(oldRecords.map(p=>[idFor(p),p]));
   const toDelete=[];const merged=incoming.filter(p=>!byGeometry.has(idFor(p)));
   progress(65,'Guardando cambios sin duplicar…');await new Promise((resolve,reject)=>{const tx=cleanDb.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);for(const id of toDelete)store.delete(id);for(const p of merged)store.put(p);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
   for(const l of shown.values())group.removeLayer(l);shown.clear();for(const id of toDelete)polygons.delete(id);for(const p of merged)polygons.set(p.id,p);refreshLayers();renderList();setCleanupOn(true);const bounds=L.featureGroup([...shown.values()]).getBounds();if(bounds.isValid())map.fitBounds(bounds,{padding:[35,35],maxZoom:16});progress(100,`Importación terminada: ${merged.length} nuevos; ${incoming.length-merged.length} ya existentes conservados con su nombre y estado; ${polygons.size} almacenados.`);byId('rc34-importModalAccept').hidden=false;byId('rc34-importModalAccept').onclick=()=>byId('rc34-importModal').hidden=true;
  }catch(err){progress(0,'Error: '+(err.message||String(err)));byId('rc34-importModalTitle').textContent='No se pudo importar Clean Up';byId('rc34-importModalAccept').hidden=false;byId('rc34-importModalAccept').onclick=()=>byId('rc34-importModal').hidden=true}finally{e.target.value='';e.target.disabled=false}
 };
 byId('rc34-toggle').onclick=()=>setCleanupOn(!cleanupOn);

 deletion=window.PACleanupDelete({table:'rc34-cleanupTable',module:'Repeat 60',items:()=>[...polygons.values()].filter(visible),exists:id=>polygons.has(id),name:id=>polygons.get(id)?.name||'',render:()=>{refreshLayers();renderList()},delete:async ids=>{
  if(!cleanDb)throw Error('Almacenamiento no disponible.');
  await new Promise((resolve,reject)=>{const tx=cleanDb.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);for(const id of ids)store.delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Error de almacenamiento'));tx.onabort=()=>reject(tx.error||Error('Operación cancelada'))});
  for(const id of ids)polygons.delete(id);
 }});
 storageReady=(async()=>{try{cleanDb=await dbOpen();for(const p of await dbAll()){p.enabled=true;polygons.set(p.id,p)}storageLoaded=true;refreshLayers();renderList()}catch(e){byId('rc34-cleanupInfo').textContent='No se pudo abrir el almacenamiento Clean Up: '+e.message}})();
})();

/* Lectura de archivos exclusiva de Planta Externa. */
window.PE239Files={
 parseCsv(text){
  text=text.replace(/^\uFEFF/,'');
  const header=text.split(/\r?\n/,1)[0];
  const delimiter=[',',';','\t'].sort((a,b)=>header.split(b).length-header.split(a).length)[0];
  const rows=[];let row=[],field='',quoted=false;
  const finish=()=>{row.push(field);field='';if(row.some(v=>v.trim()!==''))rows.push(row);row=[]};
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else quoted=false}else field+=c}
   else if(c==='"'&&field==='')quoted=true;
   else if(c===delimiter){row.push(field);field=''}
   else if(c==='\n'||c==='\r'){finish();if(c==='\r'&&text[i+1]==='\n')i++}
   else field+=c;
  }
  if(quoted)throw Error('CSV inválido: hay un campo con comillas sin cerrar.');
  if(field||row.length)finish();
  if(!rows.length)return [];
  const headers=rows.shift().map(v=>v.trim().toUpperCase());
  if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw Error('El archivo contiene encabezados repetidos.');
  return rows.map((values,i)=>{if(values.length!==headers.length)throw Error('CSV inválido: el registro '+(i+2)+' tiene '+values.length+' columnas; se esperaban '+headers.length+'.');return Object.fromEntries(headers.map((h,j)=>[h,values[j]??'']))});
 },
 read(bytes,name){
  if(/\.csv$/i.test(name)){
   let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{text=new TextDecoder('windows-1252').decode(bytes)}
   return this.parseCsv(text);
  }
  if(!/\.xlsx?$/i.test(name))throw Error('Selecciona un archivo CSV o XLSX.');
  const wb=XLSX.read(bytes,{type:'array',cellDates:true}),sheet=wb.Sheets[wb.SheetNames[0]];
  if(!sheet)throw Error('El archivo no contiene una hoja de datos.');
  return XLSX.utils.sheet_to_json(sheet,{defval:''}).map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k.trim().toUpperCase(),v])));
 },
 status(value){const s=String(value??'').trim().toLowerCase();if(/^finalizados?$/.test(s))return 'finalizado';if(/^cancelados?$/.test(s))return 'cancelado';return s}
};

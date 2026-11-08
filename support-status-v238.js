/* Mejora aislada: actualización de estatus por OS. Desactivar enabled revierte
   futuras actualizaciones; el respaldo por evento permite restaurar los datos. */
window.PASupportStatusV238={
 enabled:true,
 apply(prior,incoming,merged){
  if(!this.enabled||!incoming.os||incoming.os!==prior.os)return false;
  const next=String(incoming.raw?.Estatus??'').trim();
  if(!next||next===prior.estatus&&next===String(prior.raw?.Estatus??'').trim())return false;
  if(!merged._paStatusBackupV238)merged._paStatusBackupV238={estatus:prior.estatus,rawHadStatus:Object.prototype.hasOwnProperty.call(prior.raw||{},'Estatus'),rawStatus:prior.raw?.Estatus,savedAt:new Date().toISOString()};
  merged.estatus=next;
  merged.raw={...merged.raw,Estatus:next};
  return true;
 }
};

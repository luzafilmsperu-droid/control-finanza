(function(){
  const App = window.App;

  App.manualSave = async function(){
    const now = new Date();
    const fileName = `patrimonio_${App.formatStamp(now)}.json`;
    App.state.saveLog.push({ ts: now.toISOString(), fileName });
    App.audit('Exportacion', `Respaldo ${fileName}`);
    await App.saveState();
    const payload = { version: 1, fecha: now.toISOString(), datos: App.state };
    App.downloadBlob(new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'}), fileName);
    App.renderSaveLog();
    App.renderAudit();
    App.notify('Respaldo creado correctamente.');
  };

  App.renderSaveLog = function(){
    const el = document.getElementById('saveLogText');
    if(!App.state.saveLog.length){ el.textContent = 'Aun no se ha guardado manualmente.'; return; }
    const last = App.state.saveLog[App.state.saveLog.length-1];
    const d = new Date(last.ts);
    const fecha = d.toLocaleDateString('es-PE', {day:'2-digit',month:'2-digit',year:'numeric'});
    const hora = d.toLocaleTimeString('es-PE', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const file = last.fileName ? ` · Archivo: ${last.fileName}` : '';
    el.textContent = `Ultimo guardado: ${fecha} · ${hora}${file} (${App.state.saveLog.length} guardado${App.state.saveLog.length===1?'':'s'} en total)`;
  };

  App.validateBackup = function(data){
    if(!data || typeof data !== 'object') return false;
    if(data.version !== 1) return false;
    if(!data.fecha || Number.isNaN(new Date(data.fecha).getTime())) return false;
    if(!data.datos || typeof data.datos !== 'object') return false;
    return App.allKeys().every(k => data.datos[k] === undefined || Array.isArray(data.datos[k]));
  };

  App.importBackupFile = function(file){
    if(!file || !file.name.toLowerCase().endsWith('.json')){
      App.notify('El archivo debe ser JSON.', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = async function(){
      try{
        const parsed = JSON.parse(reader.result);
        if(!App.validateBackup(parsed)){
          App.notify('El archivo de respaldo no tiene una estructura valida.', true);
          return;
        }
        const restored = App.normalizeState(parsed.datos);
        restored.auditLog.push({ action:'Importacion', detail:`Respaldo ${file.name}`, ts:new Date().toISOString() });
        App.setState(restored);
        await App.saveState();
        App.render();
        App.notify('Respaldo restaurado correctamente.');
      }catch(e){
        App.notify('No se pudo leer el archivo de respaldo.', true);
      }
    };
    reader.readAsText(file);
  };
})();

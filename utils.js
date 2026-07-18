(function(){
  const App = window.App;

  App.loadState = async function(){
    try{
      let value = null;
      if(window.storage && window.storage.get){
        const res = await window.storage.get(App.STORAGE_KEY, false);
        value = res && res.value;
      }else{
        value = localStorage.getItem(App.STORAGE_KEY);
      }
      if(value){
        App.setState(JSON.parse(value));
      }
      App.notify('Datos cargados correctamente.');
    }catch(e){
      App.notify('Sin datos previos todavia - empieza registrando un movimiento.');
    }
    App.buildLedgerFilterOptions();
    App.render();
  };

  App.saveState = async function(){
    const payload = JSON.stringify(App.state);
    try{
      if(window.storage && window.storage.set){
        await window.storage.set(App.STORAGE_KEY, payload, false);
      }else{
        localStorage.setItem(App.STORAGE_KEY, payload);
      }
    }catch(e){
      try{ localStorage.setItem(App.STORAGE_KEY, payload); }catch(_){}
    }
  };
})();

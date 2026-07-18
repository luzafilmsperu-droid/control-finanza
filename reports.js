(function(){
  const App = window.App = window.App || {};

  App.ACCOUNTS = {
    scotibank: { label: 'Cuenta Operativa', hex: '#C9A227' },
    banco: { label: 'Banco / Ahorros', hex: '#E8C766' },
    inversiones: { label: 'Acciones y Fondos', hex: '#4FA98C' },
    factoring: { label: 'Factoring', hex: '#C1553D' },
    libre: { label: 'Libre / Disponible', hex: '#6E9BC9' },
    otrosIngresos: { label: 'Otros Ingresos', hex: '#D98E4A' },
    prestamos: { label: 'Prestamos', hex: '#A47FC7' }
  };

  App.GASTOS = {
    gastosFijos: { label: 'Gastos Fijos', hex: '#C1553D' },
    gastosVariables: { label: 'Gastos Variables', hex: '#D9764A' }
  };

  App.CATEGORIES = ['Casa','Vehiculo','Comida','Salud','Educacion','Servicios','Impuestos','Viajes','Diversion','Vestimenta','Otros'];
  App.CATEGORY_COLORS = {
    'Casa':'#4FA98C', 'Vehiculo':'#6E9BC9', 'Comida':'#D98E4A', 'Salud':'#A47FC7',
    'Educacion':'#E8C766', 'Servicios':'#C1553D', 'Impuestos':'#93AFA6', 'Viajes':'#D9764A',
    'Diversion':'#4A90A4', 'Vestimenta':'#B85C8A', 'Otros':'#7A8B99'
  };
  App.MONTHLY_ACCOUNT = 'scotibank';
  App.STORAGE_KEY = 'patrimonio-state-v2';
  App.editing = {};
  App.PROGRAMADOS_KEY = 'gastosProgramados';
  App.CURRENCIES = [
    { code:'PEN', symbol:'S/', label:'Soles (S/)' },
    { code:'USD', symbol:'US$', label:'Dolares (US$)' }
  ];

  // Lista de bancos disponibles para la cuenta "Banco / Ahorros".
  // Cada ingreso/retiro en esa cuenta queda etiquetado con un banco (bankCode),
  // lo que permite llevar saldos separados por banco y transferir entre ellos.
  App.BANKS = [
    { code:'bcp', label:'BCP' },
    { code:'interbank', label:'Interbank' },
    { code:'bbva', label:'BBVA Peru' },
    { code:'scotiabank', label:'Scotiabank' },
    { code:'mibanco', label:'Mibanco' },
    { code:'banbif', label:'BanBif' },
    { code:'pichincha', label:'Banco Pichincha' },
    { code:'falabella', label:'Banco Falabella' },
    { code:'ripley', label:'Banco Ripley' },
    { code:'banconacion', label:'Banco de la Nacion' },
    { code:'cmac', label:'Cajas Municipales' },
    { code:'yape', label:'Yape' },
    { code:'plin', label:'Plin' },
    { code:'otros_banco', label:'Otros' }
  ];
  App.BANK_ACCOUNT_KEY = 'banco';

  App.createEmptyState = function(){
    const state = {};
    Object.keys(App.ACCOUNTS).forEach(k => state[k] = []);
    Object.keys(App.GASTOS).forEach(k => state[k] = []);
    state[App.PROGRAMADOS_KEY] = [];
    state.cuentaOperativaBanco = null;
    state.saveLog = [];
    state.auditLog = [];
    return state;
  };

  App.state = App.createEmptyState();

  App.normalizeState = function(raw){
    const base = App.createEmptyState();
    const parsed = raw && typeof raw === 'object' ? raw : {};
    Object.keys(App.ACCOUNTS).forEach(k => {
      base[k] = Array.isArray(parsed[k]) ? parsed[k].map(App.normalizeTxn) : [];
    });
    Object.keys(App.GASTOS).forEach(k => {
      base[k] = Array.isArray(parsed[k]) ? parsed[k].map(App.normalizeGasto) : [];
    });
    base[App.PROGRAMADOS_KEY] = Array.isArray(parsed[App.PROGRAMADOS_KEY]) ? parsed[App.PROGRAMADOS_KEY].map(App.normalizeProgramado) : [];
    base.cuentaOperativaBanco = parsed.cuentaOperativaBanco || null;
    base.saveLog = Array.isArray(parsed.saveLog) ? parsed.saveLog : [];
    base.auditLog = Array.isArray(parsed.auditLog) ? parsed.auditLog : [];
    return base;
  };

  App.normalizeTxn = function(t){
    return {
      id: t.id || App.uid(),
      type: t.type === 'retiro' ? 'retiro' : 'ingreso',
      amount: Number(t.amount) || 0,
      date: t.date || App.todayStr(),
      note: t.note || '',
      category: t.category || '',
      bankCode: t.bankCode || null,
      currency: t.currency === 'USD' ? 'USD' : 'PEN',
      transferId: t.transferId || null
    };
  };

  App.normalizeGasto = function(t){
    return {
      id: t.id || App.uid(),
      amount: Number(t.amount) || 0,
      date: t.date || App.todayStr(),
      note: t.note || '',
      category: t.category || 'Otros',
      currency: t.currency === 'USD' ? 'USD' : 'PEN'
    };
  };

  App.normalizeProgramado = function(t){
    return {
      id: t.id || App.uid(),
      amount: Number(t.amount) || 0,
      date: t.date || App.todayStr(),
      note: t.note || '',
      category: t.category || 'Otros',
      currency: t.currency === 'USD' ? 'USD' : 'PEN',
      targetType: t.targetType === 'gastosVariables' ? 'gastosVariables' : 'gastosFijos'
    };
  };

  App.setState = function(nextState){
    const normalized = App.normalizeState(nextState);
    Object.keys(App.state).forEach(k => delete App.state[k]);
    Object.assign(App.state, normalized);
    if(App.state.cuentaOperativaBanco){
      const bank = App.BANKS.find(b=>b.code===App.state.cuentaOperativaBanco);
      if(bank) App.ACCOUNTS[App.MONTHLY_ACCOUNT].label = bank.label;
    }
  };

  // Se llama una sola vez, cuando el usuario elige con que banco
  // funciona su Cuenta Operativa (queda fijo despues de eso).
  App.setCuentaOperativaBanco = function(code){
    App.state.cuentaOperativaBanco = code;
    const bank = App.BANKS.find(b=>b.code===code);
    if(bank) App.ACCOUNTS[App.MONTHLY_ACCOUNT].label = bank.label;
  };

  App.uid = function(){ return Math.random().toString(36).slice(2,10); };
  App.todayStr = function(){ return new Date().toISOString().slice(0,10); };
  App.monthKey = function(d){ return (d || App.todayStr()).slice(0,7); };
  App.monthLabel = function(mk){
    const parts = mk.split('-');
    const dt = new Date(Number(parts[0]), Number(parts[1])-1, 1);
    return dt.toLocaleDateString('es-PE',{month:'long',year:'numeric'});
  };
  App.fmt = function(n, currency){
    const symbol = currency === 'USD' ? 'US$' : 'S/';
    const sign = n < 0 ? '-' : '';
    return sign + symbol + ' ' + Math.abs(n || 0).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
  };
  App.fmtDate = function(d){
    const dt = new Date((d || App.todayStr()) + 'T00:00:00');
    return dt.toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'});
  };
  App.formatStamp = function(date){
    const pad = n => String(n).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  };
  App.escapeHtml = function(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  };
  App.balance = function(key, currency){
    currency = currency === 'USD' ? 'USD' : 'PEN';
    const raw = App.state[key].filter(t=>(t.currency||'PEN')===currency).reduce((s,t)=> s + (t.type === 'ingreso' ? t.amount : -t.amount), 0);
    if(key === App.MONTHLY_ACCOUNT && currency === 'PEN'){
      // Los gastos (fijos y variables) se pagan de la cuenta principal,
      // asi que se descuentan del saldo real para que el patrimonio no quede inflado.
      const gastos = App.gastoTotal('gastosFijos','PEN') + App.gastoTotal('gastosVariables','PEN');
      return raw - gastos;
    }
    return raw;
  };
  App.gastoTotal = function(key, currency){
    currency = currency === 'USD' ? 'USD' : 'PEN';
    return App.state[key].filter(t=>(t.currency||'PEN')===currency).reduce((s,t)=> s + t.amount, 0);
  };
  App.totalPatrimonio = function(currency){
    currency = currency === 'USD' ? 'USD' : 'PEN';
    return Object.keys(App.ACCOUNTS).reduce((s,k)=> s + App.balance(k, currency), 0);
  };
  App.liquidez = function(){ return Math.max(App.balance('libre','PEN'), 0); };
  App.allKeys = function(){ return Object.keys(App.ACCOUNTS).concat(Object.keys(App.GASTOS)); };

  // Saldo de un banco especifico dentro de la cuenta "Banco / Ahorros".
  App.bankBalance = function(code, currency){
    currency = currency === 'USD' ? 'USD' : 'PEN';
    return (App.state[App.BANK_ACCOUNT_KEY]||[]).reduce((s,t)=> (t.bankCode===code && (t.currency||'PEN')===currency) ? s + (t.type==='ingreso'? t.amount : -t.amount) : s, 0);
  };
  // Saldo acumulado de un banco hasta el cierre de un mes dado (ej. '2026-07').
  App.bankBalanceAtMonthEnd = function(code, mk){
    return (App.state[App.BANK_ACCOUNT_KEY]||[]).reduce((s,t)=>{
      if(t.bankCode !== code) return s;
      if((t.currency||'PEN') !== 'PEN') return s;
      if(App.monthKey(t.date) > mk) return s;
      return s + (t.type==='ingreso'? t.amount : -t.amount);
    }, 0);
  };
  // Solo los bancos que ya tienen al menos un movimiento registrado en esa moneda
  // (para no mostrar en transferencias bancos que nunca se usaron con esa moneda).
  App.usedBankCodes = function(currency){
    currency = currency === 'USD' ? 'USD' : 'PEN';
    const set = new Set();
    (App.state[App.BANK_ACCOUNT_KEY]||[]).forEach(t=>{ if(t.bankCode && (t.currency||'PEN')===currency) set.add(t.bankCode); });
    return App.BANKS.filter(b=>set.has(b.code));
  };
  // Lista unificada de "cuentas transferibles" para una moneda dada: las cuentas
  // normales, y la cuenta "Banco / Ahorros" desglosada en sus bancos ya utilizados.
  App.transferEndpoints = function(currency){
    currency = currency === 'USD' ? 'USD' : 'PEN';
    const list = [];
    Object.entries(App.ACCOUNTS).forEach(([k,acc])=>{
      if(k === App.BANK_ACCOUNT_KEY){
        App.usedBankCodes(currency).forEach(b=>{
          list.push({ key:`${k}:${b.code}`, label:`${acc.label} - ${b.label}`, balance: App.bankBalance(b.code, currency) });
        });
      }else{
        list.push({ key:k, label:acc.label, balance: App.balance(k, currency) });
      }
    });
    return list;
  };
  App.resolveEndpointBalance = function(key, currency){
    currency = currency === 'USD' ? 'USD' : 'PEN';
    if(key.indexOf(App.BANK_ACCOUNT_KEY+':') === 0){
      return App.bankBalance(key.split(':')[1], currency);
    }
    return App.balance(key, currency);
  };

  // Elimina un movimiento. Si pertenece a una transferencia (transferId),
  // elimina ambas piernas (origen y destino) para no descuadrar el patrimonio.
  App.deleteTxn = async function(key, id){
    const txn = (App.state[key]||[]).find(t=>t.id===id);
    if(!txn) return;
    const isTransfer = !!txn.transferId;
    const msg = isTransfer
      ? 'Este movimiento es parte de una transferencia. Se eliminaran ambas piernas (cuenta origen y destino). Esta accion no se puede deshacer.'
      : 'Eliminar este movimiento? Esta accion no se puede deshacer.';
    const ok = await App.confirmModal(msg, { title:'Eliminar movimiento', danger:true, confirmText:'Eliminar' });
    if(!ok) return;

    if(isTransfer){
      App.allKeys().forEach(k=>{
        App.state[k] = App.state[k].filter(t=> t.transferId !== txn.transferId);
      });
      App.audit('Eliminacion', `Transferencia ${txn.transferId}`);
    }else{
      App.state[key] = App.state[key].filter(t=>t.id!==id);
      App.audit('Eliminacion', `${key}:${id}`);
    }
    await App.saveState();
    App.render();
  };
  App.notify = function(message, isError){
    const el = document.getElementById('statusMsg');
    if(!el) return;
    el.textContent = message;
    el.classList.toggle('bad', !!isError);
    el.classList.add('show');
    clearTimeout(App.notifyTimer);
    App.notifyTimer = setTimeout(()=>{ el.classList.remove('show'); }, 3200);
  };

  // Modal de confirmacion reutilizable. Devuelve una Promise<boolean>.
  // opts: { title, confirmText, danger, requireText }
  // Si se pasa requireText, el boton de confirmar queda deshabilitado
  // hasta que el usuario escriba exactamente ese texto (para acciones muy destructivas).
  App.confirmModal = function(message, opts){
    opts = opts || {};
    return new Promise(resolve=>{
      const overlay = document.getElementById('confirmOverlay');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      const input = document.getElementById('confirmInput');
      document.getElementById('confirmTitle').textContent = opts.title || 'Confirmar accion';
      document.getElementById('confirmMsg').textContent = message;
      okBtn.textContent = opts.confirmText || 'Confirmar';
      okBtn.classList.toggle('danger-btn', !!opts.danger);

      if(opts.requireText){
        input.style.display = 'block';
        input.value = '';
        input.placeholder = `Escribe "${opts.requireText}" para confirmar`;
        okBtn.disabled = true;
        input.oninput = ()=>{ okBtn.disabled = input.value.trim() !== opts.requireText; };
      }else{
        input.style.display = 'none';
        input.oninput = null;
        okBtn.disabled = false;
      }

      function cleanup(result){
        overlay.classList.remove('show');
        okBtn.onclick = null; cancelBtn.onclick = null; input.oninput = null;
        resolve(result);
      }
      okBtn.onclick = ()=> cleanup(true);
      cancelBtn.onclick = ()=> cleanup(false);
      overlay.classList.add('show');
      setTimeout(()=>{ (opts.requireText ? input : okBtn).focus(); }, 30);
    });
  };
  App.audit = function(action, detail){
    App.state.auditLog = Array.isArray(App.state.auditLog) ? App.state.auditLog : [];
    App.state.auditLog.push({ action, detail: detail || '', ts: new Date().toISOString() });
  };
  App.downloadBlob = function(blob, fileName){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  };
})();

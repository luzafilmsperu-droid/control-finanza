(function(){
  const App = window.App;

  App.renderOverview = function(){
    const total = App.totalPatrimonio();
    document.getElementById('totalAmount').textContent = App.fmt(total);
    const count = App.allKeys().reduce((s,k)=>s+App.state[k].length,0);
    document.getElementById('totalDelta').textContent = count + ' movimiento' + (count===1?'':'s') + ' registrado' + (count===1?'':'s') + ' en total';

    const legend = document.getElementById('legend');
    legend.innerHTML = '';
    Object.entries(App.ACCOUNTS).forEach(([k,acc])=>{
      const bal = App.balance(k);
      const pct = total>0 ? Math.round((bal/total)*100) : 0;
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<span class="dot" style="background:${acc.hex}"></span><b>${acc.label}</b> <span class="pct">${App.fmt(bal)} &middot; ${pct}%</span>`;
      legend.appendChild(item);
    });

    const pctLibre = total>0 ? Math.min(100, Math.round((App.liquidez()/total)*100)) : 0;
    document.getElementById('gaugeValue').textContent = pctLibre + '%';
    App.drawGauge(pctLibre);
  };

  App.drawGauge = function(pct){
    const svg = document.getElementById('gaugeSvg');
    const r = 60, cx=75, cy=75;
    const startAngle = -220, arcSpan = 260;
    const filled = (pct/100)*arcSpan;
    function arcPath(startDeg, endDeg){
      const toRad = d => (d-90)*Math.PI/180;
      const x1 = cx + r*Math.cos(toRad(startDeg)), y1 = cy + r*Math.sin(toRad(startDeg));
      const x2 = cx + r*Math.cos(toRad(endDeg)), y2 = cy + r*Math.sin(toRad(endDeg));
      const largeArc = (endDeg-startDeg) > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    }
    svg.innerHTML = `
      <path d="${arcPath(startAngle, startAngle+arcSpan)}" fill="none" stroke="#234B43" stroke-width="10" stroke-linecap="round"/>
      <path d="${arcPath(startAngle, startAngle+filled)}" fill="none" stroke="#6E9BC9" stroke-width="10" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="4" fill="#E8C766"/>`;
  };

  App.txnRowHtml = function(t, key, isGasto){
    const amtClass = isGasto ? 'out' : (t.type==='ingreso'?'in':'out');
    const amtPrefix = isGasto ? '-' : (t.type==='ingreso'?'+':'-');
    const category = t.category ? ` &middot; ${App.escapeHtml(t.category)}` : '';
    const bank = t.bankCode ? App.BANKS.find(b=>b.code===t.bankCode) : null;
    const bankTag = bank ? ` &middot; ${App.escapeHtml(bank.label)}` : '';
    const currencyTag = t.currency === 'USD' ? ' &middot; US$' : '';
    const label = t.note || (isGasto?'Gasto':(t.type==='ingreso'?'Ingreso':'Retiro'));
    const symbol = t.currency === 'USD' ? 'US$' : 'S/';
    const amountText = Math.abs(t.amount).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
    return `
      <div class="txn-row" data-key="${key}" data-id="${t.id}">
        <div class="txn-left">
          <span class="txn-note">${App.escapeHtml(label)}</span>
          <span class="txn-date">${App.fmtDate(t.date)}${category}${bankTag}${currencyTag}</span>
        </div>
        <div class="txn-right">
          <span class="txn-amt ${amtClass}">${amtPrefix}${symbol} ${amountText}</span>
          <button class="icon-btn edit" data-action="edit" data-key="${key}" data-id="${t.id}" title="Editar" aria-label="Editar movimiento">&#9998;</button>
          <button class="icon-btn del" data-action="delete" data-key="${key}" data-id="${t.id}" title="Eliminar" aria-label="Eliminar movimiento">&times;</button>
        </div>
      </div>`;
  };

  App.renderAccounts = function(){
    const keys = Object.keys(App.ACCOUNTS).filter(k => k !== App.MONTHLY_ACCOUNT);
    App.renderAccountCards('accountsGrid', keys);
  };

  App.renderScotibankAccount = function(){
    App.renderAccountCards('scotibankGrid', [App.MONTHLY_ACCOUNT]);
    // El titulo de seccion queda siempre fijo como "Cuenta Operativa";
    // solo el nombre dentro de la tarjeta cambia al banco configurado.
    const titleEl = document.getElementById('operativaSectionTitle');
    if(titleEl) titleEl.textContent = 'Cuenta Operativa';
  };

  App.bankLegendHtml = function(){
    const used = App.usedBankCodes();
    if(!used.length) return '';
    return `<div class="legend bank-legend">${used.map(b=>{
      const bal = App.bankBalance(b.code);
      return `<div class="legend-item"><b>${App.escapeHtml(b.label)}</b> <span class="pct">${App.fmt(bal)}</span></div>`;
    }).join('')}</div>`;
  };

  App.renderAccountCards = function(containerId, keys){
    const grid = document.getElementById(containerId);
    if(!grid) return;
    grid.innerHTML = '';
    keys.forEach(key=>{
      const acc = App.ACCOUNTS[key];
      if(!acc) return;
      const bal = App.balance(key, 'PEN');
      const balUSD = App.balance(key, 'USD');
      const all = [...App.state[key]].sort((a,b)=> b.date.localeCompare(a.date));
      const editTxn = App.editing[key] ? App.state[key].find(t=>t.id===App.editing[key]) : null;
      const isTransferEdit = !!(editTxn && editTxn.transferId);
      const isBankAccount = key === App.BANK_ACCOUNT_KEY;
      const isOperativa = key === App.MONTHLY_ACCOUNT;
      const operativaBankCode = App.state.cuentaOperativaBanco;
      const bankFieldHtml = (isBankAccount || isOperativa) ? `<div class="full">
          <label>Banco</label>
          <select id="bank-${key}" ${isTransferEdit?'disabled':''}>
            <option value="" disabled ${(isOperativa ? !operativaBankCode : (!editTxn || !editTxn.bankCode)) ? 'selected':''}>Selecciona un banco</option>
            ${App.BANKS.map(b=>{
              const isSelected = isOperativa ? operativaBankCode===b.code : (editTxn && editTxn.bankCode===b.code);
              return `<option value="${b.code}" ${isSelected ? 'selected':''}>${b.label}</option>`;
            }).join('')}
          </select>
          ${isOperativa ? '<p class="empty-txn" style="margin-top:6px;">Banco de tu Cuenta Operativa. Puedes cambiarlo aqui si te equivocaste.</p>' : ''}
        </div>` : '';
      const bankLegendHtml = isBankAccount ? App.bankLegendHtml() : '';
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-top"><div class="card-name"><span class="dot" style="background:${acc.hex}"></span>${acc.label}</div></div>
        <div class="card-balance" style="color:${acc.hex}">${App.fmt(bal,'PEN')}</div>
        ${balUSD ? `<div class="card-balance-usd">${App.fmt(balUSD,'USD')}</div>` : ''}
        ${bankLegendHtml}
        <div class="card-actions">
          <button class="btn primary" data-action="toggle-ingreso" data-key="${key}">+ Ingreso</button>
          <button class="btn" data-action="toggle-retiro" data-key="${key}">&minus; Retiro</button>
        </div>
        <div class="mini-form" id="form-${key}">
          ${isTransferEdit ? '<div class="full transfer-hint">Este movimiento pertenece a una transferencia. El monto, fecha y nota se sincronizaran automaticamente en la cuenta destino.</div>' : ''}
          <div><label>Tipo</label><select id="type-${key}" ${isTransferEdit?'disabled':''}><option value="ingreso" ${editTxn && editTxn.type==='ingreso' ? 'selected':''}>Ingreso</option><option value="retiro" ${editTxn && editTxn.type==='retiro' ? 'selected':''}>Retiro</option></select></div>
          <div><label>Moneda</label><select id="currency-${key}" ${isTransferEdit?'disabled':''}>
            <option value="PEN" ${(!editTxn || (editTxn.currency||'PEN')==='PEN') ? 'selected':''}>Soles (S/)</option>
            <option value="USD" ${editTxn && editTxn.currency==='USD' ? 'selected':''}>Dolares (US$)</option>
          </select></div>
          ${bankFieldHtml}
          <div><label>Monto</label><input type="number" step="0.01" min="0" id="amount-${key}" placeholder="0.00" value="${editTxn ? editTxn.amount : ''}"></div>
          <div><label>Fecha</label><input type="date" id="date-${key}" value="${editTxn ? editTxn.date : App.todayStr()}"></div>
          <div class="full"><label>Nota</label><input type="text" id="note-${key}" placeholder="Ej: transferencia desde BCP" value="${App.escapeHtml(editTxn ? (editTxn.note||'') : '')}"></div>
          <div class="row-btns"><button class="btn small" data-action="cancel" data-key="${key}">Cancelar</button><button class="btn small primary" data-action="save" data-key="${key}">${editTxn ? 'Actualizar' : 'Guardar'}</button></div>
        </div>
        <div class="txn-list" id="list-${key}">${all.length ? all.map(t=>App.txnRowHtml(t,key,false)).join('') : '<div class="empty-txn">Sin movimientos aun.</div>'}</div>`;
      grid.appendChild(card);
      if(editTxn) card.querySelector('.mini-form').classList.add('open');
    });
    App.bindAccountEvents(grid);
  };

  App.renderGastos = function(){
    const grid = document.getElementById('gastosGrid');
    grid.innerHTML = '';
    Object.entries(App.GASTOS).forEach(([key,acc])=>{
      const total = App.gastoTotal(key,'PEN');
      const totalUSD = App.gastoTotal(key,'USD');
      const all = [...App.state[key]].sort((a,b)=> b.date.localeCompare(a.date));
      const editTxn = App.editing[key] ? App.state[key].find(t=>t.id===App.editing[key]) : null;
      const options = App.CATEGORIES.map(c=>`<option value="${c}" ${editTxn && editTxn.category===c ? 'selected':''}>${c}</option>`).join('');
      const card = document.createElement('div');
      card.className = 'card gasto-card';
      card.innerHTML = `
        <div class="card-top"><div class="card-name"><span class="dot" style="background:${acc.hex}"></span>${acc.label}</div></div>
        <div class="card-balance" style="color:${acc.hex}">${App.fmt(total,'PEN')}</div>
        ${totalUSD ? `<div class="card-balance-usd">${App.fmt(totalUSD,'USD')}</div>` : ''}
        <div class="card-actions"><button class="btn primary" data-action="toggle-gasto" data-key="${key}">+ Registrar gasto</button></div>
        <div class="mini-form" id="form-${key}">
          <div><label>Monto</label><input type="number" step="0.01" min="0" id="amount-${key}" placeholder="0.00" value="${editTxn ? editTxn.amount : ''}"></div>
          <div><label>Moneda</label><select id="currency-${key}">
            <option value="PEN" ${(!editTxn || (editTxn.currency||'PEN')==='PEN') ? 'selected':''}>Soles (S/)</option>
            <option value="USD" ${editTxn && editTxn.currency==='USD' ? 'selected':''}>Dolares (US$)</option>
          </select></div>
          <div><label>Fecha</label><input type="date" id="date-${key}" value="${editTxn ? editTxn.date : App.todayStr()}"></div>
          <div><label>Categoria</label><select id="category-${key}">${options}</select></div>
          <div class="full"><label>Detalle</label><input type="text" id="note-${key}" placeholder="Ej: alquiler, luz, super..." value="${App.escapeHtml(editTxn ? (editTxn.note||'') : '')}"></div>
          <div class="row-btns"><button class="btn small" data-action="cancel" data-key="${key}">Cancelar</button><button class="btn small primary" data-action="save-gasto" data-key="${key}">${editTxn ? 'Actualizar' : 'Guardar'}</button></div>
        </div>
        <div class="txn-list" id="list-${key}">${all.length ? all.map(t=>App.txnRowHtml(t,key,true)).join('') : '<div class="empty-txn">Sin gastos registrados.</div>'}</div>`;
      grid.appendChild(card);
      if(editTxn) card.querySelector('.mini-form').classList.add('open');
    });
    App.renderProgramados();
    App.bindAccountEvents(grid);
  };

  App.renderProgramados = function(){
    const key = App.PROGRAMADOS_KEY;
    const grid = document.getElementById('gastosGrid');
    if(!grid) return;
    const list = [...App.state[key]].sort((a,b)=> a.date.localeCompare(b.date));
    const totalPEN = list.filter(t=>(t.currency||'PEN')==='PEN').reduce((s,t)=>s+t.amount,0);
    const totalUSD = list.filter(t=>t.currency==='USD').reduce((s,t)=>s+t.amount,0);
    const editTxn = App.editing[key] ? App.state[key].find(t=>t.id===App.editing[key]) : null;
    const catOptions = App.CATEGORIES.map(c=>`<option value="${c}" ${editTxn && editTxn.category===c ? 'selected':''}>${c}</option>`).join('');
    const card = document.createElement('div');
    card.className = 'card gasto-card programado-card';
    card.innerHTML = `
      <div class="card-top"><div class="card-name"><span class="dot" style="background:#D9A441"></span>Gastos Programados</div></div>
      <div class="card-balance" style="color:#D9A441">${App.fmt(totalPEN,'PEN')}</div>
      ${totalUSD ? `<div class="card-balance-usd">${App.fmt(totalUSD,'USD')}</div>` : ''}
      <div class="card-actions"><button class="btn primary" data-action="toggle-programado" data-key="${key}">+ Programar gasto</button></div>
      <div class="mini-form" id="form-${key}">
        <div><label>Monto</label><input type="number" step="0.01" min="0" id="amount-${key}" placeholder="0.00" value="${editTxn ? editTxn.amount : ''}"></div>
        <div><label>Moneda</label><select id="currency-${key}">
          <option value="PEN" ${(!editTxn || (editTxn.currency||'PEN')==='PEN') ? 'selected':''}>Soles (S/)</option>
          <option value="USD" ${editTxn && editTxn.currency==='USD' ? 'selected':''}>Dolares (US$)</option>
        </select></div>
        <div><label>Fecha de vencimiento</label><input type="date" id="date-${key}" value="${editTxn ? editTxn.date : App.todayStr()}"></div>
        <div><label>Categoria</label><select id="category-${key}">${catOptions}</select></div>
        <div class="full"><label>Al pagarse, pasa a</label><select id="target-${key}">
          <option value="gastosFijos" ${editTxn && editTxn.targetType==='gastosFijos' ? 'selected':''}>Gasto Fijo</option>
          <option value="gastosVariables" ${editTxn && editTxn.targetType==='gastosVariables' ? 'selected':''}>Gasto Variable</option>
        </select></div>
        <div class="full"><label>Detalle</label><input type="text" id="note-${key}" placeholder="Ej: alquiler de auto" value="${App.escapeHtml(editTxn ? (editTxn.note||'') : '')}"></div>
        <div class="row-btns"><button class="btn small" data-action="cancel" data-key="${key}">Cancelar</button><button class="btn small primary" data-action="save-programado" data-key="${key}">${editTxn ? 'Actualizar' : 'Guardar'}</button></div>
      </div>
      <div class="txn-list" id="list-${key}">${list.length ? list.map(t=>App.programadoRowHtml(t)).join('') : '<div class="empty-txn">Sin gastos programados.</div>'}</div>`;
    grid.appendChild(card);
    if(editTxn) card.querySelector('.mini-form').classList.add('open');
  };

  App.programadoRowHtml = function(t){
    const cat = t.category ? ` &middot; ${App.escapeHtml(t.category)}` : '';
    const target = t.targetType === 'gastosVariables' ? 'Gasto Variable' : 'Gasto Fijo';
    const symbol = t.currency === 'USD' ? 'US$' : 'S/';
    const amountText = Math.abs(t.amount).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
    const today = App.todayStr();
    const isOverdue = t.date < today;
    const isDueToday = t.date === today;
    const rowClass = isOverdue ? ' programado-overdue' : (isDueToday ? ' programado-duetoday' : '');
    const statusTag = isOverdue ? ' &middot; <span class="status-vencido">VENCIDO</span>' : (isDueToday ? ' &middot; Vence hoy' : '');
    return `
      <div class="txn-row${rowClass}" data-key="${App.PROGRAMADOS_KEY}" data-id="${t.id}">
        <div class="txn-left">
          <span class="txn-note">${App.escapeHtml(t.note || 'Gasto programado')}</span>
          <span class="txn-date">Vence ${App.fmtDate(t.date)}${cat} &middot; ${target}${statusTag}</span>
        </div>
        <div class="txn-right">
          <span class="txn-amt out">${symbol} ${amountText}</span>
          <button class="icon-btn paid" data-action="mark-paid" data-key="${App.PROGRAMADOS_KEY}" data-id="${t.id}" title="Marcar como pagado" aria-label="Marcar como pagado">&#10003;</button>
          <button class="icon-btn edit" data-action="edit" data-key="${App.PROGRAMADOS_KEY}" data-id="${t.id}" title="Editar" aria-label="Editar movimiento">&#9998;</button>
          <button class="icon-btn del" data-action="delete" data-key="${App.PROGRAMADOS_KEY}" data-id="${t.id}" title="Eliminar" aria-label="Eliminar movimiento">&times;</button>
        </div>
      </div>`;
  };

  App.bindAccountEvents = function(container){
    container.querySelectorAll('[data-action="toggle-ingreso"]').forEach(b=>b.addEventListener('click', ()=>App.openForm(b.dataset.key,'ingreso')));
    container.querySelectorAll('[data-action="toggle-retiro"]').forEach(b=>b.addEventListener('click', ()=>App.openForm(b.dataset.key,'retiro')));
    container.querySelectorAll('[data-action="toggle-gasto"]').forEach(b=>b.addEventListener('click', ()=>App.openForm(b.dataset.key,null)));
    container.querySelectorAll('[data-action="toggle-programado"]').forEach(b=>b.addEventListener('click', ()=>App.openForm(b.dataset.key,null)));
    container.querySelectorAll('[data-action="cancel"]').forEach(b=>b.addEventListener('click', ()=>{ App.editing[b.dataset.key]=null; App.closeForm(b.dataset.key); }));
    container.querySelectorAll('[data-action="save"]').forEach(b=>b.addEventListener('click', ()=>App.saveTxn(b.dataset.key)));
    container.querySelectorAll('[data-action="save-gasto"]').forEach(b=>b.addEventListener('click', ()=>App.saveGasto(b.dataset.key)));
    container.querySelectorAll('[data-action="save-programado"]').forEach(b=>b.addEventListener('click', ()=>App.saveProgramado(b.dataset.key)));
    container.querySelectorAll('[data-action="mark-paid"]').forEach(b=>b.addEventListener('click', ()=>App.markProgramadoPaid(b.dataset.id)));
    container.querySelectorAll('[data-action="edit"]').forEach(b=>b.addEventListener('click', ()=>{ App.editing[b.dataset.key]=b.dataset.id; App.render(); }));
    container.querySelectorAll('[data-action="delete"]').forEach(b=>b.addEventListener('click', ()=>{
      App.deleteTxn(b.dataset.key, b.dataset.id);
    }));
  };

  App.openForm = function(key, type){
    const form = document.getElementById('form-'+key);
    form.classList.add('open');
    if(type){ document.getElementById('type-'+key).value = type; }
  };
  App.closeForm = function(key){ const f=document.getElementById('form-'+key); if(f) f.classList.remove('open'); };

  App.saveTxn = async function(key){
    const type = document.getElementById('type-'+key).value;
    const amountInput = document.getElementById('amount-'+key);
    const amount = parseFloat(amountInput.value);
    const date = document.getElementById('date-'+key).value || App.todayStr();
    const note = document.getElementById('note-'+key).value.trim();
    const bankSelect = document.getElementById('bank-'+key);
    const bankCode = bankSelect ? bankSelect.value : null;
    const currencySelect = document.getElementById('currency-'+key);
    const currency = currencySelect ? currencySelect.value : 'PEN';
    if(!amount || amount<=0){ amountInput.style.borderColor = 'var(--bad)'; return; }
    if(bankSelect && !bankSelect.disabled && !bankCode){ bankSelect.style.borderColor = 'var(--bad)'; return; }
    if(key === App.MONTHLY_ACCOUNT && bankSelect && bankCode){
      App.setCuentaOperativaBanco(bankCode);
    }
    if(App.editing[key]){
      const t = App.state[key].find(t=>t.id===App.editing[key]);
      if(t){
        if(t.transferId){
          t.amount=amount; t.date=date; t.note=note;
          App.allKeys().forEach(k=>{
            if(k===key) return;
            const paired = App.state[k].find(x=>x.transferId===t.transferId);
            if(paired){ paired.amount=amount; paired.date=date; paired.note=note; }
          });
        }else{
          t.type=type; t.amount=amount; t.date=date; t.note=note;
          if(bankSelect && key !== App.MONTHLY_ACCOUNT) t.bankCode = bankCode;
          if(currencySelect) t.currency = currency;
        }
      }
      App.audit('Edicion', `${key}:${App.editing[key]}`);
      App.editing[key]=null;
    }else{
      App.state[key].push({ id: App.uid(), type, amount, date, note, category: '', bankCode: (bankSelect && key !== App.MONTHLY_ACCOUNT) ? bankCode : null, currency });
      App.audit('Creacion', `${key}:${type}:${amount}`);
    }
    App.closeForm(key);
    await App.saveState();
    App.render();
  };

  App.saveGasto = async function(key){
    const amountInput = document.getElementById('amount-'+key);
    const amount = parseFloat(amountInput.value);
    const date = document.getElementById('date-'+key).value || App.todayStr();
    const note = document.getElementById('note-'+key).value.trim();
    const category = document.getElementById('category-'+key).value || 'Otros';
    const currencySelect = document.getElementById('currency-'+key);
    const currency = currencySelect ? currencySelect.value : 'PEN';
    if(!amount || amount<=0){ amountInput.style.borderColor = 'var(--bad)'; return; }
    if(App.editing[key]){
      const t = App.state[key].find(t=>t.id===App.editing[key]);
      if(t){ t.amount=amount; t.date=date; t.note=note; t.category=category; t.currency=currency; }
      App.audit('Edicion', `${key}:${App.editing[key]}`);
      App.editing[key]=null;
    }else{
      App.state[key].push({ id: App.uid(), amount, date, note, category, currency });
      App.audit('Creacion', `${key}:${category}:${amount}`);
    }
    App.closeForm(key);
    await App.saveState();
    App.render();
  };

  App.saveProgramado = async function(key){
    const amountInput = document.getElementById('amount-'+key);
    const amount = parseFloat(amountInput.value);
    const date = document.getElementById('date-'+key).value || App.todayStr();
    const note = document.getElementById('note-'+key).value.trim();
    const category = document.getElementById('category-'+key).value || 'Otros';
    const currency = document.getElementById('currency-'+key).value === 'USD' ? 'USD' : 'PEN';
    const targetType = document.getElementById('target-'+key).value === 'gastosVariables' ? 'gastosVariables' : 'gastosFijos';
    if(!amount || amount<=0){ amountInput.style.borderColor = 'var(--bad)'; return; }
    if(App.editing[key]){
      const t = App.state[key].find(t=>t.id===App.editing[key]);
      if(t){ t.amount=amount; t.date=date; t.note=note; t.category=category; t.currency=currency; t.targetType=targetType; }
      App.audit('Edicion', `${key}:${App.editing[key]}`);
      App.editing[key]=null;
    }else{
      App.state[key].push({ id: App.uid(), amount, date, note, category, currency, targetType });
      App.audit('Creacion', `${key}:${category}:${amount}`);
    }
    App.closeForm(key);
    await App.saveState();
    App.render();
  };

  App.markProgramadoPaid = async function(id){
    const key = App.PROGRAMADOS_KEY;
    const idx = App.state[key].findIndex(t=>t.id===id);
    if(idx<0) return;
    const item = App.state[key][idx];
    const destLabel = item.targetType === 'gastosVariables' ? 'Gastos Variables' : 'Gastos Fijos';
    const ok = await App.confirmModal(
      `Se movera "${item.note || 'este gasto'}" (${App.fmt(item.amount, item.currency)}) a ${destLabel} con fecha de hoy. Continuar?`,
      { title:'Marcar como pagado', confirmText:'Marcar como pagado' }
    );
    if(!ok) return;
    App.state[key].splice(idx,1);
    App.state[item.targetType].push({ id: App.uid(), amount:item.amount, date: App.todayStr(), note:item.note, category:item.category, currency:item.currency||'PEN' });
    App.audit('Edicion', `Gasto programado pagado: ${item.note||''}`);
    await App.saveState();
    App.render();
  };

  App.renderTransferPanel = function(currency){
    currency = (currency === 'USD') ? 'USD' : (App.transferCurrency || 'PEN');
    App.transferCurrency = currency;
    const endpoints = App.transferEndpoints(currency);
    const sel = endpoints.map(e=>`<option value="${e.key}">${e.label}</option>`).join('');
    const monedaLabel = currency === 'USD' ? 'Dolares' : 'Soles';
    const empty = endpoints.length < 2 ? `<p class="empty-txn">Registra al menos un ingreso en dos cuentas (o bancos) distintos en ${monedaLabel} para poder transferir.</p>` : '';
    document.getElementById('transferPanel').innerHTML = `
      <div class="mini-form open">
        <div class="full transfer-hint">Solo se puede transferir desde una cuenta o banco que ya tenga saldo a favor en la moneda elegida.</div>
        <div><label>Moneda</label><select id="transferCurrency">
          <option value="PEN" ${currency==='PEN'?'selected':''}>Soles (S/)</option>
          <option value="USD" ${currency==='USD'?'selected':''}>Dolares (US$)</option>
        </select></div>
        <div><label>Monto</label><input type="number" step="0.01" min="0" id="transferAmount" placeholder="0.00"></div>
        <div><label>Cuenta origen</label><select id="transferFrom">${sel}</select></div>
        <div><label>Cuenta destino</label><select id="transferTo">${sel}</select></div>
        <div><label>Fecha</label><input type="date" id="transferDate" value="${App.todayStr()}"></div>
        <div class="full"><label>Comentario</label><input type="text" id="transferNote" placeholder="Ej: movimiento entre cuentas"></div>
        <div class="row-btns"><button class="btn small primary" id="saveTransferBtn">Transferir</button></div>
      </div>
      ${empty}`;
    document.getElementById('saveTransferBtn').addEventListener('click', App.saveTransfer);
    document.getElementById('transferCurrency').addEventListener('change', (e)=> App.renderTransferPanel(e.target.value));
  };

  App.saveTransfer = async function(){
    const currency = document.getElementById('transferCurrency').value === 'USD' ? 'USD' : 'PEN';
    const fromKey = document.getElementById('transferFrom').value;
    const toKey = document.getElementById('transferTo').value;
    const amountInput = document.getElementById('transferAmount');
    const amount = parseFloat(amountInput.value);
    const date = document.getElementById('transferDate').value || App.todayStr();
    const note = document.getElementById('transferNote').value.trim();

    if(fromKey === toKey){ App.notify('La cuenta origen y destino deben ser distintas.', true); return; }
    if(!amount || amount <= 0){ amountInput.style.borderColor = 'var(--bad)'; return; }

    const fromBalance = App.resolveEndpointBalance(fromKey, currency);
    if(amount > fromBalance){
      App.notify('Saldo insuficiente en la cuenta de origen para esta transferencia.', true);
      return;
    }

    const endpoints = App.transferEndpoints(currency);
    const fromLabel = (endpoints.find(e=>e.key===fromKey)||{}).label || fromKey;
    const toLabel = (endpoints.find(e=>e.key===toKey)||{}).label || toKey;
    const comment = note || `Transferencia ${fromLabel} a ${toLabel}`;
    const transferId = App.uid();

    function pushLeg(endpointKey, type){
      if(endpointKey.indexOf(App.BANK_ACCOUNT_KEY+':') === 0){
        const bankCode = endpointKey.split(':')[1];
        App.state[App.BANK_ACCOUNT_KEY].push({ id:App.uid(), type, amount, date, note:comment, category:'', bankCode, currency, transferId });
      }else{
        App.state[endpointKey].push({ id:App.uid(), type, amount, date, note:comment, category:'', bankCode:null, currency, transferId });
      }
    }
    pushLeg(fromKey, 'retiro');
    pushLeg(toKey, 'ingreso');

    App.audit('Creacion', `Transferencia ${fromLabel} -> ${toLabel}: ${App.fmt(amount, currency)}`);
    await App.saveState();
    App.render();
    App.notify('Transferencia registrada correctamente.');
  };
})();

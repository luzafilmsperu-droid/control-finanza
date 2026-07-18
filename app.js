(function(){
  const App = window.App;
  App.charts = {};

  App.renderCharts = function(){
    if(!window.Chart){
      if(!App.chartWarningShown){
        App.chartWarningShown = true;
        App.notify('Chart.js no esta disponible. Revisa tu conexion para ver los graficos.', true);
      }
      return;
    }
    Object.values(App.charts).forEach(ch => ch && ch.destroy());
    App.charts = {};
    App.renderPieChart();
    App.renderBarChart();
    App.renderLineChart();
  };

  App.renderPieChart = function(){
    const labels = Object.values(App.ACCOUNTS).map(a=>a.label);
    const data = Object.keys(App.ACCOUNTS).map(k=>Math.max(App.balance(k),0));
    const colors = Object.values(App.ACCOUNTS).map(a=>a.hex);
    App.charts.pie = new Chart(document.getElementById('patrimonioPie'), {
      type:'pie',
      data:{labels,datasets:[{data,backgroundColor:colors,borderColor:'#10302A'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#F2EFE6'}}}}
    });
  };

  App.renderBarChart = function(){
    const months = App.allMonthlyData();
    const keys = Object.keys(months).sort().slice(-12);
    const data = keys.map(k=>{
      const m = months[k];
      return m.ingresos - m.retiros - m.fijos - m.variables;
    });
    App.charts.bar = new Chart(document.getElementById('resultadoBar'), {
      type:'bar',
      data:{labels:keys.map(App.monthLabel),datasets:[{label:'Resultado mensual',data,backgroundColor:data.map(v=>v>=0?'#4FA98C':'#C1553D')}]},
      options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:'#93AFA6'},grid:{color:'#234B43'}},y:{ticks:{color:'#93AFA6'},grid:{color:'#234B43'}}},plugins:{legend:{labels:{color:'#F2EFE6'}}}}
    });
  };

  App.renderLineChart = function(){
    const rows = App.collectLedgerRows().slice().sort((a,b)=>a.date.localeCompare(b.date));
    let running = 0;
    const points = rows.map(r=>{
      running += r.isGasto || r.type === 'retiro' ? -r.amount : r.amount;
      return {x:r.date, y:running};
    });
    App.charts.line = new Chart(document.getElementById('evolucionLine'), {
      type:'line',
      data:{labels:points.map(p=>p.x),datasets:[{label:'Evolucion del patrimonio',data:points.map(p=>p.y),borderColor:'#E8C766',backgroundColor:'rgba(232,199,102,.12)',tension:.25,fill:true}]},
      options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:'#93AFA6',maxRotation:0,autoSkip:true},grid:{color:'#234B43'}},y:{ticks:{color:'#93AFA6'},grid:{color:'#234B43'}}},plugins:{legend:{labels:{color:'#F2EFE6'}}}}
    });
  };

  // ---- Distribucion de gastos (Ejecutado vs Proyectado) ----
  App.gastoChartTab = App.gastoChartTab || 'ejecutado';
  App.gastoChartPeriod = App.gastoChartPeriod || 'month';

  App.bindGastoChartTabs = function(){
    document.querySelectorAll('.chart-tab-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.chart-tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
        App.gastoChartTab = btn.dataset.chartTab;
        App.renderGastoDistChart();
      });
    });
    const periodSel = document.getElementById('gastoChartPeriod');
    if(periodSel){
      periodSel.addEventListener('change', ()=>{
        App.gastoChartPeriod = periodSel.value;
        App.renderGastoDistChart();
      });
    }
  };

  App.gastoChartRange = function(){
    const now = new Date();
    const thisMk = App.todayStr().slice(0,7);
    const period = App.gastoChartPeriod;
    if(period === 'last3'){
      const d = new Date(now.getFullYear(), now.getMonth()-2, 1);
      return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, to: thisMk };
    }
    if(period === 'last6'){
      const d = new Date(now.getFullYear(), now.getMonth()-5, 1);
      return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, to: thisMk };
    }
    if(period === 'year'){ return { from: `${now.getFullYear()}-01`, to: `${now.getFullYear()}-12` }; }
    return { from: thisMk, to: thisMk };
  };

  App.renderGastoDistChart = function(){
    if(!window.Chart) return;
    const canvas = document.getElementById('gastoDistChart');
    if(!canvas) return;
    App.charts = App.charts || {};
    if(App.charts.gastoDist) App.charts.gastoDist.destroy();

    const { from, to } = App.gastoChartRange();
    const months = App.monthsBetween(from, to);
    const today = App.todayStr();

    const perCategory = {};
    let fijoTotal = 0, variableTotal = 0;

    App.state.gastosFijos.forEach(t=>{
      if((t.currency||'PEN') !== 'PEN') return;
      if(months.indexOf(App.monthKey(t.date)) < 0) return;
      const cat = t.category || 'Otros';
      perCategory[cat] = (perCategory[cat]||0) + t.amount;
      fijoTotal += t.amount;
    });
    App.state.gastosVariables.forEach(t=>{
      if((t.currency||'PEN') !== 'PEN') return;
      if(months.indexOf(App.monthKey(t.date)) < 0) return;
      const cat = t.category || 'Otros';
      perCategory[cat] = (perCategory[cat]||0) + t.amount;
      variableTotal += t.amount;
    });

    if(App.gastoChartTab === 'proyectado'){
      (App.state[App.PROGRAMADOS_KEY]||[]).forEach(t=>{
        if((t.currency||'PEN') !== 'PEN') return;
        if(months.indexOf(App.monthKey(t.date)) < 0) return;
        if(t.date < today) return; // no considerar lo vencido
        const cat = t.category || 'Otros';
        perCategory[cat] = (perCategory[cat]||0) + t.amount;
        if(t.targetType === 'gastosVariables') variableTotal += t.amount; else fijoTotal += t.amount;
      });
    }

    const entries = Object.entries(perCategory).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    const total = entries.reduce((s,[,v])=>s+v,0);
    const colors = entries.map(([c])=> App.CATEGORY_COLORS[c] || '#93AFA6');
    const label = App.gastoChartTab === 'proyectado' ? 'Proyectado' : 'Ejecutado';

    App.charts.gastoDist = new Chart(canvas, {
      type:'pie',
      data:{
        labels: entries.map(([c])=>c),
        datasets:[{ data: entries.map(([,v])=>v), backgroundColor: colors, borderColor:'#10302A', borderWidth:2 }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{
            callbacks:{
              label: function(ctx){
                const val = ctx.parsed;
                const pct = total>0 ? (val/total*100) : 0;
                return `${ctx.label}: ${App.fmt(val)} (${pct.toFixed(1)}%)`;
              }
            }
          },
          datalabels: {
            color: '#fff',
            font: { weight: '600', size: 12 },
            formatter: function(value){
              const pct = total>0 ? (value/total*100) : 0;
              return pct >= 5 ? pct.toFixed(0)+'%' : '';
            }
          }
        }
      },
      plugins: window.ChartDataLabels ? [window.ChartDataLabels] : []
    });

    const legendEl = document.getElementById('gastoDistLegend');
    if(legendEl){
      const catRows = entries.length ? entries.map(([c,v])=>{
        const pct = total>0 ? (v/total*100) : 0;
        return `<div class="legend-item"><span class="dot" style="background:${App.CATEGORY_COLORS[c]||'#93AFA6'}"></span><b>${App.escapeHtml(c)}</b><span class="pct">${App.fmt(v)} &middot; ${pct.toFixed(1)}%</span></div>`;
      }).join('') : '<div class="legend-item">Sin gastos en este periodo.</div>';
      legendEl.innerHTML = `
        <div class="gasto-cat-legend">${catRows}</div>
        <div class="gasto-fv-summary">
          <div class="legend-item"><b>Gasto Fijo</b><span class="pct">${App.fmt(fijoTotal)}</span></div>
          <div class="legend-item"><b>Gasto Variable</b><span class="pct">${App.fmt(variableTotal)}</span></div>
          <div class="legend-item"><b>Total ${label.toLowerCase()}</b><span class="pct">${App.fmt(total)}</span></div>
        </div>`;
    }
  };
})();

(function(){
  const App = window.App;

  App.render = function(){
    App.renderOverview();
    App.renderMainTotals();
    App.renderScotibankAccount();
    App.renderAccounts();
    App.renderGastos();
    App.renderTransferPanel();
    App.renderMonthHighlight();
    App.renderGastoDistChart();
    App.renderMonthlyTable();
    App.renderLedger();
    App.renderCharts();
    App.renderAudit();
    App.renderSaveLog();
  };

  App.switchView = function(viewId){
    document.querySelectorAll('.app-view').forEach(view => view.classList.toggle('active', view.id === viewId));
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.viewTarget === viewId));
    if(viewId === 'reportsView'){
      setTimeout(App.renderCharts, 0);
    }
    if(viewId === 'monthlyView'){
      setTimeout(App.renderGastoDistChart, 0);
    }
  };

  App.bindGlobalEvents = function(){
    document.querySelectorAll('.menu-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>App.switchView(btn.dataset.viewTarget));
    });
    App.bindGastoChartTabs();
    document.getElementById('saveBtn').addEventListener('click', App.manualSave);
    document.getElementById('excelBtn').addEventListener('click', App.exportExcel);
    document.getElementById('pdfBtn').addEventListener('click', App.exportPDF);
    document.getElementById('recoverBtn').addEventListener('click', ()=>document.getElementById('backupInput').click());
    document.getElementById('backupInput').addEventListener('change', e=>{
      App.importBackupFile(e.target.files[0]);
      e.target.value = '';
    });
    document.getElementById('resetBtn').addEventListener('click', async ()=>{
      const ok = await App.confirmModal(
        'Se borraran todos los movimientos, cuentas, gastos y el historial de guardado. Esta accion no se puede deshacer.',
        { title:'Borrar todos los datos', danger:true, confirmText:'Borrar todo', requireText:'BORRAR' }
      );
      if(!ok) return;
      Object.keys(App.ACCOUNTS).forEach(k=> App.state[k]=[]);
      Object.keys(App.GASTOS).forEach(k=> App.state[k]=[]);
      App.state.saveLog = [];
      App.audit('Eliminacion', 'Borrado completo de datos');
      await App.saveState();
      App.render();
    });
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    App.bindGlobalEvents();
    App.loadState();
  });
})();

(function(){
  const App = window.App;

  App.exportExcel = async function(){
    if(!window.XLSX){ App.notify('No se pudo cargar la libreria XLSX.', true); return; }
    const wb = XLSX.utils.book_new();
    const all = {...App.ACCOUNTS, ...App.GASTOS};
    const movements = App.collectLedgerRows().map(r=>({
      Fecha: r.date,
      Cuenta: all[r.account].label,
      Tipo: r.isGasto ? 'Gasto' : r.type,
      Monto: r.isGasto || r.type === 'retiro' ? -r.amount : r.amount,
      Detalle: r.note || '',
      Categoria: r.category || ''
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movements), 'Movimientos');

    const monthly = Object.entries(App.allMonthlyData()).sort().map(([mk,m])=>({
      Mes: App.monthLabel(mk),
      Ingresos: m.ingresos,
      Retiros: m.retiros,
      'Gastos fijos': m.fijos,
      'Gastos variables': m.variables,
      Resultado: m.ingresos - m.retiros - m.fijos - m.variables
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthly), 'Resumen mensual');

    const patrimonio = Object.entries(App.ACCOUNTS).map(([k,v])=>({ Concepto: v.label, Monto: App.balance(k) }));
    patrimonio.push({ Concepto: 'Patrimonio total', Monto: App.totalPatrimonio() });
    patrimonio.push({ Concepto: 'Liquidez', Monto: App.liquidez() });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patrimonio), 'Patrimonio');

    const fileName = `patrimonio_${App.formatStamp(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
    App.audit('Exportacion', `Excel ${fileName}`);
    await App.saveState();
    App.render();
    App.notify('Excel creado correctamente.');
  };

  App.exportPDF = async function(){
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if(!jsPDF){ App.notify('No se pudo cargar la libreria PDF.', true); return; }
    const doc = new jsPDF();
    const now = new Date();
    doc.setFontSize(18);
    doc.text('Reporte Patrimonial', 14, 18);
    doc.setFontSize(10);
    doc.text(`Fecha: ${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE')}`, 14, 26);
    doc.setFontSize(12);
    doc.text(`Patrimonio total: ${App.fmt(App.totalPatrimonio())}`, 14, 38);
    doc.text(`Liquidez: ${App.fmt(App.liquidez())}`, 14, 46);

    const monthlyRows = Object.entries(App.allMonthlyData()).sort().reverse().map(([mk,m])=>[
      App.monthLabel(mk), App.fmt(m.ingresos), App.fmt(m.retiros), App.fmt(m.fijos), App.fmt(m.variables), App.fmt(m.ingresos - m.retiros - m.fijos - m.variables)
    ]);
    doc.autoTable({startY:56,head:[['Mes','Ingresos','Retiros','G. fijos','G. variables','Resultado']],body:monthlyRows,styles:{fontSize:8},headStyles:{fillColor:[16,48,42]}});

    const movements = App.collectLedgerRows().slice(0,80).map(r=>[
      r.date, r.accountLabel, r.isGasto ? 'Gasto' : r.type, App.fmt(r.amount), r.note || ''
    ]);
    doc.autoTable({startY:doc.lastAutoTable.finalY + 10,head:[['Fecha','Cuenta','Tipo','Monto','Detalle']],body:movements,styles:{fontSize:8},headStyles:{fillColor:[16,48,42]}});

    const pages = doc.internal.getNumberOfPages();
    for(let i=1;i<=pages;i++){
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Control patrimonial - Pagina ${i} de ${pages}`, 14, 286);
    }
    const fileName = `patrimonio_${App.formatStamp(now)}.pdf`;
    doc.save(fileName);
    App.audit('Exportacion', `PDF ${fileName}`);
    await App.saveState();
    App.render();
    App.notify('PDF creado correctamente.');
  };
})();

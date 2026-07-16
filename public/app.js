const API = '/api/despesas';
let config = { categorias: [], statusOptions: [] };
let idParaExcluir = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || 'Erro na requisicao');
  }
  return res.json();
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataStr) {
  if (!dataStr) return '-';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

async function carregarConfig() {
  config = await fetchJSON(`${API}/config`);
  popularSelects();
}

function popularSelects() {
  const catSelect = $('#filtroCategoria');
  catSelect.innerHTML = '<option value="">Todas as categorias</option>';
  config.categorias.forEach(c => {
    catSelect.innerHTML += `<option value="${c}">${c}</option>`;
  });

  const catForm = $('#categoria');
  catForm.innerHTML = '';
  config.categorias.forEach(c => {
    catForm.innerHTML += `<option value="${c}">${c}</option>`;
  });

  const statusSelect = $('#filtroStatus');
  statusSelect.innerHTML = '<option value="">Todos os status</option>';
  config.statusOptions.forEach(s => {
    statusSelect.innerHTML += `<option value="${s}">${s}</option>`;
  });

  const statusForm = $('#status');
  statusForm.innerHTML = '';
  config.statusOptions.forEach(s => {
    statusForm.innerHTML += `<option value="${s}">${s}</option>`;
  });
}

async function carregarDespesas() {
  const params = new URLSearchParams();
  const busca = $('#busca').value;
  const cat = $('#filtroCategoria').value;
  const status = $('#filtroStatus').value;
  const mes = $('#filtroMes').value;
  const ano = $('#filtroAno').value;

  if (busca) params.set('busca', busca);
  if (cat) params.set('categoria', cat);
  if (status) params.set('status', status);
  if (mes) params.set('mes', mes);
  if (ano) params.set('ano', ano);

  const data = await fetchJSON(`${API}?${params.toString()}`);

  $('#totalGeral').textContent = formatarMoeda(data.resumo.total);
  $('#totalPago').textContent = formatarMoeda(data.resumo.pago);
  $('#totalPendente').textContent = formatarMoeda(data.resumo.pendente);
  $('#totalAtrasado').textContent = formatarMoeda(data.resumo.atrasado);

  const corpo = $('#corpoTabela');
  corpo.innerHTML = '';

  if (data.despesas.length === 0) {
    $('#msgVazio').style.display = 'block';
    return;
  }

  $('#msgVazio').style.display = 'none';

  data.despesas.forEach(d => {
    const statusClass = d.status.toLowerCase().replace(/ /g, '-');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.nome}</strong></td>
      <td>${d.categoria}</td>
      <td>${formatarMoeda(d.valor)}</td>
      <td>${formatarData(d.dataVencimento)}</td>
      <td>${formatarData(d.dataPagamento)}</td>
      <td><span class="status-badge status-${statusClass}">${d.status}</span></td>
      <td>
        <button class="btn-action edit" onclick="editarDespesa('${d.id}')" title="Editar">Editar</button>
        ${d.status !== 'Pago' ? `<button class="btn-action pay" onclick="marcarPago('${d.id}')" title="Marcar como pago">Pagar</button>` : ''}
        <button class="btn-action delete" onclick="confirmarExclusao('${d.id}')" title="Excluir">Excluir</button>
      </td>
    `;
    corpo.appendChild(tr);
  });
}

async function carregarResumoMensal() {
  const data = await fetchJSON(`${API}/resumo-mensal`);
  const container = $('#listaResumoMensal');
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = '<p class="msg-vazio">Nenhum dado disponivel.</p>';
    return;
  }

  data.slice(0, 12).forEach(r => {
    const [ano, mes] = r.mes.split('-');
    const nomesMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const item = document.createElement('div');
    item.className = 'resumo-item';
    item.innerHTML = `
      <div>
        <div class="label">${nomesMes[parseInt(mes) - 1]}/${ano}</div>
        <div class="sub">${r.quantidade} despesa(s) | Pago: ${formatarMoeda(r.pago)}</div>
      </div>
      <div class="valor">${formatarMoeda(r.total)}</div>
    `;
    container.appendChild(item);
  });
}

async function carregarResumoCategoria() {
  const data = await fetchJSON(`${API}/por-categoria`);
  const container = $('#listaResumoCategoria');
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = '<p class="msg-vazio">Nenhum dado disponivel.</p>';
    return;
  }

  data.forEach(r => {
    const item = document.createElement('div');
    item.className = 'resumo-item';
    item.innerHTML = `
      <div>
        <div class="label">${r.categoria}</div>
        <div class="sub">${r.quantidade} despesa(s)</div>
      </div>
      <div class="valor">${formatarMoeda(r.total)}</div>
    `;
    container.appendChild(item);
  });
}

function abrirModal(titulo = 'Nova Despesa') {
  $('#modalTitulo').textContent = titulo;
  $('#modal').style.display = 'flex';
}

function fecharModal() {
  $('#modal').style.display = 'none';
  $('#formDespesa').reset();
  $('#editId').value = '';
}

function limparFormulario() {
  $('#formDespesa').reset();
  $('#editId').value = '';
}

async function editarDespesa(id) {
  const d = await fetchJSON(`${API}/${id}`);
  $('#editId').value = d.id;
  $('#nome').value = d.nome;
  $('#categoria').value = d.categoria;
  $('#valor').value = d.valor;
  $('#dataVencimento').value = d.dataVencimento;
  $('#dataPagamento').value = d.dataPagamento || '';
  $('#status').value = d.status;
  $('#descricao').value = d.descricao || '';
  $('#recorrente').checked = d.recorrente;
  $('#frequencia').value = d.frequencia || '';
  abrirModal('Editar Despesa');
}

async function marcarPago(id) {
  await fetchJSON(`${API}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'Pago',
      dataPagamento: new Date().toISOString().split('T')[0]
    }),
  });
  carregarTudo();
}

function confirmarExclusao(id) {
  idParaExcluir = id;
  $('#modalConfirmacao').style.display = 'flex';
}

async function excluirDespesa() {
  if (!idParaExcluir) return;
  await fetchJSON(`${API}/${idParaExcluir}`, { method: 'DELETE' });
  idParaExcluir = null;
  $('#modalConfirmacao').style.display = 'none';
  carregarTudo();
}

async function carregarTudo() {
  await Promise.all([
    carregarDespesas(),
    carregarResumoMensal(),
    carregarResumoCategoria()
  ]);
}

$('#formDespesa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#editId').value;
  const body = {
    nome: $('#nome').value,
    categoria: $('#categoria').value,
    valor: $('#valor').value,
    dataVencimento: $('#dataVencimento').value,
    dataPagamento: $('#dataPagamento').value || null,
    status: $('#status').value,
    descricao: $('#descricao').value,
    recorrente: $('#recorrente').checked,
    frequencia: $('#frequencia').value || null,
  };

  if (id) {
    await fetchJSON(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  } else {
    await fetchJSON(API, { method: 'POST', body: JSON.stringify(body) });
  }

  fecharModal();
  carregarTudo();
});

$('#btnNovaDespesa').addEventListener('click', () => {
  limparFormulario();
  $('#dataVencimento').value = new Date().toISOString().split('T')[0];
  abrirModal();
});

$('#btnExportarCSV').addEventListener('click', exportarCSV);

$('#btnFecharModal').addEventListener('click', fecharModal);
$('#btnCancelar').addEventListener('click', fecharModal);

$('#btnCancelarExclusao').addEventListener('click', () => {
  $('#modalConfirmacao').style.display = 'none';
  idParaExcluir = null;
});

$('#btnConfirmarExclusao').addEventListener('click', excluirDespesa);

$('#modal').addEventListener('click', (e) => {
  if (e.target === $('#modal')) fecharModal();
});

$('#modalConfirmacao').addEventListener('click', (e) => {
  if (e.target === $('#modalConfirmacao')) {
    $('#modalConfirmacao').style.display = 'none';
    idParaExcluir = null;
  }
});

let debounceTimer;
function debounce(fn, delay = 300) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, delay);
}

function escapeCSV(valor) {
  const str = String(valor ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function exportarCSV() {
  const params = new URLSearchParams();
  const busca = $('#busca').value;
  const cat = $('#filtroCategoria').value;
  const status = $('#filtroStatus').value;
  const mes = $('#filtroMes').value;
  const ano = $('#filtroAno').value;

  if (busca) params.set('busca', busca);
  if (cat) params.set('categoria', cat);
  if (status) params.set('status', status);
  if (mes) params.set('mes', mes);
  if (ano) params.set('ano', ano);

  const data = await fetchJSON(`${API}?${params.toString()}`);

  if (data.despesas.length === 0) {
    alert('Nenhuma despesa para exportar.');
    return;
  }

  const headers = ['Nome', 'Categoria', 'Valor', 'Data Vencimento', 'Data Pagamento', 'Status', 'Descricao'];
  const rows = data.despesas.map(d => [
    escapeCSV(d.nome),
    escapeCSV(d.categoria),
    d.valor.toFixed(2).replace('.', ','),
    escapeCSV(d.dataVencimento),
    escapeCSV(d.dataPagamento || ''),
    escapeCSV(d.status),
    escapeCSV(d.descricao || '')
  ]);

  const bom = '\uFEFF';
  const csv = bom + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'despesas.csv';
  link.click();
  URL.revokeObjectURL(url);
}

$('#busca').addEventListener('input', () => debounce(carregarDespesas));
$('#filtroCategoria').addEventListener('change', carregarDespesas);
$('#filtroStatus').addEventListener('change', carregarDespesas);
$('#filtroMes').addEventListener('change', carregarDespesas);
$('#filtroAno').addEventListener('input', () => debounce(carregarDespesas));

async function init() {
  await carregarConfig();
  await carregarTudo();
}

init();

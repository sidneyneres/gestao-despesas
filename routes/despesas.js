const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'db', 'db.json');

function readDB() {
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

router.get('/config', (req, res) => {
  const db = readDB();
  res.json(db.config);
});

router.get('/', (req, res) => {
  const db = readDB();
  let despesas = db.despesas;

  const { categoria, status, mes, ano, busca } = req.query;

  if (categoria) {
    despesas = despesas.filter(d => d.categoria === categoria);
  }

  if (status) {
    despesas = despesas.filter(d => d.status === status);
  }

  if (mes) {
    despesas = despesas.filter(d => {
      const dMes = new Date(d.dataVencimento).getMonth() + 1;
      return dMes === parseInt(mes);
    });
  }

  if (ano) {
    despesas = despesas.filter(d => {
      const dAno = new Date(d.dataVencimento).getFullYear();
      return dAno === parseInt(ano);
    });
  }

  if (busca) {
    const termo = busca.toLowerCase();
    despesas = despesas.filter(d =>
      d.nome.toLowerCase().includes(termo) ||
      d.categoria.toLowerCase().includes(termo) ||
      (d.descricao && d.descricao.toLowerCase().includes(termo))
    );
  }

  despesas.sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

  const totalGeral = despesas.reduce((sum, d) => sum + d.valor, 0);
  const totalPago = despesas.filter(d => d.status === 'Pago').reduce((sum, d) => sum + d.valor, 0);
  const totalPendente = despesas.filter(d => d.status === 'Pendente').reduce((sum, d) => sum + d.valor, 0);
  const totalAtrasado = despesas.filter(d => d.status === 'Atrasado').reduce((sum, d) => sum + d.valor, 0);

  res.json({
    despesas,
    resumo: {
      total: totalGeral,
      pago: totalPago,
      pendente: totalPendente,
      atrasado: totalAtrasado,
      quantidade: despesas.length
    }
  });
});

router.get('/resumo-mensal', (req, res) => {
  const db = readDB();
  const despesas = db.despesas;

  const resumo = {};

  despesas.forEach(d => {
    const data = new Date(d.dataVencimento);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

    if (!resumo[chave]) {
      resumo[chave] = {
        mes: chave,
        total: 0,
        pago: 0,
        pendente: 0,
        atrasado: 0,
        quantidade: 0
      };
    }

    resumo[chave].total += d.valor;
    resumo[chave].quantidade++;

    if (d.status === 'Pago') resumo[chave].pago += d.valor;
    if (d.status === 'Pendente') resumo[chave].pendente += d.valor;
    if (d.status === 'Atrasado') resumo[chave].atrasado += d.valor;
  });

  const resultado = Object.values(resumo).sort((a, b) => b.mes.localeCompare(a.mes));

  res.json(resultado);
});

router.get('/por-categoria', (req, res) => {
  const db = readDB();
  const despesas = db.despesas;

  const porCategoria = {};

  despesas.forEach(d => {
    if (!porCategoria[d.categoria]) {
      porCategoria[d.categoria] = { categoria: d.categoria, total: 0, quantidade: 0 };
    }
    porCategoria[d.categoria].total += d.valor;
    porCategoria[d.categoria].quantidade++;
  });

  const resultado = Object.values(porCategoria).sort((a, b) => b.total - a.total);

  res.json(resultado);
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const despesa = db.despesas.find(d => d.id === req.params.id);

  if (!despesa) {
    return res.status(404).json({ erro: 'Despesa nao encontrada' });
  }

  res.json(despesa);
});

router.post('/', (req, res) => {
  const db = readDB();
  const { nome, categoria, valor, dataVencimento, dataPagamento, status, descricao, recorrente, frequencia } = req.body;

  if (!nome || !categoria || !valor || !dataVencimento) {
    return res.status(400).json({ erro: 'Nome, categoria, valor e data de vencimento sao obrigatorios' });
  }

  const novaDespesa = {
    id: uuidv4(),
    nome,
    categoria,
    valor: parseFloat(valor),
    dataVencimento,
    dataPagamento: dataPagamento || null,
    status: status || 'Pendente',
    descricao: descricao || '',
    recorrente: recorrente || false,
    frequencia: frequencia || null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };

  db.despesas.push(novaDespesa);
  writeDB(db);

  res.status(201).json(novaDespesa);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  const index = db.despesas.findIndex(d => d.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ erro: 'Despesa nao encontrada' });
  }

  const { nome, categoria, valor, dataVencimento, dataPagamento, status, descricao, recorrente, frequencia } = req.body;

  db.despesas[index] = {
    ...db.despesas[index],
    nome: nome || db.despesas[index].nome,
    categoria: categoria || db.despesas[index].categoria,
    valor: valor !== undefined ? parseFloat(valor) : db.despesas[index].valor,
    dataVencimento: dataVencimento || db.despesas[index].dataVencimento,
    dataPagamento: dataPagamento !== undefined ? dataPagamento : db.despesas[index].dataPagamento,
    status: status || db.despesas[index].status,
    descricao: descricao !== undefined ? descricao : db.despesas[index].descricao,
    recorrente: recorrente !== undefined ? recorrente : db.despesas[index].recorrente,
    frequencia: frequencia !== undefined ? frequencia : db.despesas[index].frequencia,
    atualizadoEm: new Date().toISOString()
  };

  writeDB(db);

  res.json(db.despesas[index]);
});

router.delete('/:id', (req, res) => {
  const db = readDB();
  const index = db.despesas.findIndex(d => d.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ erro: 'Despesa nao encontrada' });
  }

  const removida = db.despesas.splice(index, 1)[0];
  writeDB(db);

  res.json({ mensagem: 'Despesa removida com sucesso', despesa: removida });
});

module.exports = router;

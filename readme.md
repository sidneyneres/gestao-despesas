Funcionalidades:
- CRUD completo - Criar, editar, excluir, listar despesas
- Dashboard com totais (pago, pendente, atrasado)
- Filtros por categoria, status, mes, ano e busca por texto
- 15 categorias pre-definidas: Agua, Luz, Gas, Internet, Cartao de Credito, Aluguel, etc.
- Resumo mensal e por categoria
- Status: Pendente, Pago, Atrasado, Cancelado
- Marcar como pago com um clique
- Despesas recorrentes com frequencia (Mensal, Quinzenal, Semanal, Anual)
- Interface responsiva para desktop e mobile

API Endpoints:
- Metodo	Rota	Descricao
- GET	/api/despesas	Listar (com filtros)
- GET	/api/despesas/:id	Buscar por ID
- POST	/api/despesas	Criar
- PUT	/api/despesas/:id	Atualizar
- DELETE	/api/despesas/:id	Excluir
- GET	/api/despesas/config	Categorias e status
- GET	/api/despesas/resumo-mensal	Resumo por mes
- GET	/api/despesas/por-categoria	Resumo por categoria
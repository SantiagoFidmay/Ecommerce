# Evolução do Sport Kicks

As melhorias serão entregues em etapas verificáveis, preservando o catálogo e os reviews. O Markdown original continua sendo a referência do trabalho; este arquivo acompanha a implementação.

## Etapa 1 — Carrinho, pedido e estoque

Implementada e validada localmente:

- A página do carrinho lista produtos, permite ajustar quantidades e remover itens e exibe descontos.
- O checkout exige login, carrega o endereço da conta e permite editá-lo para aquela entrega, sem alterar o cadastro.
- `POST /api/pedidos/resumo`, autenticado, calcula valores e disponibilidade a partir do banco, sem baixar estoque.
- `POST /api/pedidos` valida produtos ativos, quantidades, pagamento e endereço e recalcula os preços.
- Linhas do mesmo produto compartilham a disponibilidade, independentemente de tamanho/cor. O estoque por variante será implementado em outra etapa.
- Pedido, itens, entrega e baixa de estoque são gravados na mesma transação, com bloqueio de produtos e estoque durante a confirmação.
- Uma alteração no total exige uma nova conferência antes da confirmação pelo frontend.
- O carrinho só é limpo depois da confirmação da API. Cliques repetidos durante o envio são bloqueados.
- A confirmação informa número, total e status pendente. Esta etapa não cobra cartão, não gera PIX e não aprova pagamentos.
- Nenhuma tabela ou produto existente foi removido ou alterado para executar os testes.

### Testar manualmente

1. Na pasta `backend`, execute `npm install` e `npm start` (reinicie o servidor se ele já estiver aberto).
2. Abra o frontend pelo Live Server a partir da raiz do repositório.
3. Adicione um tênis, abra o carrinho, altere a quantidade e confira o desconto.
4. Continue para o checkout. Sem sessão, faça login para retornar à compra com o carrinho preservado.
5. Confira o endereço e confirme o pedido. Um pedido aceito consome o estoque do banco local, mesmo com pagamento pendente.
6. Para conferir persistência, use `GET /api/pedidos/meus-pedidos` com o JWT da própria conta. A tela de histórico ainda será construída.

### Testes automatizados

Execute na pasta `backend`:

```sh
npm run test:integration
npm run test:browser
```

Os testes de integração usam a conexão MySQL do `.env`, criam um banco exclusivo `sportkicks_test_<identificador>` e o removem ao terminar. O usuário do MySQL precisa de permissão para criar/remover esse banco. Eles não executam vendas no banco `ecommerce`.

Os testes de navegador usam respostas de API controladas, sem gravar no banco. Usam Chrome instalado no caminho padrão do Windows, quando disponível. Em outros ambientes, instale o Chromium do Playwright com `npx playwright install chromium`.

Cobertura: autenticação, quantidades inválidas, preços do servidor, descontos por quantidade, duplicação de linhas, produto indisponível, endereço, alteração do total, rollback, persistência de entrega e disputa pela última unidade. No navegador: carrinho e checkout em 1366×768 e 390×844, falha sem perda dos itens, confirmação, bloqueio de clique repetido e retorno ao login.

## Próximas etapas

1. **Conta e acompanhamento:** perfil, histórico e detalhes dos pedidos, permissões consistentes entre frontend e backend.
2. **Operação e variantes:** painel administrativo, estoque por tamanho/cor, movimentações e regras de cancelamento com devolução do estoque.
3. **Cobrança confiável:** chave persistida para impedir duplicação em tentativas após falhas de rede, expiração/liberação de pedidos pendentes e integração de pagamento em ambiente de testes.
4. **Relatórios e qualidade:** gráficos exigidos, testes de acesso, revisão dos dados técnicos, avaliações e documentação de engenharia.
5. **Diferenciais:** comparador, quiz de recomendação, favoritos e alertas de reposição.
6. **Marcas e publicação:** exposição equilibrada e contatos oficiais; configuração pública do frontend na Vercel, API/MySQL no Railway, migrations e backups.

As sete tabelas atuais permanecem nesta primeira etapa. Ampliaremos o modelo junto das funcionalidades que exigirem novos relacionamentos.

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
6. Para conferir persistência, abra **Meus pedidos** na própria conta ou use `GET /api/pedidos/meus-pedidos` com seu JWT.

### Testes automatizados

Execute na pasta `backend`:

```sh
npm run test:integration
npm run test:browser
```

Os testes de integração usam a conexão MySQL do `.env`, criam um banco exclusivo `sportkicks_test_<identificador>` e o removem ao terminar. O usuário do MySQL precisa de permissão para criar/remover esse banco. Eles não executam vendas no banco `ecommerce`.

Os testes de navegador usam respostas de API controladas, sem gravar no banco. Usam Chrome instalado no caminho padrão do Windows, quando disponível. Em outros ambientes, instale o Chromium do Playwright com `npx playwright install chromium`.

Cobertura: autenticação, quantidades inválidas, preços do servidor, descontos por quantidade, duplicação de linhas, produto indisponível, endereço, alteração do total, rollback, persistência de entrega e disputa pela última unidade. No navegador: carrinho e checkout em 1366×768 e 390×844, falha sem perda dos itens, confirmação, bloqueio de clique repetido e retorno ao login.

## Etapa 2 — Conta e acompanhamento (27/10/2026)

Implementada sem alteração do esquema do banco:

- `perfil.html`: consulta dos próprios dados, edição de nome, telefone e endereço com busca de CEP e preenchimento manual. E-mail e CPF ficam apenas para consulta na tela.
- Alteração de senha exige senha atual, confirmação no formulário e nova senha com ao menos oito caracteres (máximo de 72 bytes no backend). A resposta nunca inclui o hash.
- `PATCH /api/usuarios/perfil` identifica o titular pelo JWT. Alterações por ID mantêm acesso somente ao titular ou ADMIN. Campos de privilégio não são aceitos na atualização.
- `pedidos.html`: somente compras próprias, com filtro de status e paginação. `GET /api/pedidos/meus-pedidos` aceita `pagina`, `limite` (1 a 50) e `status`, retornando `total`, `pagina`, `totalPaginas` e `pedidos`.
- `pedido.html?id=...`: itens, preços registrados, totais, forma de pagamento e endereço da compra. Mostra previsão, transportadora e rastreio somente quando cadastrados.
- A consulta direta de entrega também verifica se o pedido pertence ao usuário ou se o acesso é de um administrador.
- O checkout agora oferece **Ver meu pedido** após confirmar. Login mantém a página e o ID de destino. Sair remove a sessão deste navegador e preserva o carrinho.
- Links de conta funcionam na página inicial e nas páginas internas, inclusive com o frontend servido em uma subpasta. Papel ADMIN padronizado e destino externo de retorno ao login descartado.
- Manual e central de ajuda atualizados. Plano e roteiro de treinamento originais estão identificados como registros históricos.

### Validação e uso

Execute os dois comandos de teste descritos acima. A suíte contempla consulta/edição de outra conta bloqueada, acesso administrativo autorizado, dados inválidos, tentativa de promoção a ADMIN, duplicidade de CPF/e-mail, troca de senha, filtragem e contagem de pedidos, endereço histórico preservado e acesso à entrega. Os testes de navegador cobrem perfil, CEP, histórico, paginação, detalhe, login, sessão recusada e saída em desktop e celular.

Para conferir localmente: reinicie a API com `npm start`, atualize o frontend e entre na conta. Clique no seu nome para editar o perfil; use **Meus pedidos** para abrir as compras existentes. Não é necessário executar `sync` ou recadastrar produtos.

Limites mantidos para próximas etapas: recuperação de senha por e-mail e encerramento automático de outras sessões após troca de senha; cancelamento com devolução de estoque; cobrança real; rastreio automático com transportadoras. A tela de entrega mostra os dados cadastrados, sem consultar transportadoras.

## Etapas 3–6 — Versão demonstrativa completa

Implementadas após autorização para concluir o escopo restante, com duas decisões do responsável: **manter pagamento somente em demonstração** e **preparar arquivos/instruções de Vercel e Railway sem publicar**.

### Operação

- Modelo ampliado para 25 tabelas de domínio e uma tabela de controle de migrações.
- Marca ligada ao produto, opções por SKU/tamanho/cor, mídia, ficha técnica com fonte oficial, histórico de preços e snapshots dos itens comprados.
- Estoque anterior preservado em uma opção de numeração Não informado; distribuição por transferência no painel, sem multiplicar saldos.
- Painel administrativo com catálogo, categorias, marcas, usuários, avaliações, estoque, histórico de movimentos, pedidos e entregas.
- Confirmação idempotente do checkout, cancelamento com devolução única, reserva expirada e estorno demonstrativo.
- Pagamento exclusivamente demonstrativo: nenhuma API de cobrança real é chamada. Confirmação e estorno exigem indicação explícita de demonstração.
- Dois gráficos Chart.js com período, tabelas e exportação CSV, usando pedidos confirmados e horários de São Paulo. Valores rotulados como demonstração.

### Experiência do cliente

- Comparador de até três modelos e quiz com critérios explícitos, sem inferir ficha técnica desconhecida.
- Favoritos, rotação pessoal, alertas por opção e notificações dentro da conta.
- Avaliações únicas por compra própria entregue, com ajuste de numeração e moderação.
- Cinco marcas com controles e espaços equivalentes, canais oficiais e filtro de catálogo por fabricante.
- Removidos contadores comerciais fictícios, estrelas fixas, promessas de entrega/suporte não implementadas e a newsletter sem envio.

### Segurança e publicação

- Sessões persistidas e revogáveis; saída validada no servidor; troca/redefinição de senha encerra sessões anteriores.
- Recuperação por token de uso único, condicionada ao SMTP. Permanece indisponível sem credenciais de envio.
- Rate limiting, Helmet, validação de campos, origens CORS configuráveis e tratamento de erros sem detalhes internos em produção.
- Dependências auditadas e override de uuid compatível com os usos do Sequelize, validado pelos testes; não foi aplicado downgrade do ORM.
- Build público isolado em dist/, configuração de API por ambiente, Vercel, Docker/Railway, health check e GitHub Actions.
- Backup local anterior à migração preservado em .backups/ e ignorado pelo Git. Migrações aditivas aplicadas; os 18 produtos, preços, saldos e reviews locais foram preservados.
- Manual e PDFs atualizados, requisitos/infraestrutura em engenharia.md e engenharia.pdf, diagramas UML/casos de uso em PNG/SVG e requisições REST de exemplo.

### Validação

A conferência final passou em **55 testes** (37 de API/build e 18 de navegador), na verificação de sintaxe dos 90 arquivos JavaScript e no build público. A API local respondeu HTTP 200 no health check. A comparação com o backup confirmou os nomes, preços e saldos dos 18 produtos preservados.

A suíte cobre os fluxos anteriores e os novos: API em bancos separados, reenvio concorrente de confirmação, última unidade, cancelamento, expiração, estorno, transferência, alertas, recuperação, permissões e build público. O navegador também executa fluxos reais de quiz → comparação → produto → login → pedido → demonstração e gestão de catálogo/estoque, em 390×844 e 1366×768.

### O que depende de configuração externa

- Criação das contas/projetos de Vercel e Railway e configuração das variáveis, conforme publicacao.md.
- SMTP para recuperação por e-mail; avisos de estoque já funcionam dentro da conta.
- Preenchimento operacional de numerações/cores, fonte da ficha técnica e créditos de cada vídeo quando conhecidos.
- Um primeiro administrador: cadastrar conta e executar `npm run admin -- SEU-EMAIL` na pasta backend.

Cobrança comercial, emissão fiscal, rastreio automático de transportadora e publicidade por e-mail ficam fora da demonstração escolhida. A versão não representa uma loja comercial homologada para dinheiro/mercadoria reais.

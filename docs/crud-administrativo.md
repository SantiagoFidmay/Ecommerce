# CRUD administrativo

As sete entidades principais possuem cadastro, listagem, consulta por código, busca por nome, PUT, PATCH e DELETE. O código aproveita os controllers, models e serviços existentes. A referência de organização é `ecom_tenis-main/backend/controller`: funções assíncronas, operações Sequelize, tratamento de registro inexistente e exportação pelo controller. As regras de compra continuam nos serviços compartilhados, para que editar um item não deixe o estoque ou o pagamento inconsistentes.

## Usar pelo painel

Entre como administrador em `pages/admin.html` e abra **Gestão de registros**:

1. Escolha Produtos, Categorias, Usuários, Estoque, Pedidos, Entregas ou Itens do pedido.
2. Use **Listar todos** ou consulte pelo código do registro ou pelo nome. Para pedidos e entregas, o nome é o do cliente; para estoque e itens, o do produto.
3. Use **Novo registro**, **Consultar**, **Editar** ou **Excluir/Desativar** na lista. Produtos usam o formulário completo da seção Catálogo.
4. **Salvar alterações** atualiza os campos modificados. **Salvar cadastro completo** envia todos os dados do formulário. Para trocar e-mail ou CPF, use a opção de cadastro completo.
5. No cadastro de pedido, selecione o cliente, confira o endereço e adicione produtos, opções e quantidades. **Calcular valores** mostra a prévia. A confirmação confere novamente os valores e o saldo.

O cadastro administrativo de pedido usa `POST /api/admin/pedidos` e mantém o cliente como dono da compra e o administrador como responsável pela movimentação de estoque. Cadastrar outra pessoa pelo painel mantém a sessão atual do administrador. Permissões e reativação de contas também podem ser administradas na seção Cadastros.

As telas funcionam em desktop e celular. As tabelas possuem rolagem horizontal quando necessário. Falhas de consulta mostram uma mensagem e o botão **Recarregar lista**; não são apresentadas como ausência de registros.

## Rotas da API

Todas as rotas abaixo usam o prefixo `/api`. As operações administrativas exigem `Authorization: Bearer <token-do-administrador>`. As consultas públicas do catálogo e as operações do cliente na própria conta e nos próprios pedidos foram preservadas.

| Entidade | POST e GET geral | GET por código, PUT, PATCH e DELETE | Busca por nome |
| --- | --- | --- | --- |
| Produto | `/produtos` | `/produtos/:id` | `/produtos/buscar/:nome` |
| Categoria | `/categorias` | `/categorias/:id` | `/categorias/buscar/:nome` |
| Usuário | `/usuarios` | `/usuarios/:id` | `/usuarios/buscar/:nome` |
| Estoque | `/estoque` | `/estoque/:id` | `/estoque/buscar/:nome` |
| Pedido | `/pedidos` | `/pedidos/:id` | `/pedidos/buscar/:nome` |
| Entrega | `/entregas` | `/entregas/:id` | `/entregas/buscar/:nome` |
| Item do pedido | `/itens-pedido` | `/itens-pedido/:id` | `/itens-pedido/buscar/:nome` |

A busca também aceita `/buscar?nome=...` e retorna uma lista de correspondências parciais. Em estoque e itens, o nome é o do produto; em pedidos e entregas, o do cliente. Os demais usam o nome da própria entidade. O código consultado é a chave primária da entidade, por exemplo `codEstoque`, `codEntrega` ou `codItemPedido`. Use `GET /itens-pedido?idPedido=123` para listar os itens de um pedido.

O cadastro de usuários continua público e não aceita escolher privilégios. O cadastro de pedidos continua sendo o checkout autenticado, com itens, preços, reserva e entrega calculados no servidor. O administrador pode usar essas operações com sua conta. A configuração `ADMIN_EMAIL` mantém a proteção do administrador principal.

## PUT e PATCH

PUT recebe os campos principais da representação editável; PATCH recebe somente os campos que serão alterados. IDs e valores calculados não são campos livres para edição.

| Entidade | Campos principais do PUT | Comportamento dos opcionais |
| --- | --- | --- |
| Produto | `nome`, `marca`, `preco`, `idCategoria` | Descrição vazia, promoção/código/mídia principal nulos, ativo, sem destaque, ficha e galeria vazias quando omitidos. |
| Categoria | `nome` | Descrição/ícone nulos e ativo quando omitidos. |
| Usuário | `nome`, `email`, `cpf` | Mantém as validações existentes de perfil e senha atual ao alterar as próprias credenciais. |
| Estoque | `quantidade`, `quantidade_minima` | Ambos obrigatórios; vínculo com o produto fixo. |
| Pedido | `forma_pagamento`, `observacoes`, `itens` | `observacoes` aceita `null`; os totais são calculados. Cliente, data e status seguem o fluxo do pedido. |
| Entrega | `idPedido`, `endereco_entrega`, `status` | Rastreio, transportadora, CEP, datas e observações nulos quando omitidos. |
| Item | `idPedido`, `idProduto`, `quantidade` | `idVariante`, tamanho e cor opcionais, com a variante exigida quando o produto possui opções. |

Use `PATCH /pedidos/:id/status` para transições de status. O PATCH geral do pedido aceita `forma_pagamento`, `observacoes` e `itens`. O PATCH de entrega também aceita os dados de rastreio, endereço e status.

Exemplo de PUT de pedido:

```json
{
  "forma_pagamento": "PIX",
  "observacoes": null,
  "itens": [{ "idProduto": 1, "idVariante": 1, "quantidade": 2 }]
}
```

Exemplo de cadastro de item:

```json
{
  "idPedido": 1,
  "idProduto": 1,
  "idVariante": 1,
  "quantidade": 1
}
```

## Regras de edição e exclusão

- Produtos, categorias e usuários mantêm a exclusão lógica existente: DELETE desativa o cadastro. Categorias com produtos ativos não podem ser desativadas.
- Estoque só pode ser excluído se estiver zerado e não possuir variantes nem itens de pedidos vinculados. As alterações de saldo geram movimentações. Produtos com variantes recebem saldo pelo fluxo de tamanho e cor; o saldo agregado não pode ser sobrescrito.
- Pedidos só podem ser editados enquanto pendentes, com reserva ativa e pagamento pendente de demonstração. Pagamentos enviados a um provedor externo não podem ser alterados por esse CRUD.
- Alterar itens reavalia os preços do catálogo, verifica a disponibilidade, ajusta a reserva de estoque e recalcula subtotal, desconto, frete, total e valor do pagamento, em uma transação. Uma falha desfaz todas essas alterações. O PUT do pedido substitui a lista de itens; a edição individual mantém o código do item.
- O pedido precisa manter pelo menos um item. Para remover o último, cancele ou exclua o pedido. Não é permitido transferir itens ou entregas entre pedidos.
- DELETE de pedido remove apenas pedidos pendentes ou cancelados sem pagamento aprovado, em revisão ou reembolsado e sem avaliações vinculadas. Libera o estoque uma única vez e remove itens, entrega, reserva, pagamento e chave de checkout associados. Os movimentos de estoque são preservados.
- Entregas só podem ser excluídas enquanto pendentes e vinculadas a pedidos pendentes ou cancelados. O checkout já cria a entrega; POST permite recriar uma entrega pendente removida ou cadastrar uma que ainda não exista. Não é possível duplicar uma entrega por pedido.
- Uma entrega só entra em trânsito ou é concluída depois que o pedido foi enviado. Marcar como entregue também atualiza o pedido. Endereços só podem ser alterados enquanto o pedido estiver pendente.

Erros de validação retornam 400, ausência de autenticação 401, falta de permissão 403, registro inexistente 404 e conflitos com essas regras 409.

## Executar e reiniciar no Windows

Não houve mudança nas tabelas. Reinicie a API para carregar as novas rotas:

```powershell
npm.cmd run dev
```

Para parar, pressione `Ctrl+C`. Se o terminal mostrar **Deseja finalizar o arquivo em lotes (S/N)?**, digite **S** e pressione Enter. Essa confirmação é do Windows ao encerrar o comando `npm.cmd`. Para iniciar novamente, execute `npm.cmd run dev`. O atalho `Ctrl+C` encerra o processo; não o reinicia automaticamente.

Os exemplos de chamadas ficam em `backend/rest_client.http`. Os testes de CRUD usam um banco isolado e cobrem permissões, consultas, substituição por PUT, preservação por PATCH, rollback, concorrência, estoque e exclusões.

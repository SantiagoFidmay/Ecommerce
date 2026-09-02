## Sistema Ecommerce - 7 Tabelas - 16/11 - previsão

## 1. CONTEXTUALIZAÇÃO

Uma loja comercial (especializada em sucos naturais) decidiu modernizar sua operação e lançar a primeira versão de seu sistema de e-commerce e controle de estoque. Atualmente, o controle de entrada e saída de produtos (sucos) é feito em planilhas, o que gera erros e falta de organização. O Product Owner (P.O.) encomendou o desenvolvimento de uma plataforma web completa para gerenciar as vendas, controlar o estoque dinamicamente e fornecer relatórios gerenciais analíticos. Como desenvolvedor full-stack, você foi designado para criar esta primeira versão com a especificação e lógica estrutural.

## 2. DESAFIO

O P.O. solicitou a especificação e implementação do sistema contendo 7 entidades relacionais obrigatórias: Usuario, Produto, Categoria, Estoque, Pedido, ItemPedido e Entrega.

O sistema deve possuir as seguintes características técnicas e regras de negócio obrigatórias:

- Backend (Deploy no Railway): Desenvolvido em Node.js com Express e Sequelize (MySQL).

- Frontend (Deploy no Vercel): HTML, CSS e JS puro (Padrão REST). Deve ser responsivo, adaptável para Celular (padrão 390x844px) e Desktop (padrão 1366x768px).

- Autenticação e Segurança: Sistema protegido por login. Senhas devem ser criptografadas com bcrypt e as rotas protegidas via autorização com jsonwebtoken (JWT).

- Operações CRUD: Implementar rotas para Cadastrar (POST), Listar (GET geral), Consultar por Código e Nome (GET específico), Atualizar completo (PUT), Atualizar parcial (PATCH) e Apagar (DELETE).

- Validações e Integrações Obrigatórias:

- O CPF do usuário deve ser validado matematicamente pela fórmula real antes do cadastro.

- O preenchimento do endereço é obrigatório: o usuário digita o CEP, e o sistema deve consumir a API do ViaCEP para autocompletar rua, bairro e cidade( https://viacep.com.br/ ) [URL 🔗](https://viacep.com.br/)

- O backend deve verificar a existência prévia dos dados no banco antes de qualquer manipulação (ex: verificar se o e-mail/CPF já existe, verificar se o produto existe antes de atualizar).

- Regras de Interface e Negócio (Sucos Naturais):

- A tela principal (navegação sempre acessível no topo) deve ter links para Movimentação de Vendas e Cadastro de Produtos (Sucos).

- A listagem de produtos (Sucos) deve carregar automaticamente ao abrir a tela, utilizando Cards contendo a imagem do produto, nome e preço.


- Resultados de consultas e listagens gerenciais devem ser exibidos em formato de Tabela e ou CARD.

- Carrinho de Compras: Deve ser implementado utilizando LocalStorage ou SessionStorage.

- Controle de Estoque: Só é possível registrar a venda (adicionar ao carrinho) se houver quantidade disponível. Se o estoque for igual a zero, o sistema deve exibir um alerta bloqueando a ação. Ao finalizar o pedido, o estoque deve ser deduzido.

- Ver regras de desconto nas compras:

- Relatórios Gerenciais: O sistema deve apresentar 2 relatórios utilizando gráficos (barras, linhas ou colunas - chart.js) renderizados no frontend (ex: Vendas por Categoria de Suco ou Faturamento Mensal).

## 2.1 — Arquitetura de Acesso e Controle de Rotas (Públicas vs. Privadas)

O sistema deve dividir explicitamente a navegação e os endpoints da API entre acesso público e acesso privado (protegido).

Os alunos devem implementar o controle de rotas no frontend e a validação de autorização via JWT (JSON Web Token) no backend para todas as rotas privadas.

## A. Rotas e Recursos Públicos (Sem necessidade de Login)

Qualquer visitante da plataforma pode navegar livremente por estas telas e consumir estas informações:

- Página Inicial / Vitrine: Layout principal com navegação no topo, banners promocionais e chamada de destaque para os produtos.

- Catálogo de Produtos (Cards de Sucos): Listagem automática dos produtos disponíveis, exibidos em formato de Cards contendo a foto, o nome, a categoria e o preço do suco.

- Busca e Filtro de Produtos: Permite consultar sucos por nome ou filtrar por categoria sem exigir autenticação.

- Carrinho de Compras (Local / Session Storage): O cliente pode adicionar e remover itens do carrinho temporariamente mesmo não estando logado.

- Tela de Login / Autenticação: Formulario para login do usuário.

- Tela de Cadastro de Cliente: Formulário de criação de conta com autocompletar de endereço via API do ViaCEP e validação matemática do CPF.

- Endpoints Públicos na API (Backend):

- POST /login (Autenticação e geração do token JWT)

- POST /usuarios (Cadastro de novos clientes)

- GET /produtos (Listagem geral de sucos)

- GET /produtos/:id ou GET /produtos/buscar (Consulta de produto)

- GET /categorias (Listagem das categorias de sucos)


## B. Rotas e Recursos Privados (Protegidos por Login e JWT)

Exigem obrigatoriamente que o usuário esteja autenticado. No backend, as requisições devem enviar o cabeçalho Authorization: Bearer <TOKEN_JWT>. Se o token for inválido, ausente ou expirado, a API deve retornar HTTP 401 Unauthorized.

- Finalização de Pedido (Checkout): A conversão do carrinho do LocalStorage em um registro real de venda no banco de dados só pode ocorrer se o usuário estiver logado.

- Painel / Perfil do Usuário: Consulta e atualização dos dados cadastrais (método PUT e PATCH).

- Histórico de Pedidos: Tela que exibe as compras anteriores do cliente e o status da entrega (EM_TRANSITO, ENTREGUE, etc.).

- Painel Administrativo (admin) / Gestão de Estoque: Área restrita para administradores cadastrarem novos sucos, atualizarem preços, darem entrada/saída no estoque e visualizarem os relatórios gerenciais com gráficos.

- Endpoints Protegidos na API (Backend):

- GET /usuarios/perfil e PUT /usuarios/:id (Dados da conta)

- POST /pedidos (Registro final da venda, criação dos itens e dedução automática do estoque)

- GET /pedidos/meus-pedidos (Histórico de compras do cliente logado)

- POST /produtos, PUT /produtos/:id, PATCH /produtos/:id, DELETE /produtos/:id (Gestão do catálogo)

- POST /estoque e PUT /estoque/:id (Movimentação e controle de estoque)

- GET /relatorios/vendas e GET /relatorios/estoque (Endpoints que alimentam os gráficos no frontend)

## 3. RESULTADOS E ENTREGAS

Para a homologação desta 1ª versão, os seguintes artefatos devem ser entregues:

- Modelagem das classes em UML.

- Diagrama de Caso de Uso do sistema.

- Documento listando Requisitos Funcionais, Não-Funcionais e Regras de Negócio.

- Lista da infraestrutura necessária (requisitos de software e hardware para o sistema funcionar e para desenvolver).

- A pontuação só será validada se a funcionalidade estiver completa no front e back end.

## 1. Documentação de Engenharia:

## 2. Código Fonte:


- Todos os arquivos e códigos devem ser compactados no formato zip (sem a pasta node_modules).

- Arquivo de testes de integração com as requisições organizadas (rest_client.http).

- 3. Formatos: Imagens de diagramas em .png, documentos de texto em .pdf

# Sport Kicks

Ecommerce demonstrativo de calçados com HTML/CSS/JavaScript, API Express, Sequelize e MySQL. Pagamento e estorno são **somente simulações**, sem cobrança real.

## Rodar localmente

Requisitos: Node.js 22 ou 24, npm, MySQL 8+ e navegador atual.

1. Configure `backend/.env` usando `backend/.env.example`. Informe sua conexão MySQL e um segredo JWT próprio. O banco indicado em `DB_NAME` precisa existir.
2. Na raiz do projeto:

```sh
npm run setup
npm run dev
```

Abra **http://localhost:5500**. A API usa a porta 3001. Encerre processos antigos nessas portas antes de iniciar. As migrações são executadas na inicialização; não apagam tabelas ou reiniciam o estoque.

Também é possível executar `npm start` na pasta `backend` e abrir o frontend pelo Live Server a partir da raiz do repositório.

### Catálogo e primeiro administrador

O banco local já possui os 18 modelos e reviews. Para preencher **um banco novo** com os exemplos:

```sh
npm run demo
```

Esse comando cria somente modelos ausentes e preserva registros existentes. Os exemplos têm 20 unidades por produto na opção **Não informado / Original**. No painel, cadastre os tamanhos reais e transfira o saldo; não são inventadas numerações disponíveis. Não execute os scripts antigos de preparação para reabastecer um banco em uso: o comando atual é `seed:demo`.

Cadastre sua conta pela loja. Depois, na pasta `backend`:

```sh
npm run admin -- seu-email@exemplo.com
```

Saia e entre novamente. O link **Administração** aparecerá no menu. Nenhuma senha ou conta administrativa padrão é publicada no repositório.

## Funcionalidades

- Catálogo paginado, busca e filtros por categoria, marca e preço; recomendados alternam a exposição entre marcas.
- Galerias e reviews gerenciados pelo painel, ficha técnica com fonte oficial, histórico real de preços e avaliações de compras entregues.
- Tamanhos e cores por SKU; entradas, saídas, ajustes, transferências e histórico de movimentações.
- Carrinho local, checkout autenticado, validação no servidor e confirmação idempotente.
- Pedido, itens, entrega e estoque em transação, com bloqueio de linhas para compras simultâneas.
- Reserva com vencimento, cancelamento, simulação de pagamento e estorno de demonstração.
- Perfil, senha, sessões revogáveis, histórico de compras e detalhes de entrega.
- Comparador de três modelos, quiz com critérios explícitos, favoritos, rotação de pares, alertas e notificações dentro da conta.
- Painel com catálogo, categorias, marcas, usuários, entregas, moderação e dois gráficos Chart.js com período e exportação CSV.
- Cinco marcas com os mesmos controles de divulgação e canais oficiais, sem alegação de parceria.

Dados técnicos não cadastrados aparecem como **Não informado**. O quiz não infere peso, placa, finalidade ou benefícios a partir do nome do modelo. Os preços iniciais foram informados pelo responsável pelo projeto.

## Qualidade e documentação

```sh
npm run check
npm test
npm run build
```

Os testes criam bancos MySQL isolados `sportkicks_test_*`, removidos ao final; o usuário precisa de permissão para criar e remover esses bancos. Não executam vendas no banco da loja. Testes reais de navegador usam API e MySQL isolados; os anteriores também incluem respostas controladas. No Linux, prepare o navegador com `npx playwright install --with-deps chromium` na pasta `backend`.

O GitHub Actions contém a mesma rotina com MySQL 8.4. A execução remota dependerá do envio do código ao GitHub.

- [Requisitos, regras e modelagem](docs/engenharia.md)
- [Publicação na Vercel e no Railway](docs/publicacao.md)
- [Evolução e decisões](docs/evolucao.md)
- [Manual e treinamento](docs/implantacao/README.md)
- [Requisições REST de exemplo](backend/rest_client.http)

## Publicação e limites atuais

`npm run build` prepara **dist/** somente com os arquivos públicos. `API_BASE_URL` configura a API no build e precisa terminar em `/api`. A Vercel requer HTTPS. `npm run preview` serve o resultado localmente.

As contas Vercel/Railway ainda precisam ser criadas e configuradas conforme o roteiro. O projeto não foi publicado automaticamente. Cobrança real, emissão fiscal, consulta automática de transportadoras e envio de alertas por e-mail não fazem parte desta demonstração. Os avisos de reposição aparecem na coleção. A recuperação de senha por e-mail está implementada, mas só funciona após configurar SMTP e `FRONTEND_URL`.

Faça `npm run backup` na pasta `backend` antes de alterações de dados; a exportação local contém esquema e registros e fica em `.backups/`, ignorada pelo Git. Na hospedagem, configure backups persistentes do MySQL; o sistema de arquivos do container não é um local permanente para guardá-los.

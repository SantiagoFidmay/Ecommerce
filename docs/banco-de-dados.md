# Criar e inicializar um banco novo

Requisitos: MySQL 8+ em execução, Node.js 22 ou 24 e npm. Execute os comandos de terminal na raiz do projeto. Os exemplos usam `npm.cmd`, que funciona no PowerShell mesmo quando a política de execução bloqueia `npm.ps1`.

## 1. Criar o banco no MySQL

No MySQL Workbench ou no cliente MySQL, execute:

```sql
CREATE DATABASE ecommerce_novo
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Você pode trocar `ecommerce_novo` por outro nome. O usuário da conexão precisa ter permissão para criar tabelas, índices e chaves estrangeiras nesse banco. O Sequelize cria as tabelas; o banco precisa existir antes da conexão.

## 2. Configurar a conexão

Se `backend/.env` ainda não existir, copie o exemplo:

```powershell
Copy-Item backend/.env.example backend/.env
```

Se o arquivo já existir, edite-o. Configure os dados da sua instalação:

```dotenv
DB_NAME=ecommerce_novo
DB_USER=root
DB_PASS=sua_senha_local
DB_HOST=localhost
DB_PORT=3306
PORT=3001
JWT_SECRET=cole_aqui_uma_chave_aleatoria
```

Gere uma chave JWT e copie o resultado para `JWT_SECRET`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Mantenha as demais opções de `backend/.env.example`. `MYSQL_URL` e `DATABASE_URL`, quando definidos, têm prioridade sobre `DB_NAME`, `DB_USER` e os demais campos de conexão: remova ou atualize essas URLs se estiverem apontando para o banco anterior. Variáveis já definidas no terminal têm prioridade sobre o `.env`. O arquivo de configuração local usado pela conexão é `backend/.env`.

## 3. Instalar as dependências e criar as tabelas

```powershell
npm.cmd run setup
npm.cmd --prefix backend run migrate
```

O segundo comando registra os 26 models, cria as tabelas ausentes, aplica as migrações pendentes e cadastra as cinco marcas. Não usa `force` ou `alter` para sincronizar o banco. `npm.cmd --prefix backend run sync` continua disponível como atalho para o mesmo comando.

Cada tabela tem um arquivo em `backend/models/`, com `DataTypes`, `db.define`, `timestamps: false`, `tableName` e `module.exports`. `rel.js` registra as associações e exporta os models usados pela aplicação. `migrations/index.js` mantém as atualizações de bancos antigos e a carga inicial de marcas; não substitui os models.

| Área | Models |
| --- | --- |
| Cadastro e catálogo | Usuario, Categoria, Produto, Marca, Variante, Midia, Ficha, HistoricoPreco |
| Estoque | Estoque, Movimento |
| Compra e entrega | Pedido, ItemPedido, Entrega, CheckoutChave, Reserva, Pagamento, EventoPagamento |
| Comunidade | Favorito, Alerta, Notificacao, Avaliacao, Rotacao |
| Segurança | Seguranca, Sessao, Recuperacao |
| Controle de migrações | Migracao |

Para conferir no Workbench:

```sql
USE ecommerce_novo;
SHOW TABLES;
```

## 4. Carregar o catálogo de demonstração

Este passo é opcional. Para carregar os 18 produtos com fotos, reviews e estoque inicial:

```powershell
npm.cmd run demo
```

A carga adiciona apenas produtos ausentes pelo código do produto. Não atualiza os preços nem repõe o saldo dos produtos existentes. Cada produto novo recebe 20 unidades de demonstração na cor **Original**: três de cada tamanho entre 38 e 43 e duas de tamanho 44. Para converter o catálogo antigo sem numeração, execute `npm --prefix backend run numeracao` na raiz. A conversão preserva o saldo total e os produtos que já possuem opções cadastradas.

## 5. Iniciar a loja e criar o administrador

```powershell
npm.cmd run dev
```

Abra **http://localhost:5500**. A API fica em **http://localhost:3001/api**. Cadastre uma conta pela loja e, em outro terminal na raiz, promova essa conta:

```powershell
npm.cmd --prefix backend run admin -- seu-email@exemplo.com
```

Saia da conta e entre novamente para acessar a Administração. Use `Ctrl+C` no terminal de desenvolvimento para encerrar a loja.

Para manter uma conta como administrador principal, configure `ADMIN_EMAIL` no `backend/.env`. A API promove a conta existente ao iniciar e no login; se ela ainda não existir, atribui o cargo quando esse e-mail for cadastrado. A senha continua obrigatória. O painel não permite desativar ou rebaixar essa conta, nem alterar seu e-mail pelo perfil. A configuração também funciona em um banco novo; não cria uma conta ou senha automaticamente.

## Verificação e problemas de conexão

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
```

Os testes de integração criam e removem bancos isolados com prefixo `sgfrun_test_`; o usuário de testes precisa ter essas permissões. Os testes de navegador precisam do Chromium do Playwright; instale-o se necessário com `backend/node_modules/.bin/playwright.cmd install chromium`.

- `Unknown database`: crie o banco e confira `DB_NAME` ou a URL de conexão.
- `Access denied`: confira usuário, senha e permissões no MySQL.
- `ECONNREFUSED`: confira se o serviço MySQL está iniciado e se host/porta estão corretos.
- `EADDRINUSE`: encerre o processo anterior que usa a porta 3001 ou 5500.

# Publicação — demonstração Sport Kicks

O código está preparado para frontend na Vercel e API/MySQL no Railway. Nenhum projeto de hospedagem foi criado e nenhum pagamento real está ativo.

## 1. Preparação local

1. Execute `npm run check`, `npm test` e `npm run build` na raiz.
2. Confira o resultado com `npm run preview` e a API local ligada.
3. Mantenha `.env`, `.backups`, `node_modules` e credenciais fora do Git. O build permite somente frontend e mídias públicas.
4. Publique o código no repositório escolhido. O banco local não é enviado pelo Git; ele precisa de importação ou da carga de demonstração.

## 2. Railway — MySQL e API

1. Crie um projeto e adicione um serviço MySQL.
2. Adicione o repositório como serviço da API e defina **Root Directory: `backend`**. Os arquivos `Dockerfile` e `railway.json` estão nessa pasta.
3. Configure as variáveis no serviço da API:

| Variável | Valor |
| --- | --- |
| `MYSQL_URL` | Referência à variável privada do serviço MySQL, por exemplo `${{MySQL.MYSQL_URL}}` se o serviço se chamar MySQL |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Segredo próprio, aleatório e com pelo menos 32 caracteres; não use o exemplo |
| `JWT_EXPIRES_IN` | `7d`, ou a duração definida para a demonstração |
| `BCRYPT_SALT_ROUNDS` | `10` |
| `RESERVA_MINUTOS` | `30` |
| `TRUST_PROXY` | `1`, para o proxy da hospedagem |
| `FRONTEND_URL` | URL HTTPS da Vercel, atualizada depois da criação do site |
| `CORS_ORIGINS` | Origens HTTPS permitidas, separadas por vírgula; inclua o domínio público do frontend |

O nome da referência MySQL deve corresponder ao serviço criado na sua conta. Como alternativa a `MYSQL_URL`, preencha `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASS` a partir das variáveis desse serviço. Não use o endereço privado do banco no frontend.

Para gerar um segredo localmente:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

4. Gere um domínio público para a API. A aplicação escuta `0.0.0.0` na porta `PORT` fornecida pela plataforma, com padrão local 3001.
5. Confira `https://SEU-DOMINIO-DA-API/api/health`. O retorno esperado é `status: ok` e modo de pagamento demonstrativo.
6. As migrações rodam na inicialização com bloqueio entre instâncias. Elas criam tabelas ausentes, adicionam campos e preservam os saldos. O MySQL precisa permitir as alterações de esquema.

Para um banco novo, conecte-se ao serviço da API pelo CLI com `railway ssh --service NOME-DA-API`. Dentro do container, execute `npm run seed:demo`. Depois de cadastrar sua conta pela loja, execute `npm run admin -- SEU-EMAIL` no mesmo serviço. Esses comandos não devem ser executados pelo navegador.

Ative e teste os backups do serviço MySQL. Faça uma cópia antes de importar dados ou aplicar novas alterações. A restauração deve ocorrer em um ambiente separado primeiro. O JSON de `npm run backup` é uma exportação de inspeção/emergência; para recuperação operacional, mantenha também dumps MySQL ou os backups da hospedagem e valide a restauração.

## 3. Vercel — frontend público

1. Importe o mesmo repositório. Use a **raiz do repositório**, sem limitar a pasta a `frontend`, pois as mídias ficam em diretórios compartilhados.
2. O `vercel.json` já define instalação, build e saída:

| Opção | Valor |
| --- | --- |
| Framework | Other / sem framework |
| Install Command | `npm --prefix backend ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

3. Defina `API_BASE_URL=https://SEU-DOMINIO-DA-API/api`. É configuração pública; não coloque senha, token administrativo ou conexão MySQL nessa variável.
4. Opcionalmente, defina `SITE_URL=https://SEU-DOMINIO-DO-SITE/` para gerar sitemap e sua referência em robots.txt.
5. Faça o deploy. Depois, atualize `FRONTEND_URL` e `CORS_ORIGINS` no Railway com a origem final da Vercel. Reaplique as alterações da API.

Um domínio de preview diferente também precisa constar nas origens permitidas caso vá acessar a API. Não há necessidade de publicar o backend ou `.env` na Vercel.

## 4. Conferência após publicar

- Abertura da vitrine, imagens, vídeos e catálogo sem falhas de caminho.
- Cadastro, CPF/CEP, login e saída.
- Acesso administrativo apenas com conta ADMIN.
- Escolha de tamanho/cor, carrinho e pedido com valores conferidos pelo servidor.
- Reenvio da mesma confirmação sem duplicar pedido.
- Confirmação e estorno identificados como demonstração, sem dinheiro real.
- Pedido cancelado/expirado com retorno do estoque uma única vez.
- Favoritos, coleção, alertas, comparação e quiz.
- Cinco marcas com links equivalentes.
- Dois gráficos, tabelas e CSV no painel.
- Acesso negado aos pedidos, entregas e dados de outra conta.
- `/backend/.env`, arquivos do banco e backups indisponíveis no site público.

O processo da API revisa reservas vencidas a cada minuto. Se o serviço estiver parado, a liberação acontece quando ele voltar. O botão administrativo de revisão e `npm run expirar` também executam essa rotina. Configure uma instância sempre disponível se precisar de prazos contínuos na demonstração.

## 5. Recuperação de senha opcional

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` e a URL pública correta em `FRONTEND_URL`. Use `SMTP_SECURE=true` para TLS direto (normalmente porta 465); com `false`, o envio exige STARTTLS. O link expira em 20 minutos, é de uso único e não é registrado em logs. A redefinição revoga sessões anteriores. Sem SMTP, a interface informa que o serviço não está configurado.

## Referências de configuração

As opções de build e diretório público seguem a [configuração oficial da Vercel](https://vercel.com/docs/project-configuration/vercel-json). A conexão privada usa as [variáveis do MySQL no Railway](https://docs.railway.com/databases/mysql); comandos no container usam [Railway SSH](https://docs.railway.com/cli/ssh). Confira essas páginas ao configurar as contas, pois as interfaces das plataformas podem mudar.

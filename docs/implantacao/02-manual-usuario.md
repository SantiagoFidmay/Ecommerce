# Manual do usuário

**Sport Kicks — ecommerce de artigos esportivos**  
Versão demonstrativa completa · 2.0 · 27/10/2026<br>
Sistema em desenvolvimento — leia as limitações antes de praticar.

## 1. Como usar este manual

Este manual explica as telas existentes da loja. Use R01 a R07 para consultar produtos e registrar pedidos de teste; R09 para acompanhar compras; R11 para editar o perfil e trocar a senha. R08 e R10 explicam administração e gráficos; R12 a R18 cobrem as ferramentas de escolha e organização.

O projeto segue a estrutura do documento **Sistema_ecommerce_7_tabelas (1).md**, adaptada de sucos para artigos esportivos. A atividade de 21/10/2026 pede orientações compatíveis com o estágio do sistema. Os anexos A e B citados na avaliação não foram fornecidos; as mensagens abaixo foram conferidas no código desta versão.

**O checkout agora registra pedidos e reduz o estoque do banco.** A cobrança ainda não está integrada: registrar um pedido não aprova pagamento nem confirma entrega. Use o ambiente de testes orientado pelo responsável.

## 2. Acesso, perfis e situação da versão

Abra a loja pelo endereço fornecido pelo responsável. Visitantes podem consultar o catálogo e selecionar produtos. Clientes podem criar conta e entrar. Administradores têm gestão de catálogo, estoque, pedidos, marcas, contas e relatórios pelo painel. A logística é um perfil de trabalho do treinamento, sem conta específica no sistema.

| Recurso | Situação nesta versão | Orientação |
| --- | --- | --- |
| Vitrine, catálogo, busca, filtros e detalhes | Telas implementadas, conectadas à consulta de produtos | Pode praticar R01–R03; confirme que o servidor está disponível. |
| Cadastro, CPF, consulta de CEP e login | Telas e serviços implementados; integração de CEP depende de internet | Pode praticar R04–R05 com dados autorizados. |
| Selecionar produto para o carrinho | Gravação local implementada, com aviso de adição | Pode praticar R06; o aviso não comprova venda ou reserva de estoque. |
| Página do carrinho | Lista, remoção, quantidades e totais implementados | Pode praticar R06; valores e disponibilidade são conferidos novamente no checkout. |
| Checkout | Autenticado; grava pedido, itens e entrega e deduz estoque em transação | Pode praticar R07 em ambiente de testes; não há cobrança real. |
| Perfil e histórico | Telas integradas e protegidas por login | Pode praticar R09 e R11 com a própria conta. |
| Painel administrativo e gráficos | Telas integradas para contas ADMIN | Use R08 e R10 em ambiente de demonstração. |
| Entrega | Dados cadastrados aparecem nos detalhes do pedido | A consulta não integra rastreio automático de transportadoras. |

## 3. Rotinas operacionais

### R01 — Abrir a loja e consultar o catálogo

**Público:** todos. **Pré-condições:** navegador, acesso ao endereço da loja e serviço disponível. Não exige conta.

1. Abra a página inicial da Sport Kicks.
2. Selecione **Catálogo**. Em celular, utilize o menu disponível no cabeçalho quando necessário.
3. Aguarde os cartões de produtos carregarem.
4. Leia nome, preço e categoria do item desejado.

**Resultado esperado:** produtos exibidos em cartões. Se não houver resultados, revise os filtros em R02. Se aparecer falha de conexão, consulte P01 na seção de problemas.

### R02 — Buscar, filtrar e ordenar produtos

**Público:** todos. **Pré-condições:** catálogo aberto e consulta disponível.

1. Digite parte do nome, da marca ou do código no campo de busca.
2. Para reduzir a lista, escolha uma categoria. No celular, abra **Filtros**, se o painel estiver recolhido.
3. Ajuste o preço máximo ou escolha uma opção de ordenação, como **Menor preço**, **Maior preço** ou **Nome A-Z**.
4. Confira os produtos e a quantidade de resultados. Use a paginação se houver mais de uma página.
5. Para recomeçar, selecione **Limpar filtros** ou **Ver todos**, conforme exibido na tela.

**Resultado esperado:** lista correspondente aos critérios. Nenhum resultado não significa necessariamente que o servidor está com problema.

### R03 — Consultar os detalhes de um produto

**Público:** todos. **Pré-condições:** produto localizado no catálogo.

1. Selecione o cartão ou o nome do produto.
2. Confira nome, marca, preço e descrição.
3. Selecione as miniaturas para ampliar outras fotos disponíveis.
4. Verifique o botão de compra. Se estiver **Esgotado**, não será possível selecionar aquele produto por esse botão.

**Resultado esperado:** detalhes do produto escolhido. Se a consulta falhar, a página informa o erro e não inventa disponibilidade. Os dados técnicos ausentes aparecem como Não informado. Os reviews são independentes e têm link para o YouTube.

### R04 — Criar uma conta

**Público:** cliente. **Pré-condições:** acesso à loja, serviço disponível, internet para consulta de CEP e dados autorizados para o treinamento. Não use identidade de terceiros.

1. Abra **Entrar** e depois **Criar conta grátis**, ou o link **Cadastro** da página inicial.
2. Informe nome completo, e-mail, CPF e senha. O formulário exige senha com pelo menos oito caracteres. Telefone é opcional.
3. Confira a indicação do CPF. Se aparecer inválido, revise os números; o sistema verifica os dígitos do documento.
4. Informe o CEP e aguarde a busca do endereço.
5. Confira rua, bairro, cidade e estado preenchidos. Informe o número; complemento é opcional.
6. Se o endereço não for encontrado, revise o CEP. Se a consulta falhar, procure o responsável; os campos de endereço estão bloqueados para edição manual nesta versão.
7. Selecione **Criar minha conta gratuita** uma única vez e aguarde.

**Resultado esperado:** conta criada e retorno à loja com identificação do cliente. Se o e-mail ou CPF já estiver cadastrado, utilize a conta existente ou solicite orientação; não faça cadastros duplicados.

### R05 — Entrar na conta

**Público:** cliente ou administrador com conta já criada. **Pré-condições:** serviço disponível, e-mail e senha da própria conta.

1. Abra **Entrar** ou **Login**.
2. Preencha e-mail e senha. Não use o usuário do banco de dados: a conta da loja é diferente da conexão técnica do servidor.
3. Se necessário, use o botão de visualização de senha sem expor a tela a outras pessoas.
4. Selecione **Entrar na minha conta** e aguarde a resposta.

**Resultado esperado:** identificação do usuário e retorno à página que exigiu login, inclusive aos detalhes do pedido. O nome no cabeçalho abre Meu perfil. Contas ADMIN também encontram Administração no menu. Se o login falhar, revise e-mail e senha; Esqueci minha senha permite solicitar um link quando o serviço de e-mail estiver configurado.

Em estação compartilhada, não salve a senha no navegador. Ao terminar, abra Meu perfil ou Meus pedidos e selecione **Sair da conta**. A saída remove a sessão deste navegador e preserva o carrinho local. Fechar a aba sozinho não encerra a sessão.

### R06 — Selecionar um produto para o carrinho

**Público:** visitante ou cliente. **Pré-condições:** produto disponível e navegador permitindo armazenamento local.

1. No catálogo, selecione o botão com ícone de carrinho do produto, ou **Adicionar ao carrinho** nos detalhes.
2. Aguarde o aviso de adição. Evite cliques repetidos sem conferir a quantidade desejada.
3. Se aparecer aviso de estoque insuficiente, não continue tentando aumentar a quantidade. Se estiver esgotado, escolha outro produto.

**Resultado esperado:** seleção salva no navegador utilizado. Não é pedido, pagamento ou reserva de estoque. Outro navegador ou computador não terá necessariamente os mesmos itens.

Abra **Carrinho** para conferir os itens, alterar quantidades e usar **Remover**. O resumo mostra descontos e frete; a API confere os valores e a disponibilidade novamente no checkout. Adicionar ao carrinho não reserva estoque.

### R07 — Registrar um pedido

**Público:** cliente autenticado. **Pré-condições:** carrinho com produtos disponíveis e serviço da loja acessível. Use uma conta e estoque de teste autorizados.

1. No carrinho, confira itens e quantidades e selecione **Finalizar Compra**.
2. Se for encaminhado ao login, entre na conta para retornar ao checkout com os itens preservados.
3. Confira o endereço carregado da conta. Edite os campos para aquela entrega, se necessário; isso não modifica o endereço do perfil.
4. Confira subtotal, desconto, frete e total calculados pelo servidor. Escolha a forma de pagamento; não há campos de cartão nem código PIX nesta versão.
5. Selecione **Confirmar pedido** uma vez e aguarde.
6. Após o registro, anote o número e selecione **Ver meu pedido**.
7. Se quiser concluir o exercício, use **Simular confirmação de pagamento** e confirme a mensagem de demonstração. Nenhum valor é cobrado. Sem confirmação, a reserva vence no prazo mostrado na tela.

**Resultado esperado:** pedido pendente registrado, com itens, endereço de entrega e baixa do estoque. O carrinho é limpo após a resposta de sucesso da API. Nenhum valor é cobrado.

Se o preço ou a disponibilidade tiver mudado, revise o resumo e confirme novamente somente depois de conferir os valores. Em caso de erro, os itens são mantidos. Se a resposta se perder, consulte **Meus pedidos** antes de tentar registrar novamente, e use a mesma tentativa caso precise reenviar: a confirmação do checkout possui chave persistida para evitar duplicação.

### R08 — Administração de catálogo e estoque

**Público:** conta ADMIN autorizada. **Pré-condições:** serviço disponível e acesso provisionado pelo responsável.

1. Abra **Administração** no menu. Em celular, abra o menu do cabeçalho primeiro.
2. Em **Catálogo**, use a busca ou **Novo produto**. Informe nome, marca, categoria, preço e mídia. Use **Editar** para mudar um registro existente.
3. Cadastre fotos por endereço, um por linha, e o review por link do YouTube. Informe crédito do vídeo quando conhecido. A ficha técnica deve usar dados confirmados e uma fonte HTTPS oficial da marca; campos desconhecidos ficam vazios.
4. Use **Salvar produto**. Para retirar da vitrine, escolha **Desativar**; o histórico de compras é preservado.
5. Em **Estoque**, escolha o produto e use **Cadastrar opção** para informar SKU, tamanho e cor. Uma nova opção começa com saldo zero.
6. Use **Registrar movimentação** com entrada, saída, saldo contado ou transferência. Informe quantidade e motivo. Para distribuir saldo antigo, transfira da opção Não informado para o tamanho/cor cadastrado; a transferência não cria unidades extras.
7. Confira o histórico de movimentações. Opções com saldo devem ser zeradas ou transferidas antes de serem desativadas.
8. Em **Cadastros**, gerencie categorias, contatos das marcas, moderação de avaliações e acesso de contas. Não é permitido retirar o próprio acesso administrativo.

**Resultado esperado:** alterações persistidas e disponibilidade refletida na loja. Não compartilhe credenciais administrativas e não use dados reais de clientes para exercícios de treinamento.

### R09 — Consultar histórico e entrega

**Público:** cliente autenticado. **Pré-condições:** conta da loja e serviço disponível.

1. Abra **Meus pedidos** pelo cabeçalho ou pelo menu da conta.
2. Confira número, data, status e total das compras da própria conta.
3. Use **Filtrar por status**, **Anterior** e **Próxima** quando necessário.
4. Selecione **Ver detalhes** para conferir itens, quantidades, preços registrados, totais e forma de pagamento escolhida.
5. Consulte o endereço específico daquela compra e os dados de entrega, transportadora, previsão e código de rastreio, quando cadastrados.

**Resultado esperado:** consulta das próprias compras. Ausência de previsão ou rastreio é indicada na tela; não representa uma integração automática com transportadoras. O status Pendente não significa pagamento aprovado. Alterar o perfil não altera o endereço de compras já registradas.

### R10 — Consultar relatórios e operar pedidos

**Público:** conta ADMIN autorizada. **Pré-condições:** registros de demonstração disponíveis.

1. Abra **Administração → Visão geral**.
2. Informe o período desejado e selecione **Aplicar período**.
3. Consulte os indicadores e os dois gráficos: valor de pedidos confirmados por mês e subtotal por categoria.
4. Use as tabelas abaixo dos gráficos para conferir os números. O subtotal por categoria não inclui desconto/frete; os valores mensais usam o total do pedido.
5. Se necessário, use **Exportar CSV**. Os valores são demonstrativos, sem cobrança real.
6. Na aba **Pedidos**, abra os detalhes, avance a situação na sequência de preparação, envio e entrega e salve transportadora, previsão e rastreio quando conhecidos.
7. **Revisar reservas vencidas** libera pedidos pendentes fora do prazo. A API também executa essa revisão periodicamente.
8. **Simular estorno** registra um estorno sem dinheiro real. Antes do envio, cancela e devolve estoque. Após envio/entrega, não presume devolução física do produto.

**Resultado esperado:** leitura dos dados reais registrados na demonstração e operação dos estados permitidos. Tela vazia não deve ser preenchida com vendas ou números fictícios.

### R11 — Atualizar perfil e trocar senha

**Público:** titular da conta autenticada. **Pré-condições:** serviço disponível e senha atual para troca de senha.

1. Selecione seu nome no cabeçalho ou **Meu perfil** no menu da conta.
2. Edite nome, telefone e endereço principal. E-mail e CPF ficam disponíveis apenas para consulta nesta tela.
3. Para consultar outro endereço, informe o CEP e clique em **Buscar CEP**. Confira os dados retornados, número e complemento. Em caso de falha na consulta, os campos permitem preenchimento manual.
4. Clique em **Salvar alterações** e aguarde a confirmação.
5. Para trocar a senha, preencha **Senha atual**, **Nova senha** e **Confirmar nova senha**. Use pelo menos oito caracteres na nova senha e selecione **Alterar senha**.
6. Ao terminar em um dispositivo compartilhado, selecione **Sair da conta**.

**Resultado esperado:** dados atualizados para próximas compras. A senha anterior deixa de autenticar novos logins após a troca. A troca de senha encerra sessões anteriores, inclusive a atual; entre novamente usando a nova senha.

### R12 — Comparar modelos

**Público:** todos. **Pré-condições:** catálogo disponível.

1. Selecione **Comparar** no produto ou nos resultados do quiz.
2. No comparador, adicione até três modelos e role a tabela lateralmente no celular.
3. Compare preço, disponibilidade, tamanhos, dados técnicos e avaliações. **Não informado** indica ausência de dado confirmado.
4. Remova um modelo antes de adicionar um quarto. Abra o nome do produto para voltar aos detalhes.

**Resultado esperado:** comparação da seleção salva neste navegador.

### R13 — Encontrar opções pelo quiz

**Público:** todos. **Pré-condições:** catálogo disponível.

1. Abra **Descubra** no menu.
2. Informe orçamento máximo e finalidade e selecione **Encontrar modelos**.
3. Leia os motivos mostrados em cada resultado. Sem ficha técnica, a finalidade não é inferida pelo nome.
4. Compare ou abra o produto antes de escolher.

**Resultado esperado:** seleção transparente por orçamento, disponibilidade e finalidade cadastrada, sem promessa de adequação individual.

### R14 — Favoritos e rotação

**Público:** cliente autenticado. **Pré-condições:** conta e catálogo disponíveis.

1. Use **Salvar na coleção** na página do produto ou **Salvar** em um cartão.
2. Abra **Minha coleção** pelo menu da conta.
3. Em um favorito, escolha dia a dia, velocidade ou prova e selecione **Organizar par**.
4. Confira sua rotação e use os controles de remoção quando necessário.

**Resultado esperado:** favoritos e organização vinculados à conta, disponíveis após novo login.

### R15 — Acompanhar reposições e avisos

**Público:** cliente autenticado. **Pré-condições:** opção de produto esgotada.

1. Na página do produto, selecione cor e tamanho sem estoque.
2. Use **Avise quando chegar**.
3. Consulte **Minha coleção → Reposições que você acompanha**. É possível parar de acompanhar.
4. Após reposição, o aviso aparece em **Seus avisos**. Use **Marcar como lida** quando terminar.

**Resultado esperado:** notificação dentro da conta. O alerta não envia publicidade por e-mail e não reserva unidades para o cliente.

### R16 — Avaliar uma compra entregue

**Público:** titular de um pedido entregue. **Pré-condições:** entrega registrada.

1. Abra os detalhes em **Meus pedidos**.
2. No item comprado, abra **Avaliar este produto**.
3. Escolha nota, ajuste do tênis e comentário e selecione **Publicar avaliação**.

**Resultado esperado:** avaliação de compra verificada na página do produto. É permitida uma avaliação por produto naquele pedido; conteúdo pode ser ocultado pela moderação.

### R17 — Consultar marcas e contatos

**Público:** todos. **Pré-condições:** serviço disponível.

1. Abra **Marcas** no menu.
2. Cada fabricante oferece os mesmos controles: **Ver modelos**, **Site oficial** e **Atendimento oficial**.
3. Para pedidos desta demonstração, use a própria conta Sport Kicks. Os canais dos fabricantes não operam esses pedidos.

**Resultado esperado:** acesso equilibrado a Adidas, ASICS, New Balance, Nike e Olympikus, sem alegação de parceria oficial.

### R18 — Recuperar acesso por e-mail

**Público:** titular da conta. **Pré-condições:** serviço de e-mail configurado pelo responsável.

1. No login, use **Esqueci minha senha**.
2. Informe o e-mail da conta e solicite as instruções.
3. Abra o link recebido em até 20 minutos e informe a nova senha duas vezes.
4. Volte ao login. O link é de uso único e as sessões anteriores são encerradas.

**Resultado esperado:** nova senha definida sem expor a antiga. Se o envio não estiver configurado, a tela informa essa indisponibilidade; procure o responsável pela demonstração.

## 4. Mensagens e orientações

Mensagens abaixo transcritas do código, sem os ícones decorativos. Algumas dependem de uma situação específica para aparecer. Conferir a procedência na seção de referências do roteiro.

| Mensagem | Significado para o usuário | O que fazer |
| --- | --- | --- |
| CPF inválido. Verifique os dígitos informados. | O CPF não passou pela verificação. | Revise todos os números antes de reenviar. |
| CEP não encontrado | A consulta não localizou o CEP. | Confira os oito números e tente novamente. |
| Erro ao buscar CEP | Não foi possível concluir a consulta do endereço. | Verifique a conexão e avise o responsável se persistir. |
| Endereço encontrado! | O endereço foi retornado pela consulta de CEP. | Confira os campos e informe o número. |
| Preencha todos os campos obrigatórios (*). | Há dados obrigatórios faltando no cadastro. | Revise os campos marcados e complete o formulário. |
| E-mail já cadastrado. | Já existe conta com esse e-mail. | Use o login da conta existente ou solicite orientação. |
| CPF já cadastrado. | O documento já pertence a uma conta cadastrada. | Não criar duplicata; procure o responsável. |
| Credenciais inválidas. | E-mail ou senha não foram aceitos. | Confira os dados da conta da loja, sem compartilhar a senha. |
| Preencha e-mail e senha. | O login está incompleto. | Preencha os dois campos. |
| Produto sem estoque disponível! | Não há quantidade disponível para seleção. | Escolha outro item ou aguarde reposição. |
| Estoque insuficiente. Disponível: [quantidade] | A quantidade solicitada supera a informada para o produto. | Reduza a quantidade desejada; a seleção não reserva estoque. |
| Sem conexão com o servidor. Verifique se o backend está rodando. | A loja não conseguiu se comunicar com o serviço. | Verifique o acesso à rede e comunique o responsável; usuário final não precisa alterar configurações técnicas. |
| Pedido registrado! | A API confirmou o registro do pedido. | Confira o número em Ver meu pedido; pagamento permanece pendente. |
| A senha atual não confere. | A senha informada para autorizar a alteração não foi aceita. | Confira a senha atual sem compartilhá-la. |
| Senha alterada com sucesso. | A nova senha foi salva e sessões anteriores foram encerradas. | Entre novamente usando a nova senha. |

## 5. Solução de problemas

| Situação | Verificações e orientação | Quando encaminhar |
| --- | --- | --- |
| P01 — Catálogo não carrega | Confirme o endereço informado, a conexão da estação e se outros participantes têm o mesmo problema. Recarregue uma vez. | Se afetar várias estações, informar a TI ou o responsável pela implantação para verificar o serviço. |
| P02 — Nenhum produto encontrado | Remova busca, categoria e limite de preço com Limpar filtros. | Se continuar sem produtos sem nenhum filtro, solicitar conferência do catálogo cadastrado. |
| P03 — CEP não preenche endereço | Confira os oito números e se a estação tem internet além da rede local. Aguarde a consulta. Não tente desbloquear campos. | Se o CEP correto continuar falhando, avisar o instrutor para verificar disponibilidade ou bloqueio de rede. |
| P04 — Login recusado | Confira o e-mail da loja, a senha e a tecla de maiúsculas. Não usar a conta de conexão do MySQL. | Persistindo, solicitar verificação da conta; use Esqueci minha senha quando o envio por e-mail estiver configurado. |
| P05 — Itens não aparecem em outra estação | A seleção fica no navegador em que foi feita. Verifique se está no mesmo dispositivo e navegador. | Se continuar sem itens no mesmo navegador, informe o problema ao responsável. |
| P06 — Perfil ou pedidos não abrem | Faça login; se a sessão foi recusada, autentique-se novamente. Administração exige conta ADMIN. | Persistindo o erro nas páginas de conta, informe a mensagem ao responsável. |
| P07 — Não sei se o pedido foi registrado | Consulte Meus pedidos antes de confirmar novamente. Uma falha de conexão pode impedir a exibição da resposta. | Se não conseguir consultar, informe ao responsável antes de repetir a operação. |
| P08 — Imagem ou aparência não carrega | Verifique conexão e recarregue a página. Uma imagem ausente não confirma que o produto foi removido. | Informar o nome do item, página e estação ao responsável, sem dados pessoais. |

## 6. Segurança e ajuda

Use somente acessos autorizados; não compartilhe senha, documento ou conta administrativa. Na demonstração, não forneça dados financeiros reais. Em estações compartilhadas, peça orientação para encerrar e limpar a sessão. Para pedir ajuda, informe a rotina deste manual, página, horário e mensagem exibida, sem expor dados pessoais.

## 7. Atualização do manual

Revisão de 27/10/2026: versão 2.0 com catálogo, compras demonstrativas, conta, administração, gráficos e ferramentas de escolha integrados. O manual deverá ser revisto novamente quando forem concluídos integrações comerciais externas ou novas regras de operação. A revisão precisa conferir telas e mensagens antes de substituir orientações previstas por procedimentos operacionais. Consulte o roteiro integrado para o vínculo entre rotinas, módulos e critérios de validação.

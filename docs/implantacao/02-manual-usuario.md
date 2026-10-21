# Manual do usuário

**Sport Kicks — ecommerce de artigos esportivos**  
Versão operacional de demonstração · 1.0 · 21/10/2026  
Sistema em desenvolvimento — leia as limitações antes de praticar.

## 1. Como usar este manual

Este manual explica as telas existentes da loja. Use R01 a R06 para consulta, cadastro, login e seleção de produtos. R07 explica a simulação de checkout. R08 a R10 apresentam rotinas solicitadas que ainda não estão disponíveis em telas completas.

O projeto segue a estrutura do documento **Sistema_ecommerce_7_tabelas (1).md**, adaptada de sucos para artigos esportivos. A atividade de 21/10/2026 pede orientações compatíveis com o estágio do sistema. Os anexos A e B citados na avaliação não foram fornecidos; as mensagens abaixo foram conferidas no código desta versão.

**Não use o checkout como confirmação de compra, pagamento ou entrega.** Não informe dados reais de cartão na demonstração. A mensagem de sucesso da simulação não significa que um pedido foi salvo.

## 2. Acesso, perfis e situação da versão

Abra a loja pelo endereço fornecido pelo responsável. Visitantes podem consultar o catálogo e selecionar produtos. Clientes podem criar conta e entrar. Administradores terão gestão de catálogo, estoque e relatórios quando o painel estiver concluído. A logística é um perfil de trabalho do treinamento, sem conta específica no sistema.

| Recurso | Situação nesta versão | Orientação |
| --- | --- | --- |
| Vitrine, catálogo, busca, filtros e detalhes | Telas implementadas, conectadas à consulta de produtos | Pode praticar R01–R03; confirme que o servidor está disponível. |
| Cadastro, CPF, consulta de CEP e login | Telas e serviços implementados; integração de CEP depende de internet | Pode praticar R04–R05 com dados autorizados. |
| Selecionar produto para o carrinho | Gravação local implementada, com aviso de adição | Pode praticar R06; o aviso não comprova venda ou reserva de estoque. |
| Página do carrinho | Incompleta: a função que monta a lista na tela ainda não existe | Não usar a página para validar remoção, quantidades ou total. |
| Checkout | Simulação; não envia a compra ao registro de pedidos | Usar R07 somente para demonstração. |
| Perfil, histórico e painel administrativo | Telas ausentes, embora existam serviços no backend | Links podem não abrir; aguardar conclusão. |
| Estoque, entregas e relatórios com gráficos | Serviços existentes; experiência visual ainda pendente | Não há procedimento operacional de tela liberado. |

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

**Resultado esperado:** detalhes do produto escolhido. Se o serviço falhar, esta versão pode mostrar dados de demonstração para alguns produtos; não use esses dados como prova de disponibilidade real.

### R04 — Criar uma conta

**Público:** cliente. **Pré-condições:** acesso à loja, serviço disponível, internet para consulta de CEP e dados autorizados para o treinamento. Não use identidade de terceiros.

1. Abra **Entrar** e depois **Criar conta grátis**, ou o link **Cadastro** da página inicial.
2. Informe nome completo, e-mail, CPF e senha. O formulário exige senha com pelo menos seis caracteres. Telefone é opcional.
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

**Resultado esperado:** identificação do usuário e retorno à loja. Links para perfil, pedidos ou administração ainda podem apontar para páginas não concluídas. Se o login falhar, revise o e-mail e a senha; não há recuperação de senha implementada nesta versão.

Em estação compartilhada, não salve a senha no navegador. Ao terminar, solicite ao responsável a limpeza dos dados da sessão conforme a política local, pois ainda não há botão de saída disponível nas telas analisadas. Fechar a aba sozinho não apaga os dados salvos no navegador.

### R06 — Selecionar um produto para o carrinho

**Público:** visitante ou cliente. **Pré-condições:** produto disponível e navegador permitindo armazenamento local.

1. No catálogo, selecione o botão com ícone de carrinho do produto, ou **Adicionar ao carrinho** nos detalhes.
2. Aguarde o aviso de adição. Evite cliques repetidos sem conferir a quantidade desejada.
3. Se aparecer aviso de estoque insuficiente, não continue tentando aumentar a quantidade. Se estiver esgotado, escolha outro produto.

**Resultado esperado:** seleção salva no navegador utilizado. Não é pedido, pagamento ou reserva de estoque. Outro navegador ou computador não terá necessariamente os mesmos itens.

**Limite conhecido:** a página visual do carrinho ainda não monta a lista. A seleção também não substitui a verificação final de estoque. Não tratar os controles atuais como garantia de disponibilidade para uma compra real.

### R07 — Conhecer a simulação de checkout

**Público:** participante acompanhado pelo instrutor. **Pré-condições:** item selecionado em R06 e ciência de que não haverá compra real. Se o acesso pelo carrinho falhar, o instrutor pode abrir a página de checkout já existente pelo endereço disponibilizado para a demonstração.

1. Confira o resumo mostrado no checkout. Alguns campos já contêm dados de demonstração; não os considere seus dados de entrega.
2. Observe as opções de cartão e PIX apenas para conhecer a apresentação da tela. Não informe cartão real nem tente pagar o QR Code de demonstração.
3. Somente no exercício orientado, selecione **Confirmar Pagamento**.
4. Observe a mensagem de pagamento simulado e o esvaziamento da seleção local.

**Resultado esperado:** demonstração visual concluída. O procedimento não salva pedido, não comprova cobrança e não deduz estoque no banco. O checkout atual também não exige login, diferente da regra solicitada para a versão final.

Os descontos e o frete ainda não estão consistentes entre todas as telas. O texto “PIX (5% off)” no carrinho não garante aplicação do desconto. Não use os valores da demonstração para cobrança ou orçamento definitivo.

### R08 — Cadastro de produtos e controle de estoque — previsto

**Público:** administrador e operador orientado. **Pré-condições futuras:** painel administrativo concluído e acesso autorizado.

O documento de requisitos prevê cadastrar e consultar produtos, atualizar preço e categoria e registrar entradas e saídas de estoque. Existem serviços para isso, mas não há tela administrativa pronta. Não há sequência de botões disponível para orientar o usuário final. Até a conclusão, informe divergências ao responsável pela implantação; não altere o banco diretamente.

**Resultado esperado futuro:** catálogo e estoque atualizados por usuário autorizado. **Resultado atual do treinamento:** reconhecer a pendência e a responsabilidade pelo ajuste, sem declarar execução prática.

### R09 — Pedido, histórico e entrega — previsto

**Público:** cliente e equipe responsável pela operação. **Pré-condições futuras:** compra integrada, login obrigatório e telas de histórico e entrega concluídas.

A especificação prevê gravar o pedido, seus itens e a entrega, deduzir estoque e permitir consulta das compras anteriores. Embora existam serviços no backend, o checkout atual não realiza esse fluxo. Não há acompanhamento de entrega disponível em uma tela pronta.

**Resultado esperado futuro:** pedido identificável e consulta de situação da entrega. **Resultado atual do treinamento:** distinguir seleção local, simulação e venda registrada. Não prometer rastreio nem prazo com base na simulação.

### R10 — Consultar relatórios — previsto

**Público:** administrador. **Pré-condições futuras:** painel, autorização e gráficos concluídos, com dados de vendas e estoque validados.

A especificação pede dois relatórios com gráficos. O backend contém consultas de vendas por categoria, faturamento e estoque, mas as telas de gráficos não foram implementadas. O treinamento atual explica a finalidade dos relatórios, sem apresentar filtros, botões ou mensagens inexistentes.

**Resultado esperado futuro:** apoiar decisões com relatórios visuais. **Resultado atual do treinamento:** reconhecer o recurso pendente e evitar interpretar ausência de vendas de demonstração como falha de relatório.

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
| Parabéns! O seu pagamento simulado foi aprovado com sucesso. | A demonstração visual terminou. | Não interpretar como pagamento real ou pedido registrado. |

## 5. Solução de problemas

| Situação | Verificações e orientação | Quando encaminhar |
| --- | --- | --- |
| P01 — Catálogo não carrega | Confirme o endereço informado, a conexão da estação e se outros participantes têm o mesmo problema. Recarregue uma vez. | Se afetar várias estações, informar a TI ou o responsável pela implantação para verificar o serviço. |
| P02 — Nenhum produto encontrado | Remova busca, categoria e limite de preço com Limpar filtros. | Se continuar sem produtos sem nenhum filtro, solicitar conferência do catálogo cadastrado. |
| P03 — CEP não preenche endereço | Confira os oito números e se a estação tem internet além da rede local. Aguarde a consulta. Não tente desbloquear campos. | Se o CEP correto continuar falhando, avisar o instrutor para verificar disponibilidade ou bloqueio de rede. |
| P04 — Login recusado | Confira o e-mail da loja, a senha e a tecla de maiúsculas. Não usar a conta de conexão do MySQL. | Persistindo, solicitar verificação da conta; não há tela pronta de recuperação de senha. |
| P05 — Itens não aparecem em outra estação | A seleção fica no navegador em que foi feita. Verifique se está no mesmo dispositivo e navegador. | Se a página do carrinho não mostrar itens, considerar também a limitação conhecida dessa tela. |
| P06 — Link de perfil, pedidos ou administração não abre | Essas telas não foram concluídas. Retorne à página inicial ou ao catálogo. | Registrar como pendência de desenvolvimento; não refazer o cadastro. |
| P07 — Simulação terminou, mas não há pedido ou baixa de estoque | Esse é o comportamento da versão atual; a simulação não registra venda. | Não repetir como tentativa de cobrança. Informar a limitação ao participante e aguardar integração. |
| P08 — Imagem ou aparência não carrega | Verifique conexão e recarregue a página. Uma imagem ausente não confirma que o produto foi removido. | Informar o nome do item, página e estação ao responsável, sem dados pessoais. |

## 6. Segurança e ajuda

Use somente acessos autorizados; não compartilhe senha, documento ou conta administrativa. Na demonstração, não forneça dados financeiros reais. Em estações compartilhadas, peça orientação para encerrar e limpar a sessão. Para pedir ajuda, informe a rotina deste manual, página, horário e mensagem exibida, sem expor dados pessoais.

## 7. Atualização do manual

Este manual deve ser revisado quando forem concluídos carrinho, compra real, perfil, histórico, administração e gráficos. A revisão precisa conferir telas e mensagens antes de substituir orientações previstas por procedimentos operacionais. Consulte o roteiro integrado para o vínculo entre rotinas, módulos e critérios de validação.

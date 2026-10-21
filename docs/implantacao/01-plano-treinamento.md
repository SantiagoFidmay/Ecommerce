# Plano de treinamento e matriz de necessidades

**Sport Kicks — ecommerce de artigos esportivos**  
Avaliação prática de Implantação de Sistemas — SENAI/SC  
Data: 21/10/2026 · Versão: 1.0 · Situação: projeto em desenvolvimento  
Estudante: ____________________ · Docente: José Ricardo Maçaneiro

## 1. Objetivo e referências

Capacitar os usuários para consultar produtos, criar uma conta, entrar na loja e selecionar itens, reconhecendo as limitações da versão atual. Preparar a equipe para a futura operação de vendas, estoque e entregas, sem tratar recursos pendentes como disponíveis.

Referências: avaliação prática de 21/10/2026, documento **Sistema_ecommerce_7_tabelas (1).md** e arquivos atuais do projeto. O Markdown descreve uma loja de sucos; neste projeto, o domínio foi adaptado para tênis e artigos esportivos, mantendo as sete entidades: usuário, produto, categoria, estoque, pedido, item do pedido e entrega. A adequação dessa mudança de domínio deve ser validada com o docente.

O PDF informa “Lista de anexos: N/A”, mas sua lista de verificação menciona anexos A e B. Esses anexos não foram fornecidos. Por isso, os perfis, módulos e horários abaixo são propostas baseadas na contextualização e no Markdown, e as mensagens foram conferidas no código. Não se atribuem aos anexos regras que não puderam ser consultadas.

## 2. Matriz de necessidades por perfil

Os três perfis abaixo são perfis de trabalho para o treinamento. O sistema prevê apenas os tipos de conta CLIENTE e ADMIN; não existe conta específica de logística.

| Perfil | Necessidades de aprendizagem | Acesso e limitações | Módulos |
| --- | --- | --- | --- |
| P1 — Cliente / usuário iniciante | • Encontrar produtos e comparar preços.<br>• Preencher cadastro, CPF e endereço.<br>• Entrar com a própria conta.<br>• Reconhecer estoque e simulação de pagamento. | Consulta pública; conta pessoal para identificação. Precisa de apoio com navegador e formulários. Não recebe acesso administrativo. | M1, M2, M3 |
| P2 — Administrador / responsável pelo catálogo | • Orientar clientes nas rotinas existentes.<br>• Distinguir cadastro de produto de movimentação de estoque.<br>• Entender as futuras consultas de vendas e gráficos.<br>• Reconhecer permissões e pendências antes de liberar a operação. | Conta ADMIN quando provisionada pela equipe responsável. Existem serviços no backend, mas não há painel administrativo pronto para treinamento operacional. | M1, M2, M3, M4, M5 |
| P3 — Operador de estoque e logística | • Identificar produto, quantidade e indisponibilidade.<br>• Entender o vínculo entre pedido, estoque e entrega.<br>• Registrar e comunicar divergências.<br>• Reconhecer quais rotinas ainda dependem de conclusão. | Perfil de trabalho proposto; não existe permissão própria de logística. Não compartilhar conta de administrador. Treino atual limitado à consulta e à explicação do fluxo previsto. | M1, M3, M4, M5 |

## 3. Estrutura do ambiente e preparação

O cenário fornecido considera estações de trabalho, rede local, regras da TI, usuários em turnos e diferentes níveis de familiaridade com tecnologia. Não define número de computadores, turnos, duração disponível ou política detalhada de acesso. Esses pontos devem ser confirmados com o responsável antes da turma.

- Reservar estação com navegador atualizado e teclado, ou dispositivo móvel para consulta. Usar conexão e equipamentos autorizados pela TI.
- Disponibilizar o endereço da loja pelo responsável. Na configuração atual, o frontend aponta para o servidor local; acesso a partir de outro computador ainda precisa de configuração e teste pela equipe técnica.
- Confirmar disponibilidade do serviço da loja e do banco antes da aula. Acesso à rede local não garante acesso à internet para a consulta de CEP.
- Verificar se a política de rede permite o serviço de CEP. Se estiver indisponível, adiar a parte do cadastro que depende do endereço.
- Usar contas e dados de teste autorizados, sem documentos, cartões ou senhas reais nas projeções. Não criar contas coletivas de administrador.
- Guardar os PDFs no local permitido pela TI para consulta durante indisponibilidade da rede. O PDF auxilia a consulta, mas não faz o sistema funcionar sem conexão.
- Oferecer demonstração guiada antes da prática individual. Ajustar zoom e ritmo conforme a necessidade de leitura e uso do mouse.

## 4. Módulos e programação proposta

**Carga proposta: 120 minutos por turma**, em três blocos de 40 minutos. Os 120 minutos indicados no PDF para produzir a avaliação não são uma duração obrigatória do treinamento; a carga abaixo é uma proposta didática. Repetir os blocos para cada turno, em horários validados com o setor, mantendo o mesmo roteiro e uma passagem de informações entre instrutores.

| Módulo | Tempo | Público | Rotinas do manual | Método e resultado verificável |
| --- | --- | --- | --- | --- |
| M1 — Acesso e consulta | 20 min | P1, P2, P3 | R01, R02, R03 | Demonstrar a abertura da loja; praticar busca e filtro. Cada participante localiza um produto e informa seu preço. |
| M2 — Conta e identificação | 20 min | P1, P2 | R04, R05 | Demonstrar CPF, CEP e login; prática individual com dados autorizados. Participante reconhece erro de cadastro e entra na própria conta de teste. P3 pode acompanhar sem criar conta. |
| M3 — Seleção e limites da compra | 25 min | P1, P2, P3 | R06, R07 | Adicionar item disponível, observar o aviso e discutir os limites do carrinho e do checkout. Participante explica por que a simulação não comprova venda nem pagamento. |
| M4 — Catálogo, estoque e logística previstos | 25 min | P2, P3 | R08, R09, R10 | Explicação do fluxo solicitado e das pendências. Não demonstrar painel inexistente. Participante identifica o responsável por uma divergência e o que falta para operação real. |
| M5 — Segurança, problemas e revisão | 30 min | P2, P3; P1 na revisão orientada | R01–R10, seção de problemas | Exercícios de diagnóstico, checklist e revisão. Participante distingue falha de rede, erro de credencial e recurso pendente. Registrar dúvidas para o próximo turno. |

Distribuição: bloco 1 = M1 + M2; bloco 2 = M3 + primeiros 15 minutos de M4; bloco 3 = últimos 10 minutos de M4 + M5. Para clientes, a revisão do M5 pode ser antecipada como orientação individual; o tempo efetivamente cursado deve constar no registro.

## 5. Avaliação e evidências

Para as rotinas disponíveis, o participante deverá localizar produto e preço, reconhecer um filtro, interpretar uma mensagem, usar a própria conta de teste quando aplicável e explicar que não há compra real no checkout atual. O instrutor registra **realizou sem ajuda**, **realizou com ajuda**, **precisa repetir** ou **não aplicável / bloqueado** em cada rotina.

As rotinas pendentes recebem somente avaliação de compreensão do fluxo. Não registrar domínio operacional de estoque, entrega ou relatórios sem prática em telas concluídas. Reforço: repetir o módulo em que houve dificuldade, com orientação individual e nova tentativa na próxima turma ou horário combinado.

Evidências propostas: lista de presença por turno, ficha de execução por participante, dúvidas recorrentes e registro de impedimentos. Não coletar senhas, CPF completo ou imagens com dados pessoais. O responsável pela implantação guarda os registros conforme as regras internas da instituição.

## 6. Responsabilidades e liberação

O instrutor demonstra, acompanha a prática e registra dificuldades; o responsável pelo setor confirma disponibilidade e participantes; a TI verifica acesso e disponibilidade técnica; a equipe de desenvolvimento corrige pendências. Esses papéis são uma organização proposta, não cargos comprovados nos anexos ausentes.

A liberação para operação real depende da conclusão do pedido integrado ao estoque, das telas administrativas e de testes completos de acesso e permissões. Até lá, o treinamento é de consulta, cadastro, login e demonstração. Para o checklist e a ficha de execução, consultar o documento **Roteiro integrado e rastreabilidade**.

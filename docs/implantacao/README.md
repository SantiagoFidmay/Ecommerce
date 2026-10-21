# Entrega — avaliação prática de Implantação de Sistemas

Material elaborado para a atividade de 21/10/2026, alinhado ao documento `Sistema_ecommerce_7_tabelas (1).md` e ao estágio atual da Sport Kicks. O sistema permanece em desenvolvimento. Esta entrega acrescenta documentação e acesso à ajuda; não conclui as funcionalidades pendentes.

## Arquivos para revisão

| Entrega | Fonte editável | PDF para entrega |
| --- | --- | --- |
| Plano e matriz de necessidades | [01-plano-treinamento.md](01-plano-treinamento.md) | [Plano em PDF](../../frontend/ajuda/01-plano-treinamento.pdf) |
| Manual operacional | [02-manual-usuario.md](02-manual-usuario.md) | [Manual em PDF](../../frontend/ajuda/02-manual-usuario.pdf) |
| Roteiro, checklist e rastreabilidade | [03-roteiro-integrado.md](03-roteiro-integrado.md) | [Roteiro em PDF](../../frontend/ajuda/03-roteiro-integrado.pdf) |

Acesse o link **Ajuda** na página inicial ou abra `frontend/pages/ajuda.html`. As páginas de ajuda têm sumário, navegação entre os três documentos, impressão e download dos PDFs, sem depender do backend ou de bibliotecas externas no navegador.

## Atualizar os documentos

Edite os Markdown e execute na raiz do projeto:

```powershell
python -m pip install -r tools/requirements-docs.txt
python tools/gerar_documentacao.py --pdf
```

O gerador procura Chrome ou Edge no Windows; também aceita `--chrome CAMINHO`. Os PDFs ficam dentro do frontend para permitir download mesmo se ele for hospedado separado do backend. O gerador usa um perfil temporário de navegador, sem acessar a sessão pessoal.

## Pontos que exigem validação do responsável

- Preencher o nome do estudante, revisar a autoria e compreender o material antes da apresentação.
- Confirmar com o docente a adaptação de sucos para artigos esportivos.
- Obter os anexos A e B, caso existam: foram citados nos critérios, mas não acompanhavam o PDF fornecido.
- Confirmar turnos, estações, contas de teste, horários, política de acesso e responsáveis locais. Os documentos deixam esses dados como propostas ou campos a preencher.
- Rever carrinho, checkout, perfil, histórico e administração antes de liberar treinamento de operação real. As limitações encontradas estão no manual e no roteiro.

As fontes registradas no roteiro são o PDF, o Markdown e o código do projeto. A comparação documental não equivale a homologação completa do ecommerce.

## Verificações desta entrega

- PDFs gerados e reabertos para conferir presença de texto em todas as páginas: plano com 4 páginas, manual com 6 e roteiro com 5.
- Links locais das três páginas de apoio conferidos, incluindo downloads dos PDFs.
- Páginas de ajuda, treinamento e roteiro verificadas em navegador nos tamanhos 390 × 844 e 1366 × 768, sem transbordamento horizontal.
- Alterações verificadas com `git diff --check`. As mudanças anteriores no backend e em `.env.example` foram preservadas.

Essas verificações abrangem a entrega documental e suas páginas; não comprovam o funcionamento integral dos fluxos do ecommerce.

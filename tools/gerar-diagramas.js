const fs = require('node:fs/promises')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const { chromium } = require(path.join(root, 'backend/node_modules/playwright'))
const escape = str => str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
const text = (x,y,str,size=18,anchor='start') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="#172033" font-family="Arial,sans-serif">${escape(str)}</text>`
const inicio = (w,h,titulo) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="white"/>${text(40,36,titulo,24)}<defs><marker id="seta" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M2,2 L10,6 L2,10" fill="none" stroke="#334155" stroke-width="1.5"/></marker></defs>`
function caixa(x,y,nome,campos) {
    return `<rect x="${x}" y="${y}" width="320" height="180" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="2"/><rect x="${x}" y="${y}" width="320" height="40" fill="#dbeafe"/>${text(x+160,y+27,nome,20,'middle')}<path d="M${x},${y+40}H${x+320}" stroke="#334155"/>`+campos.map((c,i)=>text(x+14,y+67+i*23,c,16)).join('')
}
const linha = (x1,y1,x2,y2,label,tx,ty) => `<path d="M${x1},${y1}L${x2},${y2}" fill="none" stroke="#334155" stroke-width="2" marker-end="url(#seta)"/>${text(tx,ty,label,16,'middle')}`
function classes() {
    let svg=inicio(1800,1040,'Sport Kicks — UML das sete classes de base')
    for(const [x,y,nome,campos] of [
        [60,80,'Usuario',['codUsuario: int (PK)','nome, email, cpf: string','senha: hash bcrypt','tipo_usuario: CLIENTE | ADMIN','endereço, telefone: string']],
        [520,80,'Pedido',['codPedido: int (PK)','idUsuario: int (FK)','dataPedido: datetime','status: enum','valorSubtotal, valorTotal: decimal']],
        [980,80,'Entrega',['codEntrega: int (PK)','idPedido: int (FK, único)','status: enum','endereco_entrega: string','rastreio, previsão, entrega']],
        [520,430,'ItemPedido',['codItemPedido: int (PK)','idPedido, idProduto: int (FK)','idVariante: int? (FK)','quantidade: int','preco_unitario, subtotal: decimal']],
        [980,430,'Produto',['codProduto: int (PK)','idCategoria, idMarca: int (FK)','nome, marca: string','preco, preco_promocional: decimal','ativo, destaque: boolean']],
        [1420,430,'Categoria',['codCategoria: int (PK)','nome: string','descricao: text','icone: string','ativo: boolean']],
        [980,800,'Estoque',['codEstoque: int (PK)','idProduto: int (FK, único)','quantidade: int','quantidade_minima: int','ultima_atualizacao: datetime']]
    ]) svg+=caixa(x,y,nome,campos)
    svg+=linha(380,170,520,170,'1 → 0..*',450,150)+linha(840,170,980,170,'1 → 0..1',910,150)+linha(680,260,680,430,'1 contém 1..*',760,350)+linha(980,520,840,520,'1 → 0..*',910,500)+linha(1420,520,1300,520,'1 → 0..*',1360,500)+linha(1140,610,1140,800,'1 → 0..1',1210,720)
    svg+=text(40,1020,'Extensões: marcas, variantes, mídia, ficha, pagamentos demo, reservas, coleção e segurança. Consulte engenharia.md.',17)
    return svg+'</svg>'
}
function ator(x,y,nome) {
    return `<circle cx="${x}" cy="${y}" r="23" fill="#dbeafe" stroke="#334155" stroke-width="2"/><path d="M${x},${y+23}v75m-40,-45h80m-40,45l-35,55m35,-55l35,55" fill="none" stroke="#334155" stroke-width="3"/>${text(x,y+185,nome,20,'middle')}`
}
function oval(x,y,label) {
    const palavras=label.split(' '); let a='',b=''; for(const p of palavras) { if((a+' '+p).trim().length<=28&&!b)a=(a+' '+p).trim(); else b=(b+' '+p).trim() }
    return `<ellipse cx="${x}" cy="${y}" rx="210" ry="55" fill="#eff6ff" stroke="#334155" stroke-width="2"/>${text(x,y+(b?-7:7),a,17,'middle')}${b?text(x,y+19,b,17,'middle'):''}`
}
function casos() {
    let svg=inicio(1800,1320,'Sport Kicks — casos de uso da demonstração')
    svg+='<rect x="350" y="100" width="1100" height="1160" rx="8" fill="none" stroke="#334155" stroke-width="2"/>'+text(900,135,'Sistema Sport Kicks',22,'middle')
    svg+=ator(140,190,'Visitante')+ator(140,750,'Cliente')+ator(1660,570,'Administrador')
    const esquerdas=['Consultar catálogo e marcas','Comparar e responder quiz','Cadastrar conta e entrar','Gerenciar perfil e coleção','Comprar e simular pagamento','Consultar e cancelar pedido','Avaliar compra entregue']
    const direitas=['Gerenciar catálogo e categorias','Movimentar e transferir estoque','Operar pedidos e entregas','Gráficos e exportação CSV','Moderar avaliações e acessos']
    esquerdas.forEach((label,i)=>{const y=220+i*150;svg+=`<path d="M180,${i<3?280:840}L430,${y}" stroke="#64748b" fill="none"/>`+oval(640,y,label)})
    direitas.forEach((label,i)=>{const y=250+i*210;svg+=`<path d="M1620,660L1400,${y}" stroke="#64748b" fill="none"/>`+oval(1190,y,label)})
    return svg+'</svg>'
}
async function gerar() {
    const destino=path.join(root,'docs/diagramas');await fs.mkdir(destino,{recursive:true})
    const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe'
    let existe=false;try{await fs.access(chrome);existe=true}catch{}
    const browser=await chromium.launch({headless:true,...(existe?{executablePath:chrome}:{})})
    try{for(const [nome,svg,w,h] of [['classes',classes(),1800,1040],['casos-de-uso',casos(),1800,1320]]){
        await fs.writeFile(path.join(destino,nome+'.svg'),svg)
        const page=await browser.newPage({viewport:{width:w,height:h}});await page.setContent('<html><body style="margin:0">'+svg+'</body></html>');await page.screenshot({path:path.join(destino,nome+'.png')});await page.close();console.log(`Diagrama: docs/diagramas/${nome}.png`)
    }}finally{await browser.close()}
}
gerar().catch(err=>{console.error(err.message);process.exitCode=1})

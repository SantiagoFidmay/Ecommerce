const { test }=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs/promises')
const path=require('node:path')
const root=path.resolve(__dirname,'../..')
test('build contém só arquivos públicos, configuração da API e links locais válidos',async()=>{
    process.env.API_BASE_URL='https://api.example.test/api'
    await require('../../tools/build-site').build()
    const dir=path.join(root,'dist')
    const config=await fs.readFile(path.join(dir,'js/config.js'),'utf8')
    assert.match(config,/https:\/\/api.example.test\/api/)
    for(const nome of ['.env','backend','.backups','node_modules']) {
        await assert.rejects(fs.access(path.join(dir,nome)))
    }
    const paginas=['index.html',...(await fs.readdir(path.join(dir,'pages'))).filter(n=>n.endsWith('.html')).map(n=>'pages/'+n)]
    const ausentes=[]
    for(const pagina of paginas){
        const html=await fs.readFile(path.join(dir,pagina),'utf8')
        for(const [,ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
            if(!ref||ref.startsWith('#')||ref.includes('${')||/^(https?:|mailto:|data:|javascript:)/.test(ref))continue
            const url=new URL(ref,'https://site.example.test/'+pagina)
            const destino=path.resolve(dir,'.'+decodeURIComponent(url.pathname))
            if(!destino.startsWith(dir+path.sep))continue
            try{await fs.access(destino)}catch{ausentes.push(pagina+': '+ref)}
        }
    }
    assert.deepEqual(ausentes,[])
})

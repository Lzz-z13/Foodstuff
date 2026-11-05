param(
    [ValidateSet('start', 'stop', 'status')]
    [string]$Action = 'status'
)
$ErrorActionPreference = 'Stop'
$apiRoot = Split-Path $PSScriptRoot -Parent
Push-Location $apiRoot
try {
    if ($Action -eq 'stop') {
        docker compose -f compose.cloudflare.yml down
        if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel parar o tunel.' }
        Write-Host 'Tunel parado. A API e o banco local continuam funcionando.'
        return
    }
    if ($Action -eq 'start') {
        docker compose up -d
        if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel iniciar a API e o banco. Abra o Docker Desktop e tente novamente.' }
        # Consulta somente leitura. Nao publique os usuarios de demonstracao
        # com a senha conhecida presente no SQL de desenvolvimento.
        $check = @'
require("dotenv-safe").config({quiet:true});
const db = require("./src/database/connect");
const bcrypt = require("bcrypt");
(async () => {
  try {
    const [users] = await db.execute("SELECT password FROM users WHERE is_active = 1");
    for (const user of users) {
      if (await bcrypt.compare("admin", user.password)) {
        console.error("Altere as senhas padrao dos usuarios ativos antes de publicar.");
        process.exitCode = 1;
        return;
      }
    }
    console.log("Banco acessivel; nenhuma senha padrao admin encontrada.");
  } finally { await db.end(); }
})().catch(() => { console.error("Falha ao verificar o banco."); process.exitCode = 1; });
'@
        $check | docker compose exec -T app node
        if ($LASTEXITCODE -ne 0) { throw 'Verificacao falhou. O tunel nao foi iniciado.' }
        $health = Invoke-RestMethod 'http://localhost:5000/api/foodstuff/health/db' -TimeoutSec 10
        if ($health.status -ne 'ok') { throw 'Banco indisponivel.' }
        docker compose -f compose.cloudflare.yml up -d
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar o tunel.' }
        Write-Host 'Tunel iniciado. Aguarde alguns segundos e execute este script com status para obter a URL.'
    }
    docker compose -f compose.cloudflare.yml ps
    $logs = docker compose -f compose.cloudflare.yml logs --no-color 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel ler o status do tunel.' }
    $urls = [regex]::Matches($logs, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($urls.Count -gt 0) {
        $publicUrl = $urls[$urls.Count - 1].Value
        Write-Host "URL registrada nos logs (verifique se o container esta ativo): $publicUrl"
        Write-Host "Base da API: $publicUrl/api/foodstuff"
        Write-Host "Teste manual: $publicUrl/api/foodstuff/health"
    } else {
        Write-Host 'URL ainda indisponivel. Consulte novamente com status; em caso de falha, use docker compose -f compose.cloudflare.yml logs --tail 50.'
    }
} finally {
    Pop-Location
}

$base = 'http://localhost:3333/api'
function Json($obj) { $obj | ConvertTo-Json -Depth 20 }
function Call($method, $path, $body = $null, $token = $null) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  $params = @{
    Method = $method
    Uri = "$base$path"
    Headers = $headers
    ContentType = 'application/json'
    UseBasicParsing = $true
    TimeoutSec = 20
  }
  if ($null -ne $body) { $params.Body = Json $body }
  Invoke-RestMethod @params
}

$login = Call POST '/auth/login' @{ email = 'calebesaraiva60@gmail.com'; senha = 'Acesso@202425' }
$token = $login.data.token
"login ok: $($login.data.user.email) role=$($login.data.user.role)"
$me = Call GET '/auth/me' $null $token
"me ok: verified=$($me.data.emailVerificado)"
$client = Call POST '/clients' @{ nomeEmpresa = 'Cliente E2E Nexus'; nomeResponsavel = 'Responsavel Teste'; email = 'cliente.e2e@nexus.test'; telefone = '999999999'; cidade = 'Imperatriz'; estado = 'MA'; status = 'ativo'; observacoes = 'Criado no teste ponta a ponta' } $token
$clientId = $client.data.id
"client create ok: $clientId"
$edit = Call PUT "/clients/$clientId" @{ nomeEmpresa = 'Cliente E2E Nexus Editado'; nomeResponsavel = 'Responsavel Teste'; email = 'cliente.e2e@nexus.test'; telefone = '999999999'; cidade = 'Imperatriz'; estado = 'MA'; status = 'ativo'; observacoes = 'Editado no teste ponta a ponta' } $token
"client edit ok: $($edit.data.nomeEmpresa)"
$products = Call GET '/products' $null $token
$packages = Call GET '/packages' $null $token
"catalog ok: products=$($products.data.Count) packages=$($packages.data.Count)"
$pkgId = $packages.data[0].id
$contract = Call POST '/contracts' @{ clientId = $clientId; packageId = $pkgId; titulo = 'Contrato E2E Nexus'; descricao = 'Contrato de teste real'; dataInicio = '2026-06-10'; validadeMeses = 12; diaPagamentoMensal = 15; valorMensal = 500; valorTotalContrato = 6000; valorImplantacao = 1200; entrada = 300; implantacaoParcelada = $true; quantidadeParcelasImplantacao = 3; observacoes = 'Contrato assinado fora do sistema' } $token
"contract ok: charges=$($contract.data.charges.Count) services=$($contract.data.services.Count)"
$charges = Call GET '/charges' $null $token
$chargeId = $charges.data[0].id
$pay = Call PATCH "/charges/$chargeId/pay" @{ metodoPagamento = 'pix'; observacoes = 'Pago no teste E2E' } $token
"pay ok: $($pay.data.charge.status)"
$userEmail = "usuario.e2e.$([guid]::NewGuid().ToString('N').Substring(0,8))@nexus.test"
$user = Call POST '/users' @{ nome = 'Usuario E2E'; email = $userEmail; senha = 'Senha@12345'; role = 'SUPORTE' } $token
"user create ok: $($user.data.email) verified=$($user.data.emailVerificado)"
$dash = Call GET '/dashboard/financial' $null $token
"dashboard ok: clientes=$($dash.data.clientesAtivos) contratos=$($dash.data.contratosAtivos)"
$audit = Call GET '/audit-logs' $null $token
"audit ok: entries=$($audit.data.Count)"
"API_E2E_OK"

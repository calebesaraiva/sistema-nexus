$base = 'http://localhost:3333/api'
function Json($obj) { $obj | ConvertTo-Json -Depth 20 }
function Call($method, $path, $body = $null, $token = $null) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  $params = @{ Method = $method; Uri = "$base$path"; Headers = $headers; ContentType = 'application/json'; UseBasicParsing = $true; TimeoutSec = 25 }
  if ($null -ne $body) { $params.Body = Json $body }
  Invoke-RestMethod @params
}

$login = Call POST '/auth/login' @{ email = 'calebesaraiva60@gmail.com'; senha = 'Acesso@202425' }
$token = $login.data.token
"master login ok"
$wife = Call POST '/auth/login' @{ email = 'Herminiacmaria@gmail.com'; senha = '21012018' }
"second master login ok: $($wife.data.user.email)"

$suffix = [guid]::NewGuid().ToString('N').Substring(0, 8)
$product = Call POST '/products' @{ nome = "Produto E2E $suffix"; descricao = 'Produto criado no teste'; categoria = 'Teste'; precoBase = 1500; ativo = $true } $token
"product create ok"
$product = Call PUT "/products/$($product.data.id)" @{ nome = "Produto E2E $suffix editado"; descricao = 'Produto atualizado no teste'; categoria = 'Teste'; precoBase = 1750; ativo = $true } $token
"product update ok: $($product.data.precoBase)"
$package = Call POST '/packages' @{ nome = "Pacote E2E $suffix"; descricao = 'Pacote criado no teste'; valorMensal = 777; valorImplantacao = 1200; ativo = $true; productIds = @($product.data.id) } $token
"package create ok: products=$($package.data.products.Count)"

$client = Call POST '/clients' @{ nomeEmpresa = "Cliente Projeto $suffix"; nomeResponsavel = 'Responsavel'; email = "cliente.projeto.$suffix@nexus.test"; cidade = 'Imperatriz'; estado = 'MA'; status = 'ativo' } $token
$project = Call POST '/projects' @{ clientId = $client.data.id; titulo = "Projeto E2E $suffix"; descricao = 'Projeto com quadro de tarefas'; status = 'em_andamento' } $token
"project create ok"
$stage = Call POST '/task-stages' @{ nome = "Setor E2E $suffix"; setor = 'Programacao'; ordem = 50; ativo = $true } $token
"stage create ok"
$users = Call GET '/team-users' $null $token
$responsavelId = $users.data[0].id
$task = Call POST '/tasks' @{ projectId = $project.data.id; stageId = $stage.data.id; responsavelId = $responsavelId; titulo = "Task E2E $suffix"; descricao = 'Task com e-mail ao responsável'; prioridade = 'alta' } $token
"task create ok: $($task.data.titulo)"
$approved = Call PATCH "/tasks/$($task.data.id)/approve" $null $token
"task approve ok: $($approved.data.status)"
$rejected = Call PATCH "/tasks/$($task.data.id)/reject" @{ motivoRecusa = 'Ajuste solicitado no teste' } $token
"task reject ok: $($rejected.data.status)"
"CATALOG_TASKS_E2E_OK"

<?php
/**
 * API para buscar os setores de todos os colaboradores do Neon GeTeams.
 * GET /api/all-collaborators-sectors — requer Authorization: Bearer <supabase_access_token>
 */

if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) && empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido.']);
    exit;
}

$configPath = __DIR__ . '/config.php';
$envPath = __DIR__ . '/.env';
if (!is_file($configPath)) {
    http_response_code(503);
    echo json_encode(['error' => 'API não configurada.', 'hint' => 'config.php não encontrado']);
    exit;
}

require_once $configPath;

$supabaseUrl = defined('SUPABASE_URL') ? SUPABASE_URL : '';
$supabaseAnonKey = defined('SUPABASE_ANON_KEY') ? SUPABASE_ANON_KEY : '';
$neonUrl = defined('NEON_GETEAMS_DATABASE_URL') ? NEON_GETEAMS_DATABASE_URL : '';

if (!is_file($envPath) || ($supabaseUrl === '' && $supabaseAnonKey === '')) {
    http_response_code(503);
    echo json_encode(['error' => 'Conexão com banco corporativo não configurada.']);
    exit;
}

if ($supabaseUrl === '' || $supabaseAnonKey === '') {
    http_response_code(500);
    echo json_encode(['error' => 'Serviço de autenticação não configurado.']);
    exit;
}

function getAuthHeader(): string {
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strtolower($name) === 'authorization') return $value;
        }
    }
    if (!empty($_SERVER['HTTP_AUTHORIZATION']))          return $_SERVER['HTTP_AUTHORIZATION'];
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    if (!empty($_SERVER['Authorization']))               return $_SERVER['Authorization'];
    return '';
}

$authHeader = getAuthHeader();
if ($authHeader === '' || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
    http_response_code(401);
    echo json_encode(['error' => 'Token ausente.']);
    exit;
}
$token = trim($m[1]);

$ch = curl_init($supabaseUrl . '/auth/v1/user');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $token,
        'apikey: ' . $supabaseAnonKey,
        'Content-Type: application/json',
    ],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    http_response_code(401);
    echo json_encode(['error' => 'Token inválido ou expirado.']);
    exit;
}

if ($neonUrl === '') {
    http_response_code(503);
    echo json_encode(['error' => 'URL do banco não configurada.']);
    exit;
}

$parsed = parse_url($neonUrl);
$user = $parsed['user'] ?? '';
$pass = $parsed['pass'] ?? '';
$host = $parsed['host'] ?? '';
$port = $parsed['port'] ?? 5432;
$db = ltrim($parsed['path'] ?? '', '/');

$connStr = "host=$host port=$port dbname=$db user=$user password=$pass sslmode=require";
$pg = pg_connect($connStr);

if (!$pg) {
    http_response_code(503);
    echo json_encode(['error' => 'Falha na conexão com banco corporativo.']);
    exit;
}

// UI "Departamento": department_cadeira_principal; se existir coluna departamento, usa como fallback.
$queryWithDeptCol = "SELECT corporate_email, personal_email, email, setor_cadeira_principal, department_cadeira_principal, departamento FROM collaborators WHERE status = $1";
$queryBase = "SELECT corporate_email, personal_email, email, setor_cadeira_principal, department_cadeira_principal FROM collaborators WHERE status = $1";
$res = pg_query_params($pg, $queryWithDeptCol, ['active']);
if (!$res) {
    $res = pg_query_params($pg, $queryBase, ['active']);
}

if (!$res) {
    pg_close($pg);
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao consultar banco.']);
    exit;
}

$map = [];
while ($row = pg_fetch_assoc($res)) {
    // pg_fetch_assoc pode devolver chaves com casing diferente conforme driver/Neon — normalizar.
    $rowLc = array_change_key_case($row, CASE_LOWER);
    $dPrincipal = trim((string)($rowLc['department_cadeira_principal'] ?? ''));
    $dAlt = trim((string)($rowLc['departamento'] ?? ''));
    $departamento = $dPrincipal !== '' ? $dPrincipal : $dAlt;
    $setor = trim((string)($rowLc['setor_cadeira_principal'] ?? ''));
    $entry = [
        'departamento' => $departamento,
        'setor' => $setor,
    ];
    foreach (['corporate_email', 'personal_email', 'email'] as $col) {
        if (!empty($rowLc[$col])) {
            $map[strtolower(trim($rowLc[$col]))] = $entry;
        }
    }
}

pg_free_result($res);
pg_close($pg);

echo json_encode($map);

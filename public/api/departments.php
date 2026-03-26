<?php
/**
 * API para listar departamentos do Neon GeTeams filtrados por departments.workspace_id = id do workspace (Supabase: geteams_workspace_id ou nome resolvido em public.workspaces).
 * GET /api/departments — requer Authorization: Bearer <supabase_access_token>
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

$supabaseUrl    = defined('SUPABASE_URL')               ? SUPABASE_URL               : '';
$supabaseAnonKey = defined('SUPABASE_ANON_KEY')         ? SUPABASE_ANON_KEY          : '';
$neonUrl        = defined('NEON_GETEAMS_DATABASE_URL')  ? NEON_GETEAMS_DATABASE_URL  : '';

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
    echo json_encode(['error' => 'Token ausente. Use Authorization: Bearer <token>.']);
    exit;
}
$token = trim($m[1]);

// Validar token no Supabase
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
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
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

$parsed  = parse_url($neonUrl);
$host    = $parsed['host'] ?? 'localhost';
$port    = $parsed['port'] ?? 5432;
$user    = $parsed['user'] ?? '';
$pass    = $parsed['pass'] ?? '';
$path    = $parsed['path'] ?? '';
$dbname  = $path !== '' ? ltrim($path, '/') : 'neondb';
$query   = $parsed['query'] ?? '';
parse_str($query, $q);
$sslmode = $q['sslmode'] ?? 'require';

$endpoint = '';
if (preg_match('/^(ep-[a-z0-9-]+)/', $host, $m)) {
    $endpoint = $m[1];
}
$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode";
if ($endpoint !== '') {
    $dsn .= ";options=endpoint=$endpoint";
}

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(['error' => 'Falha na conexão com banco corporativo.']);
    exit;
}

require_once __DIR__ . '/ge_teams_workspace_helpers.php';
$ctx = ge_apps_fetch_company_ge_teams_workspace_context($supabaseUrl, $supabaseAnonKey, $token);
$nm = $ctx['name'] ?? '';
$neonId = isset($ctx['workspace_id']) ? trim((string) $ctx['workspace_id']) : '';
if ($nm === '' && $neonId === '') {
    echo json_encode([], JSON_UNESCAPED_UNICODE);
    exit;
}
if ($neonId === '' && $nm !== '') {
    $resolved = ge_apps_resolve_neon_workspace_id_pdo($pdo, $nm);
    $neonId = $resolved !== null ? $resolved : '';
}
if ($neonId === '') {
    echo json_encode([], JSON_UNESCAPED_UNICODE);
    exit;
}

$selWithWs = 'id, name, icon, description, color, workspace_id::text AS workspace_id';
$selBase = 'id, name, icon, description, color';
$wsCond = 'TRIM(workspace_id::text) = TRIM(?)';

$sqlAttempts = [
    "SELECT {$selWithWs} FROM departments WHERE is_active = true AND deleted_at IS NULL AND {$wsCond} ORDER BY name ASC",
    "SELECT {$selWithWs} FROM departments WHERE is_active = true AND {$wsCond} ORDER BY name ASC",
    "SELECT {$selWithWs} FROM departments WHERE {$wsCond} ORDER BY name ASC",
    "SELECT {$selWithWs} FROM departaments WHERE is_active = true AND deleted_at IS NULL AND {$wsCond} ORDER BY name ASC",
    "SELECT {$selWithWs} FROM departaments WHERE is_active = true AND {$wsCond} ORDER BY name ASC",
    "SELECT {$selWithWs} FROM departaments WHERE {$wsCond} ORDER BY name ASC",
    "SELECT {$selBase} FROM departments WHERE is_active = true AND deleted_at IS NULL AND {$wsCond} ORDER BY name ASC",
    "SELECT {$selBase} FROM departments WHERE is_active = true AND {$wsCond} ORDER BY name ASC",
    "SELECT {$selBase} FROM departments WHERE {$wsCond} ORDER BY name ASC",
    "SELECT {$selBase} FROM departaments WHERE is_active = true AND deleted_at IS NULL AND {$wsCond} ORDER BY name ASC",
    "SELECT {$selBase} FROM departaments WHERE is_active = true AND {$wsCond} ORDER BY name ASC",
    "SELECT {$selBase} FROM departaments WHERE {$wsCond} ORDER BY name ASC",
];
$rows = [];
foreach ($sqlAttempts as $sql) {
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$neonId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        break;
    } catch (PDOException $e) {
        continue;
    }
}

echo json_encode($rows, JSON_UNESCAPED_UNICODE);

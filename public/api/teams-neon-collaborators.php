<?php
/**
 * Colaboradores ativos (Neon) alinhados aos ids de departamento das equipes.
 * GET /api/teams-neon-collaborators?ids=id1,id2 — Bearer Supabase JWT.
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

$supabaseUrl     = defined('SUPABASE_URL') ? SUPABASE_URL : '';
$supabaseAnonKey = defined('SUPABASE_ANON_KEY') ? SUPABASE_ANON_KEY : '';
$neonUrl         = defined('NEON_GETEAMS_DATABASE_URL') ? NEON_GETEAMS_DATABASE_URL : '';

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

$idsRaw = isset($_GET['ids']) ? (string) $_GET['ids'] : '';
$ids = array_values(array_filter(array_map('trim', explode(',', $idsRaw))));
if (count($ids) === 0) {
    echo json_encode(['collaborators' => []], JSON_UNESCAPED_UNICODE);
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

function normalizeDeptKeyCollab(?string $s): string {
    return strtolower(trim((string) $s));
}

/** @return array<string,string> id => name */
function fetchIdToNameCollab(PDO $pdo, array $ids): array {
    if (count($ids) === 0) return [];
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    foreach (['departments', 'departaments'] as $table) {
        try {
            $sql = "SELECT id::text AS id, name FROM {$table} WHERE id::text IN ({$placeholders})";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($ids);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $map = [];
            foreach ($rows as $row) {
                $map[(string) $row['id']] = (string) ($row['name'] ?? '');
            }
            return $map;
        } catch (PDOException $e) {
            if ($e->getCode() === '42P01' || $e->getCode() === '42703') {
                continue;
            }
            throw $e;
        }
    }
    return [];
}

try {
    $filter = ge_apps_resolve_neon_workspace_filter($supabaseUrl, $supabaseAnonKey, $token, $pdo);
    if ($filter['mode'] === 'configured_not_found') {
        echo json_encode(['collaborators' => []], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $wsId = ($filter['mode'] === 'filter') ? $filter['workspace_id'] : null;

    $idToName = fetchIdToNameCollab($pdo, $ids);
    $nameToNeonId = [];
    foreach ($idToName as $nid => $name) {
        $nameToNeonId[normalizeDeptKeyCollab($name)] = $nid;
    }
    $want = array_flip($ids);

    $sql = "SELECT name, corporate_email, personal_email, email, department_cadeira_principal, setor_cadeira_principal
         FROM collaborators WHERE status = ?";
    $params = ['active'];
    if ($wsId !== null) {
        $sql .= ' AND workspace_id = ?';
        $params[] = $wsId;
    }
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } catch (PDOException $e) {
        if ($wsId !== null && strpos($e->getMessage(), 'workspace_id') !== false) {
            $stmt = $pdo->query(
                "SELECT name, corporate_email, personal_email, email, department_cadeira_principal, setor_cadeira_principal
                 FROM collaborators WHERE status = 'active'"
            );
        } else {
            throw $e;
        }
    }
    $list = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $nid = $nameToNeonId[normalizeDeptKeyCollab($row['department_cadeira_principal'] ?? '')] ?? null;
        if ($nid === null || !isset($want[$nid])) {
            continue;
        }
        $emailRaw = trim((string) ($row['corporate_email'] ?? ''))
            ?: trim((string) ($row['email'] ?? ''))
            ?: trim((string) ($row['personal_email'] ?? ''));
        if ($emailRaw === '') {
            continue;
        }
        $list[] = [
            'id' => strtolower($emailRaw),
            'name' => trim((string) ($row['name'] ?? '')) !== '' ? trim((string) $row['name']) : '—',
            'email' => $emailRaw,
            'departmentName' => trim((string) ($row['department_cadeira_principal'] ?? '')),
            'sectorName' => trim((string) ($row['setor_cadeira_principal'] ?? '')),
            'neonDepartmentId' => $nid,
        ];
    }
    usort($list, function ($a, $b) {
        return strcmp($a['name'], $b['name']);
    });
    echo json_encode(['collaborators' => $list], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao listar colaboradores.']);
}

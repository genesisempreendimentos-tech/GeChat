<?php
/**
 * Agrega setores distintos e quantidade de colaboradores ativos por departamento (Neon GêTeams).
 * GET /api/department-team-stats?ids=id1,id2 — Bearer Supabase JWT.
 * Resposta: { "uuid": { "sectors": ["..."], "collaboratorCount": n }, ... }
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
    echo json_encode(new stdClass(), JSON_UNESCAPED_UNICODE);
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

function normalizeDeptKey(?string $s): string {
    return strtolower(trim((string) $s));
}

/** @return array<string,string> id => name */
function fetchIdToName(PDO $pdo, array $ids): array {
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

/** @return array<string,array<int,string>> department_id => [sector names] */
function fetchSectorsByDepartmentIds(PDO $pdo, array $ids): array {
    if (count($ids) === 0) return [];
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT department_id::text AS department_id, name
         FROM sectors
         WHERE department_id::text IN ({$placeholders})
           AND is_active = true
         ORDER BY name ASC"
    );
    $stmt->execute($ids);
    $out = [];
    foreach ($ids as $id) {
        $out[$id] = [];
    }
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $did = trim((string) ($row['department_id'] ?? ''));
        $name = trim((string) ($row['name'] ?? ''));
        if ($did === '' || $name === '') continue;
        if (!isset($out[$did])) $out[$did] = [];
        if (!in_array($name, $out[$did], true)) {
            $out[$did][] = $name;
        }
    }
    return $out;
}

/** @return array<string,array{sectors:array<int,string>,count:int,sectorCounts:array<string,int>}> */
function aggregateCollaborators(PDO $pdo): array {
    $stmt = $pdo->query(
        "SELECT department_cadeira_principal, setor_cadeira_principal FROM collaborators WHERE status = 'active'"
    );
    $by = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $dk = normalizeDeptKey($row['department_cadeira_principal'] ?? '');
        if ($dk === '') {
            continue;
        }
        if (!isset($by[$dk])) {
            $by[$dk] = ['sectors' => [], 'count' => 0, 'sectorCounts' => []];
        }
        $by[$dk]['count']++;
        $sz = trim((string) ($row['setor_cadeira_principal'] ?? ''));
        if ($sz !== '') {
            $by[$dk]['sectors'][$sz] = true;
            if (!isset($by[$dk]['sectorCounts'][$sz])) {
                $by[$dk]['sectorCounts'][$sz] = 0;
            }
            $by[$dk]['sectorCounts'][$sz]++;
        }
    }
    $out = [];
    foreach ($by as $k => $v) {
        $sectorList = array_keys($v['sectors']);
        sort($sectorList, SORT_LOCALE_STRING);
        $out[$k] = [
            'sectors' => $sectorList,
            'count' => $v['count'],
            'sectorCounts' => $v['sectorCounts'],
        ];
    }
    return $out;
}

try {
    $idToName = fetchIdToName($pdo, $ids);
    $sectorsByDeptId = fetchSectorsByDepartmentIds($pdo, $ids);
    $byNorm = aggregateCollaborators($pdo);
    $result = [];
    foreach ($ids as $id) {
        $name = $idToName[$id] ?? '';
        $key = normalizeDeptKey($name);
        $agg = ($key !== '' && isset($byNorm[$key]))
            ? $byNorm[$key]
            : ['sectors' => [], 'count' => 0, 'sectorCounts' => []];
        $sectorList = $sectorsByDeptId[$id] ?? [];
        $sectorCounts = [];
        foreach ($sectorList as $sectorName) {
            $sectorCounts[$sectorName] = (int) ($agg['sectorCounts'][$sectorName] ?? 0);
        }
        $result[$id] = [
            'sectors' => $sectorList,
            'collaboratorCount' => $agg['count'],
            'sectorCounts' => $sectorCounts,
        ];
    }
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao agregar dados do departamento.']);
}

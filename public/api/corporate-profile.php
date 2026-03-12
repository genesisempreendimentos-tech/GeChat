<?php
/**
 * API de perfil corporativo (Neon GeTeams) em PHP.
 * GET /api/corporate-profile — requer Authorization: Bearer <supabase_access_token>
 * Retorna dados do colaborador por corporate_email (email do usuário logado) ou 404.
 * Para Hostinger: na pasta api/, copie .env.example para .env e preencha as variáveis.
 */

// Repassar token para auth: em alguns Apache/LiteSpeed o header vem como REDIRECT_HTTP_AUTHORIZATION
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
    echo json_encode([
        'error' => 'API não configurada.',
        'notFound' => true,
        'hint' => 'Arquivo config.php não encontrado em api/.',
    ]);
    exit;
}

require_once $configPath;

$supabaseUrl = defined('SUPABASE_URL') ? SUPABASE_URL : '';
$supabaseAnonKey = defined('SUPABASE_ANON_KEY') ? SUPABASE_ANON_KEY : '';
$neonUrl = defined('NEON_GETEAMS_DATABASE_URL') ? NEON_GETEAMS_DATABASE_URL : '';

if (!is_file($envPath) || ($supabaseUrl === '' && $supabaseAnonKey === '')) {
    http_response_code(503);
    echo json_encode([
        'error' => 'Conexão com banco corporativo não configurada.',
        'notFound' => true,
        'hint' => 'Copie api/.env.example para api/.env e preencha SUPABASE_URL, SUPABASE_ANON_KEY e NEON_GETEAMS_DATABASE_URL.',
    ]);
    exit;
}

if ($supabaseUrl === '' || $supabaseAnonKey === '') {
    http_response_code(500);
    echo json_encode(['error' => 'Serviço de autenticação não configurado (SUPABASE_URL e SUPABASE_ANON_KEY no .env).']);
    exit;
}

function getAuthHeader(): string {
    // Tentativa 1: getallheaders() — funciona em Apache/LiteSpeed com mod_php
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strtolower($name) === 'authorization') return $value;
        }
    }
    // Tentativa 2: variável de ambiente injetada pelo Apache/LiteSpeed via mod_rewrite E=
    if (!empty($_SERVER['HTTP_AUTHORIZATION']))          return $_SERVER['HTTP_AUTHORIZATION'];
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    // Tentativa 3: injetada pelo SetEnvIf do .htaccess
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

// Validar token no Supabase e obter email do usuário
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

if ($httpCode !== 200) {
    http_response_code(401);
    echo json_encode(['error' => 'Token inválido ou expirado.']);
    exit;
}

$userData = json_decode($response, true);
$email = isset($userData['email']) ? trim((string) $userData['email']) : '';
if ($email === '') {
    http_response_code(401);
    echo json_encode(['error' => 'E-mail do usuário não encontrado.']);
    exit;
}

if ($neonUrl === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Conexão com banco corporativo não configurada.', 'notFound' => true]);
    exit;
}

// Conectar ao Neon (PostgreSQL) via PDO
$parsed = parse_url($neonUrl);
$host = $parsed['host'] ?? 'localhost';
$port = $parsed['port'] ?? 5432;
$user = $parsed['user'] ?? '';
$pass = $parsed['pass'] ?? '';
$path = $parsed['path'] ?? '';
$dbname = $path !== '' ? ltrim($path, '/') : 'neondb';
$query = $parsed['query'] ?? '';
parse_str($query, $q);
$sslmode = $q['sslmode'] ?? 'require';

// Hostinger: libpq antiga não envia SNI; Neon exige endpoint no DSN (options=endpoint=...)
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
    echo json_encode(['error' => 'Indisponível: banco corporativo.', 'notFound' => true]);
    exit;
}

// Mapeamento 1:1 API -> colunas da tabela collaborators (Neon GeTeams)
$COLLABORATORS_FIELD_MAP = [
    'name'                 => 'name',
    'cpf'                  => 'cpf',
    'birth_date'           => 'birth_date',
    'phone'                => 'phone',
    'gender'               => 'gender',
    'address'              => 'address',
    'marital_status'       => 'marital_status',
    'nationality'          => 'nationality',

    'personal_email'       => 'personal_email',
    'corporate_email'      => 'corporate_email',

    'avatar_url'           => 'avatar_url',
    'curriculum_url'       => 'curriculum_url',
    'contract_url'         => 'contract_url',

    'profession'           => 'profession',
    'hire_date'            => 'hire_date',
    'dismissal_date'       => 'dismissal_date',
    'salary'               => 'salary',
    'status'               => 'status',
    'unique_id'            => 'unique_id',

    'departamento'         => 'department_cadeira_principal',
    'setor'                => 'setor_cadeira_principal',
    'cadeira_principal'    => 'cadeira_principal_nome',
    'cadeiras_secundarias' => 'cadeiras_secundarias_nomes',
    'primary_chair_id'     => 'primary_chair_id',
    'workspace_id'         => 'workspace_id',
    'level_id'             => 'level_id',
    'level_band_id'        => 'level_band_id',

    'id'                   => 'id',
    'company_id'           => 'company_id',
    'created_at'           => 'created_at',
    'updated_at'           => 'updated_at',
];

$emailNormalized = strtolower($email);
$stmt = $pdo->prepare('SELECT * FROM collaborators WHERE LOWER(TRIM(corporate_email)) = ? LIMIT 1');
$stmt->execute([$emailNormalized]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if ($row === false || $row === null) {
    http_response_code(404);
    echo json_encode(['notFound' => true, 'message' => 'Nenhum colaborador encontrado para este e-mail.']);
    exit;
}

$result = [];
foreach ($COLLABORATORS_FIELD_MAP as $apiField => $dbField) {
    $result[$apiField] = $row[$dbField] ?? null;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);

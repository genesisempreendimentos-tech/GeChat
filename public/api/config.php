<?php
/**
 * Configuração da API: carrega variáveis de ambiente para o mesmo domínio (Hostinger + Neon).
 * Crie api/.env na pasta de deploy (copie de .env.example) com SUPABASE_URL, SUPABASE_ANON_KEY e NEON_GETEAMS_DATABASE_URL.
 */
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (preg_match('/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/', $line, $m)) {
            $key = trim($m[1]);
            $val = trim($m[2]);
            if (preg_match('/^["\'](.*)["\']$/', $val, $q)) $val = $q[1];
            putenv("$key=$val");
            $_ENV[$key] = $val;
        }
    }
}

define('SUPABASE_URL', rtrim(getenv('SUPABASE_URL') ?: '', '/'));
define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: '');
define('NEON_GETEAMS_DATABASE_URL', getenv('NEON_GETEAMS_DATABASE_URL') ?: getenv('DATABASE_URL') ?: '');

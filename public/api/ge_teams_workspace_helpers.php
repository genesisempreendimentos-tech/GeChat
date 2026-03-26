<?php
/**
 * GêTeams / Neon:
 * - corporate-profile.php usa só o nome (ge_teams_workspace vs collaborators.workspace_name).
 * - Demais APIs: nome → id em public.workspaces → collaborators.workspace_id.
 */

/** @return string|null */
function ge_apps_fetch_company_ge_teams_workspace_name(string $supabaseUrl, string $supabaseAnonKey, string $token): ?string
{
    $url = rtrim($supabaseUrl, '/') . '/rest/v1/company_profile?select=ge_teams_workspace&order=created_at.asc&limit=1';
    $ch = curl_init($url);
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
        return null;
    }
    $rows = json_decode($response, true);
    if (!is_array($rows) || count($rows) === 0) {
        return null;
    }
    $w = $rows[0]['ge_teams_workspace'] ?? null;
    if ($w === null || $w === '') {
        return null;
    }
    $t = trim((string) $w);
    return $t !== '' ? $t : null;
}

/**
 * @return array{name: ?string, workspace_id: ?string}
 */
function ge_apps_fetch_company_ge_teams_workspace_context(string $supabaseUrl, string $supabaseAnonKey, string $token): array
{
    $url = rtrim($supabaseUrl, '/') . '/rest/v1/company_profile?select=ge_teams_workspace,geteams_workspace_id&order=created_at.asc&limit=1';
    $ch = curl_init($url);
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
        $name = ge_apps_fetch_company_ge_teams_workspace_name($supabaseUrl, $supabaseAnonKey, $token);
        return ['name' => $name, 'workspace_id' => null];
    }
    $rows = json_decode($response, true);
    if (!is_array($rows) || count($rows) === 0) {
        return ['name' => null, 'workspace_id' => null];
    }
    $row = $rows[0];
    $w = $row['ge_teams_workspace'] ?? null;
    $name = ($w !== null && trim((string) $w) !== '') ? trim((string) $w) : null;
    $wid = $row['geteams_workspace_id'] ?? null;
    $workspaceId = ($wid !== null && trim((string) $wid) !== '') ? trim((string) $wid) : null;
    return ['name' => $name, 'workspace_id' => $workspaceId];
}

/** @return string|null */
function ge_apps_resolve_neon_workspace_id_pdo(\PDO $pdo, string $workspaceName): ?string
{
    $name = trim($workspaceName);
    if ($name === '') {
        return null;
    }
    $queries = [
        "SELECT id::text AS id FROM public.workspaces WHERE status = 'active' AND deleted_at IS NULL AND LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
        "SELECT id::text AS id FROM public.workspaces WHERE status = 'active' AND LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
        "SELECT id::text AS id FROM public.workspaces WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
    ];
    foreach ($queries as $sql) {
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$name]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($row && !empty($row['id'])) {
                return (string) $row['id'];
            }
        } catch (\Throwable $e) {
            continue;
        }
    }
    return null;
}

/** @param resource $pg resultado de pg_connect */
/** @return string|null */
function ge_apps_resolve_neon_workspace_id_pg($pg, string $workspaceName): ?string
{
    $name = trim($workspaceName);
    if ($name === '') {
        return null;
    }
    $queries = [
        "SELECT id::text AS id FROM public.workspaces WHERE status = 'active' AND deleted_at IS NULL AND LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1",
        "SELECT id::text AS id FROM public.workspaces WHERE status = 'active' AND LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1",
        "SELECT id::text AS id FROM public.workspaces WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1",
    ];
    foreach ($queries as $sql) {
        $res = @pg_query_params($pg, $sql, [$name]);
        if ($res === false) {
            continue;
        }
        $row = pg_fetch_assoc($res);
        pg_free_result($res);
        if ($row && !empty($row['id'])) {
            return (string) $row['id'];
        }
    }
    return null;
}

/**
 * @param resource|\PDO $db
 * @return array{mode: string, workspace_id: ?string} mode: none|filter|configured_not_found
 */
function ge_apps_resolve_neon_workspace_filter(string $supabaseUrl, string $supabaseAnonKey, string $token, $db): array
{
    $name = ge_apps_fetch_company_ge_teams_workspace_name($supabaseUrl, $supabaseAnonKey, $token);
    if ($name === null) {
        return ['mode' => 'none', 'workspace_id' => null];
    }
    if ($db instanceof \PDO) {
        $id = ge_apps_resolve_neon_workspace_id_pdo($db, $name);
    } else {
        $id = ge_apps_resolve_neon_workspace_id_pg($db, $name);
    }
    if ($id === null) {
        return ['mode' => 'configured_not_found', 'workspace_id' => null];
    }
    return ['mode' => 'filter', 'workspace_id' => $id];
}

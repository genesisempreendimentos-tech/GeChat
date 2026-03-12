<?php
/**
 * Configuração da API de perfil corporativo (Neon GeTeams).
 * Copie este arquivo para config.corporate.php e preencha os valores.
 * NUNCA commite config.corporate.php com dados reais.
 */

return [
    // Supabase (validar token do usuário)
    // Obtenha em: https://supabase.com/dashboard → seu projeto → Settings → API
    'SUPABASE_URL'     => '',
    'SUPABASE_ANON_KEY'=> '',

    // Neon GeTeams – connection string do banco (tabela collaborators, coluna corporate_email)
    // Ex.: postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
    'NEON_GETEAMS_DATABASE_URL' => '',
];

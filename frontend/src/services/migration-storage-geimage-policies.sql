/*
  Políticas RLS para o bucket de storage GeImage (upload de imagens dos sistemas no admin).
  O erro "new row violates row-level security policy" ocorre porque não existe política de INSERT.

  Antes de rodar: crie o bucket no Supabase (Storage → New bucket → id: GeImage, marque Public).
  Depois execute no SQL Editor: Cole este script → Run.
*/

-- 1) Permitir usuários autenticados a fazer INSERT em storage.objects no bucket GeImage, pasta GeApps
DROP POLICY IF EXISTS "Allow authenticated upload to GeImage GeApps" ON storage.objects;
CREATE POLICY "Allow authenticated upload to GeImage GeApps"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'GeImage'
  AND (storage.foldername(name))[1] = 'GeApps'
);

-- 2) Permitir UPDATE (necessário para upsert: true no cliente)
DROP POLICY IF EXISTS "Allow authenticated update GeImage GeApps" ON storage.objects;
CREATE POLICY "Allow authenticated update GeImage GeApps"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'GeImage' AND (storage.foldername(name))[1] = 'GeApps')
WITH CHECK (bucket_id = 'GeImage' AND (storage.foldername(name))[1] = 'GeApps');

-- 3) Permitir leitura pública dos objetos do bucket (para a URL pública da imagem funcionar)
DROP POLICY IF EXISTS "Allow public read GeImage" ON storage.objects;
CREATE POLICY "Allow public read GeImage"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'GeImage');

/*
  Políticas RLS para o bucket de storage GeChat (imagens de grupos, anexos de mensagens, etc.).

  Antes de rodar: crie o bucket no Supabase (Storage → New bucket → id: GeChat, marque Public).
  Depois execute no SQL Editor: cole este script → Run.
*/

-- 1) Upload por usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated upload to GeChat" ON storage.objects;
CREATE POLICY "Allow authenticated upload to GeChat"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'GeChat');

-- 2) Update (upsert / sobrescrever)
DROP POLICY IF EXISTS "Allow authenticated update GeChat" ON storage.objects;
CREATE POLICY "Allow authenticated update GeChat"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'GeChat')
WITH CHECK (bucket_id = 'GeChat');

-- 3) Leitura pública (URLs públicas das imagens e anexos)
DROP POLICY IF EXISTS "Allow public read GeChat" ON storage.objects;
CREATE POLICY "Allow public read GeChat"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'GeChat');

-- 4) Usuários autenticados podem remover seus uploads (opcional, útil para edição futura)
DROP POLICY IF EXISTS "Allow authenticated delete GeChat" ON storage.objects;
CREATE POLICY "Allow authenticated delete GeChat"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'GeChat');

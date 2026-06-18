-- Supabase Storage: políticas para logos de empreendimentos (bucket GeLar).
-- Execute no SQL Editor do projeto GêApps (shmrdhpjlsrqiffcykzw).

CREATE POLICY "GeLar public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'GeLar');

CREATE POLICY "GeLar insert appsadmin logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'GeLar'
  AND public.is_appsadmin() = true
  AND (storage.foldername(name))[1] = 'Logo_Empreendimentos'
);

CREATE POLICY "GeLar update appsadmin logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'GeLar'
  AND public.is_appsadmin() = true
  AND (storage.foldername(name))[1] = 'Logo_Empreendimentos'
)
WITH CHECK (
  bucket_id = 'GeLar'
  AND public.is_appsadmin() = true
  AND (storage.foldername(name))[1] = 'Logo_Empreendimentos'
);

CREATE POLICY "GeLar delete appsadmin logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'GeLar'
  AND public.is_appsadmin() = true
  AND (storage.foldername(name))[1] = 'Logo_Empreendimentos'
);

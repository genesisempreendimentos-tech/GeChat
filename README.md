# genovo — mock de UI

Repositório **somente para design / protótipo**: não há empresa, domínio nem banco reais ligados ao código.

## Executar

```bash
npm install
npm run dev
```

## Login (falso)

E-mails permitidos estão em `src/mocks/uiShellData.ts` (ex.: `usuario.demo@example.com`, `admin.demo@example.com`). Qualquer senha serve no fluxo visual.

## Assets

- Marca genérica: `public/assets/brand-mock.svg`
- Banners categoria “demo”: `public/assets/banners/demo/`

## Nota

`src/services/supabase.ts` e nomes de tipos legados mantêm compatibilidade com a UI, mas os retornos são **mock em memória**.

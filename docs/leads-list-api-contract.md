# Contrato `GET /api/leads/list`

Pessoas únicas (`all_leads_unique`), paginado **25/página**, ordem default **`created_at DESC`**.

As abas Detalhes / Perfil / CV-CRM no frontend são **recorte de colunas** sobre o mesmo payload — sem refetch ao trocar de aba.

## Query params

Herdados de `LeadsPanelFilters`: `periodo`, `canal`, `fonte`, `empreendimento`, `situacao_cv`, `busca`, `page`, `pageSize`.

**Busca (`busca`):** nome, e-mail, telefone, `person_id`, código/`id_amigavel` (via `all_leads.codigo`).

## Response

```json
{
  "rows": [ { "...": "..." } ],
  "total": 5690,
  "page": 1,
  "pageSize": 25
}
```

### `rows[]` — superset das 3 abas

| Campo | Tipo | Null | Uso |
|-------|------|------|-----|
| `person_id` | string (UUID) | não | Chave estável |
| `id_amigavel` | string | não | Ex.: `A0042` — código do cadastro ou derivação Vitrine |
| `codigo` | string \| null | sim | Código bruto em `all_leads` |
| `nome` | string | não | |
| `email` | string \| null | sim | |
| `telefone` | string \| null | sim | |
| `empreendimento_interesse` | string \| null | sim | Aba Detalhes |
| `canal_bucket` | string | não | Meta Forms, Site forms, Painel CV, WhatsApp, Outros |
| `canal_raw` | string | não | Origem bruta (`canal[1]`) |
| `parameter` | string \| null | sim | UTM / parâmetro |
| `cvcrm_lead_id` | string \| null | sim | |
| `status_qualificacao` | enum | não | `Indefinida` \| `N/A` \| `Baixa` \| `Média` \| `Alta` — **qualificação de marketing**, não funil CV |
| `birth_date` | string (YYYY-MM-DD) \| null | sim | Aba Perfil → exibir DD/MM/AAAA |
| `relacionamento` | string \| null | sim | |
| `investimento` | string \| null | sim | `monthly_investment` |
| `cidade` | string \| null | sim | |
| `perfil_tipo` | string \| null | sim | Morador / Investidor / Corretor |
| `children_status` | string \| null | sim | |
| `observacoes` | string \| null | sim | Hoje = `children_status` (gap: sem `profile_notes` na unique) |
| `responsavel` | string \| null | sim | Nome do corretor (`cvcrm_corretores`) |
| `created_at` | string (ISO) | não | |

## Notas

- Campos ausentes na UI: `null` → front exibe `—`.
- `status_qualificacao` calculado no backend (`leadQualificacao.mjs`), espelhando `qualifyLead.ts`.

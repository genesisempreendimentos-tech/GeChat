# Fase 1 — Descoberta: `all_leads_unique`

> Schema obtido de `allLeadsUnique.mjs`, migrations (`neon-all-leads-unique.sql`, `neon-cvcrm-cadastros.sql`) e `information_schema` (quando `NEON_LEADS_DATABASE_URL` disponível).

## Colunas reais (`all_leads_unique`)

| column_name | data_type |
|-------------|-----------|
| person_id | uuid |
| name | ARRAY (text) |
| email | ARRAY (text) |
| phone | ARRAY (text) |
| empreendimento_interesse | ARRAY (text) |
| canal | ARRAY (text) |
| source_table | ARRAY (text) |
| parameter | ARRAY (text) |
| birth_date | date |
| gender | text |
| current_city | text |
| relationship_status | text |
| monthly_investment | text |
| profile_type | text |
| profile_completed | boolean |
| whatsapp_clicked | boolean |
| children_status | text |
| cvcrm_lead_id | text |
| cvcrm_status | text |
| cvcrm_situation | text |
| cvcrm_stage | text |
| cvcrm_is_sold | boolean |
| cvcrm_sale_value | numeric |
| cvcrm_sale_date | timestamptz |
| cvcrm_last_update | timestamptz |
| idcorretor | text |
| idimobiliaria | text |
| signup_count | integer |
| created_at | timestamptz |
| updated_at | timestamptz |
| canal_bucket | text |
| fonte | text |
| has_reserva | boolean |
| has_venda | boolean |

**Não existe em `all_leads_unique`:** `codigo`, `cvcrm_payload`, `profile_notes`, `responsavel` (nome), `renda_familiar` (usa `monthly_investment`).

---

## Mapa de campos por aba

### Perfil

| Campo UI | Situação |
|----------|----------|
| relacionamento | **Coluna própria** — `relationship_status` |
| investimento / renda_familiar | **Coluna própria** — `monthly_investment` |
| cidade | **Coluna própria** — `current_city` |
| birth_date (idade) | **Coluna própria** — `birth_date` (DATE) |
| perfil_tipo (Morador/Investidor/Corretor) | **Coluna própria** — `profile_type` |
| children_status | **Coluna própria** — `children_status` |
| observações (gerais) | **GAP parcial** — só `children_status`; `profile_notes` não está na tabela única (existe em `all_leads` / fontes, não agregada) |

### Detalhes

| Campo UI | Situação |
|----------|----------|
| parameter (UTM) | **Coluna própria** — `parameter` (TEXT[]) |
| canal_bucket | **Coluna própria** — `canal_bucket` |
| cvcrm_lead_id | **Coluna própria** — `cvcrm_lead_id` |
| código amigável (A0001) | **GAP na unique** — não há `codigo`; **derivado** via subquery em `all_leads` (match e-mail/telefone) + fallback `leadDisplayId` |

### CV-CRM

| Campo UI | Situação |
|----------|----------|
| responsável / corretor | **Parcial** — `idcorretor` na unique; **nome** via JOIN `cvcrm_corretores`. Sem id → null |
| canal raw (origem) | **Coluna própria** — `canal[1]` (array); fallback `canal_bucket` |
| cvcrm_payload | **Ausente** na unique — só em `all_leads`; atribuição de corretor já consolidada em `idcorretor` no rebuild |

---

## Decisões de build (sem coluna vazia permanente)

- **Observações:** exibir `children_status`; não inventar `profile_notes` até agregar no rebuild.
- **Responsável:** JOIN `cvcrm_corretores.nome` quando `idcorretor` preenchido.
- **ID amigável:** `codigo` de `all_leads` ou derivação A0000 (mesma regra da Vitrine).
- **Status (coluna):** `status_qualificacao` calculado no backend (marketing); **não** usar `cvcrm_situation` nesta coluna.

# API — Registro canônico de empreendimentos

Base: `/api/admin/empreendimentos`  
Auth: Bearer JWT ou cookie `geleads_sb_access` + **`accessType === 'admin'`**

---

## GET `/` (admin)

Lista empreendimentos canônicos com contagens.

**Response `200`**

```json
{
  "empreendimentos": [
    {
      "id": 1,
      "nome": "Flow Genesis",
      "cor": "bg-sky-500",
      "logo_url": "https://...",
      "ativo": true,
      "aliases_count": 3,
      "leads_count": 591
    }
  ],
  "stats": { "total": 39, "a_classificar": 34, "mapeado": 3, "nao_informado": 2 }
}
```

## GET `/api/empreendimentos` (user, requireAuth)

Mesma lista sem `stats` de aliases admin.

## GET `/:id` (admin)

Detalhe com aliases mapeados + `pending_aliases`.

## POST `/` (admin)

Cria empreendimento e atribui aliases numa operação.

**Body**

```json
{
  "nome": "Flow Genesis",
  "cor": "bg-sky-500",
  "logo_url": "https://...",
  "alias_ids": [12, 15]
}
```

## PATCH `/:id` (admin)

Atualiza nome/cor/logo e adiciona/remove aliases.

**Body**

```json
{
  "nome": "Flow Genesis",
  "cor": "bg-sky-500",
  "logo_url": "https://...",
  "alias_ids": [20],
  "remove_alias_ids": [12]
}
```

## POST `/logo` (admin)

Upload de logo via base64 (bucket `GeImage/GêLeads/empreendimentos`).

**Body**

```json
{
  "filename": "flow.png",
  "content_type": "image/png",
  "data_base64": "..."
}
```

**Response `200`**

```json
{ "url": "https://...", "path": "GêLeads/empreendimentos/..." }
```

---

## GET `/aliases`

Lista aliases agrupados em clusters sugeridos (trigram `similarity > 0.45` sobre `valor_norm`).

**Query**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `status` | opcional | `a_classificar` \| `mapeado` \| `nao_informado` |

**Response `200`**

```json
{
  "clusters": [
    {
      "cluster_id": "c_12",
      "representative": "flow residencial",
      "total_ocorrencias": 142,
      "aliases": [
        {
          "id": 12,
          "valor_norm": "flow",
          "exemplos_crus": ["FLOW", "Flow"],
          "ocorrencias": 98,
          "empreendimento_id": null,
          "status": "a_classificar"
        }
      ]
    }
  ],
  "unclustered": [],
  "stats": {
    "total": 340,
    "a_classificar": 280,
    "mapeado": 40,
    "nao_informado": 20
  }
}
```

- Clusters sugeridos: apenas `status=a_classificar`, ordenados por `total_ocorrencias` DESC.
- `mapeado` / `nao_informado`: clusters singleton após os sugeridos.

---

## POST `/`

Cria empreendimento canônico (admin).

**Body**

```json
{ "nome": "Flow Residencial" }
```

**Response `201`**

```json
{ "id": 1, "nome": "Flow Residencial", "ativo": true }
```

**Erros:** `400` nome vazio ou duplicado.

---

## POST `/aliases/assign`

Atribui alias(es) a um empreendimento canônico.

**Body**

```json
{ "alias_ids": [12, 15], "empreendimento_id": 1 }
```

**Response `200`**

```json
{ "updated": 2 }
```

Invalida cache do resolver read-time.

---

## POST `/aliases/mark-nao-informado`

Marca alias(es) como sem informação útil.

**Body**

```json
{ "alias_ids": [99] }
```

**Response `200`**

```json
{ "updated": 1 }
```

---

## Resolução read-time (Leads overview)

Helper: `empreendimentoResolver.mjs`

| Condição | Label exibido |
|----------|----------------|
| Alias `mapeado` | `empreendimentos_genesis.nome` |
| Alias `nao_informado` | `Não informado` |
| Alias `a_classificar` ou ausente no mapa | `A classificar` |

- Multi-seleção: valor bruto quebrado por `;`; cada parte normalizada e resolvida.
- Um lead pode contar em **várias** séries da timeline/distribuição.

**Timeline / distribuição** (`GET /api/leads/overview?section=charts`):

- `timeline.series`: nomes canônicos resolvidos — **sem bucket "Outros"**.
- `distribuicao.por_empreendimento`: breakdown por label resolvido.

---

## Scripts

| Script | Uso |
|--------|-----|
| `node backend/scripts/ingest-empreendimento-aliases.mjs` | Fase 1: varre `all_leads`, upsert aliases, report |
| `node backend/scripts/verify-empreendimento-timeline.mjs` | Confirma timeline sem "Outros" |

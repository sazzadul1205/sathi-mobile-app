# Data Model

Conceptual entities and invariants derived from SRS §9/§10. Local persistence mapping is in `docs/LOCAL_DATABASE.md`.

---

## Entity map

```
User/Profile ──< CarePlanMember >── CarePlan ── 1 ── Patient
                                      │
                                      ├──< Medicine ──< Schedule/Times
                                      │        └──< Inventory/StockMovement
                                      ├──< DoseRecord
                                      ├──< PurchaseRecord
                                      ├──< TransferRecord
                                      ├──< Notification
                                      └──< AuditLog
SyncQueue/SyncRecord (local outbound events)
```

## Key entities (conceptual)

- **User/Profile:** individual account/device profile; no shared credentials. Recovery/ownership transfer must be verified (server-side when backend exists).
- **CarePlan / Patient:** one plan ↔ one patient (BR-01); plan-scoped data isolation.
- **CarePlanMember:** role template + permissions per plan; membership/permission changes auditable.
- **Medicine:** identity, strength/form/route/unit, manual instructions, active flag, low-stock threshold. Dose schedule represented as per-dose times `[{ time, quantity, mealRelation }]` in local implementation (backward-compatible parsing).
- **DoseRecord:** scheduled slot outcome (`given|missed|refused|other`), per-dose quantity/meal context, recorded by/time, notes; corrections are new records referencing original (append-only). Only `given` reduces stock (BR-05).
- **Inventory/StockMovement:** append-only movement ledger (receipt/consumption/adjustment/transfer-related movements as modeled); totals derived; purchases add stock on receipt (BR-06); transfers do not change totals (BR-07/08).
- **PurchaseRecord / TransferRecord:** local tracking entities for purchase and transfer workflows/status; authoritative stock effects belong with server rules/integrated ledger flows.
- **Notification / AuditLog / SyncRecord:** per-plan activity, audit trail, and outbound sync events with idempotency/time metadata.

## Rules

| Rule | Meaning |
| --- | --- |
| BR-01 | One care plan per patient |
| BR-04/BR-15 | Manual prescription/instructions; no auto prescribing/diagnosis |
| BR-05 | Only `given` reduces stock |
| BR-06 | Purchases increase stock only on receipt |
| BR-07/08 | Transfers move stock, not totals; carried stock remains in total |
| BR-09/12 | Corrections/adjustments append-only, reasoned, never silent |
| FR-79/80/81/82 | Preserve event/arrival times, idempotent replay, conflicts surfaced not applied |

Implementation details (stores, indexes, envelope, cipher, device key, sealed envelopes) are defined in `docs/LOCAL_DATABASE.md` and source under `src/lib/db` and `src/lib/security`.

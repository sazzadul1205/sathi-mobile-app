# Data Model

Derived from SRS §9 (entities) and §10 (business rules). Final table details are
decided during database design; this document fixes identity, relationships, and
audit semantics that the frontend relies on.

---

## Entity map

```
User ──< CarePlanMember >── CarePlan ── 1 ── Patient
 │                              │
 │                              ├──< Medicine ──< MedicationSchedule
 │                              │       │
 │                              │       └──< Inventory ──< StockMovement
 │                              │
 │                              ├──< DoseRecord
 │                              ├──< PurchaseRecord
 │                              ├──< TransferRecord
 │                              ├──< Notification
 │                              └──< AuditLog
SyncRecord ── (queued offline events, per device/user)
```

## Entities

### User
Account + authentication info. Every person has an individual account; shared
credentials never exist (SRS §3). Recovery is verified and never transfers plan
ownership (FR-06/07).

### CarePlan
A plan for exactly one patient (BR-01). A user may belong to multiple plans with
different roles in each (BR-02). Each plan isolates its medicines, schedules,
inventory, members, notifications, and audit history from other plans (SR-07).

### Patient
Profile per plan: name, date of birth (if known), care notes, current location
(Dhaka, Cumilla, …). Location changes are audited (FR-11/12).

### CarePlanMember
Links users to plans with a role (Owner / Administrator / Family member /
Caregiver) and fine-grained permissions. Roles are templates; access is the sum
of granted permissions (SRS §3). Membership/permission changes are audited.

### Medicine
Identity, strength/concentration, dosage form, stock unit, prescribed dose
instructions, administration route, schedule hints, notes, active flag. Different
strengths/forms that aren't interchangeable are **separate records** (FR-15).
Instructions are entered manually and never auto-generated (FR-16/17); changes
are audited (FR-18).

### MedicationSchedule
Administration times, frequency, instructions, start/end dates (FR-20). Derived
from the manually entered prescription (BR-04); changes are traceable (BR-10).

### DoseRecord
Scheduled dose reference + outcome (`given` | `missed` | `refused` | `other`),
recording user, event time, notes. Corrections are **new rows** referencing the
original — never overwrites (FR-26/27). Same scheduled dose is unique per
caregiver where possible; offline conflicts are flagged for review (FR-82).
Only `given` reduces stock (BR-05).

### Inventory
Current stock per medicine, broken down by location, including carried-by-patient
(which still counts toward the total) (BR-07/08, FR-36/37).

### InventoryLocation
Storage/carrying locations (home Dhaka, home Cumilla, patient-carried, …).
Confirmed as user-defined during design (SRS §12.6).

### StockMovement
Immutable ledger of receipts, consumption, adjustments, and transfers, each with
reason, user, time, and quantity delta (FR-41). Earlier values are never silently
replaced (FR-42); totals are computed from receipts − consumption ± transfers ±
adjustments (FR-43).

### PurchaseRecord
Medicine, quantity, estimated/actual cost, responsible person, status
(`planned | ordered | received | cancelled`), notes (FR-48/49). Stock increases
only when receipt is recorded (BR-06, FR-52). v1 records responsibility/costs
only — no payments (FR-55).

### TransferRecord
Medicine, quantity, source, destination, responsible person, status
(`preparing | in_transit | received | cancelled`), timestamps (FR-57/58). Not
consumption (FR-59); quantity never counts as available at both ends mid-transfer
(FR-60).

### Notification
Per-recipient notification + delivery history for dose reminders, low stock,
receipts/transfer updates, schedule changes, membership changes (FR-63/64).
Delivery ≠ read/acted upon (FR-67). Push previews hide patient details (SR-12).

### AuditLog
Append-only record of every mutation to schedules, administration, inventory,
purchases, transfers, memberships, permissions, and ownership (SR-09/10).
Identifies account + timestamp; corrections preserve original history.

### SyncRecord
Client-side record of each queued offline event: unique ID, recording user,
event time, arrival time, sync status. Server dedupes by ID (FR-80).

## Rules baked into the model

| ID | Rule |
| --- | --- |
| BR-01 | One plan ↔ one patient |
| BR-04 | Schedules derive from manual prescriptions |
| BR-05 | `given` is the only stock-reducing dose outcome |
| BR-06 | Purchases add stock only on receipt |
| BR-07/08 | Transfers move stock, never totals; carried stock stays in total |
| BR-09/12 | Adjustments/corrections are reasoned, append-only, never silent |
| FR-80 | Resubmitted offline events never duplicate |
| FR-81/82 | Conflicts are flagged for review |
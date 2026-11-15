# Medical Care Coordination App: SRS

<aside>
📌

**Version 1.0** · Initial requirements draft
**Stack:** React + Vite · Installable PWA · Online-first with offline support

</aside>

---

## 1. Overview

### Purpose

A shared app that helps family members and caregivers coordinate an elderly patient's medical care: medication administration, medicine stock, purchases, and transport between locations.
Everyone authorized can see what was given, what's left, what needs buying, who's buying it, and where the medicine is.

### Problem

The patient moves between Dhaka and Cumilla and is cared for by different people. This causes:

- Nobody is sure whether a scheduled dose was given.
- Caregivers miss recent schedule changes.
- Low stock is noticed too late.
- The person paying, buying, and administering may all be different.
- Medicine travels between locations with no accurate shared record.
- Internet isn't always available when a caregiver needs to record something.

### Goals

1. Keep a shared medication schedule and administration history.
2. Let authorized caregivers record dose outcomes.
3. Track medicine quantities, including what the patient carries.
4. Flag medicine that needs replenishing.
5. Coordinate purchases and transport.
6. Send reminders and notifications to the right people.
7. Support essential care activities offline.
8. Protect patient data with authentication, permissions, encryption, and audit history.

## 2. Scope

### ✅ In scope (v1)

- Registration, login, account recovery
- Multiple care plans (one patient each)
- Plan ownership, invitations, permissions
- Patient info
- Medicines and manually entered instructions
- Schedules and reminders
- Dose outcomes: given, missed, refused, other
- Inventory and stock adjustments
- Stock by location, including carried by patient
- Purchase planning and receiving
- Transfers between locations
- Notifications and activity history
- Offline recording and sync
- Audit logs and security controls

### ❌ Out of scope (v1)

- Diagnosis or treatment recommendations
- Creating or changing prescriptions
- Advice to double or change a dose after a missed or uncertain one
- Hospital, pharmacy, or EMR integration
- Online ordering or payment processing
- Bank or mobile wallet integration
- Connected-device monitoring
- Native Android/iOS app
- Auto-confirming a dose was taken without a caregiver recording it

<aside>
⚕️

This app supports care coordination. It does not replace professional medical advice.

</aside>

## 3. Users and access control

### Roles

Roles are templates. The owner or an authorized administrator can adjust individual permissions.

| Role | What they can do |
| --- | --- |
| **Owner** | Creates and owns the plan, manages members and permissions, can start ownership recovery or transfer. |
| **Administrator** | Manages the plan within the permissions the owner grants (members, medicines, schedules, inventory). Does not automatically become owner. |
| **Family member** | Views relevant care info and gets permitted notifications. Can record purchases, payments, or other activity if permitted. |
| **Caregiver** | Views schedules and patient instructions, records dose outcomes, and updates inventory or transfers when permitted. |

### Permission rules

- Every person has their own account, with no shared credentials.
- Authorized users can invite members and grant or revoke permissions.
- Sensitive actions are limited to authorized members.
- Members can't access plans they don't belong to.
- Membership and permission changes are logged.
- Restrictions apply both online and to offline functions on the device.

### Multiple care plans

- A user can belong to several plans.
- Each plan has exactly one patient.
- Each plan keeps its own medicines, schedules, inventory, members, notifications, and audit history, isolated from other plans.

## 4. Functional requirements

### 4.1 Accounts and authentication

- **FR-01** Users sign in with individual accounts.
- **FR-02** Secure account recovery.
- **FR-03** Authorized users can invite members.
- **FR-04** Members can be removed and permissions revoked.
- **FR-05** The owner is distinct from administrators and other members.
- **FR-06** If the owner is unavailable, an administrator can request ownership recovery or transfer through a verified process. It never happens automatically.
- **FR-07** Recovery preserves audit history and notifies relevant members when appropriate.

### 4.2 Patient and care plan

- **FR-08** Authorized users can create and manage care plans.
- **FR-09** Each plan has one patient profile.
- **FR-10** The profile holds name, date of birth (if known), care notes, and current location.
- **FR-11** Authorized users can update the patient's location (e.g. Dhaka, Cumilla).
- **FR-12** Changes to plans and patient info are kept in history.

### 4.3 Medicines

- **FR-13** Authorized users can add, edit, and deactivate medicines.
- **FR-14** A medicine record can hold:
    - Name, strength or concentration, dosage form (tablet, capsule, liquid)
    - Stock unit
    - Prescribed dose instructions and administration route
    - Schedule and timing instructions
    - Notes and active/inactive status
- **FR-15** Different strengths or forms that aren't interchangeable are separate inventory records.
- **FR-16** Prescribed instructions are entered manually by an authorized user.
- **FR-17** The system never prescribes or changes instructions on its own.
- **FR-18** Medicine and schedule changes are audited (user, time, details).

### 4.4 Schedules and dose recording

- **FR-19** Authorized users can create and update schedules.
- **FR-20** Schedules support times, frequency, instructions, and start/end dates.
- **FR-21** Caregivers can view upcoming and past doses.
- **FR-22** Dose outcomes:
    - **Given:** the caregiver administered it.
    - **Missed:** it wasn't administered.
    - **Refused:** the patient refused.
    - **Other:** another documented reason.
- **FR-23** A record includes the scheduled dose, outcome, recording user, event time, and notes.
- **FR-24** Recording "given" reduces the matching stock.
- **FR-25** Missed, refused, and other outcomes do not reduce stock.
- **FR-26** Corrections keep the original record and add the correction, reason, user, and time.
- **FR-27** Previous records are never silently overwritten.
- **FR-28** If a dose is uncertain, the app never advises repeating or doubling it. Users should follow the prescription or contact a healthcare professional.

### 4.5 Reminders

- **FR-29** Medication reminders where the device and browser support notifications.
- **FR-30** Caregivers and designated family members can receive reminders.
- **FR-31** Members can configure permitted notification categories.
- **FR-32** Essential security notifications can't be turned off.
- **FR-33** Lock-screen notifications hide sensitive medicine and patient details by default.
- **FR-34** The app states that notifications may be delayed or unavailable, especially offline or when the browser restricts background activity.

### 4.6 Inventory

- **FR-35** Track total quantity per medicine in each plan.
- **FR-36** Break quantities down by location, including home and carried by the patient.
- **FR-37** Medicine the patient carries still counts toward the total.
- **FR-38** Moving medicine between locations changes the breakdown, not the total.
- **FR-39** A "given" dose reduces available stock.
- **FR-40** Authorized users can record stock received, adjustments, and damaged or discarded medicine.
- **FR-41** Each adjustment records a reason, user, time, and quantity change.
- **FR-42** Inventory history is kept; earlier values are never silently replaced.
- **FR-43** Calculations account for receipts, consumption, transfers, and adjustments.
- **FR-44** Ordered but unreceived medicine isn't counted as available.
- **FR-45** The app flags stock at or below a configured low-stock threshold.
- **FR-46** If expiry tracking is on, expired medicine is excluded from usable stock.

### 4.7 Purchases

- **FR-47** Authorized users can create purchase records.
- **FR-48** A purchase holds medicine, quantity, estimated or actual cost, responsible person, status, and notes.
- **FR-49** Statuses: planned, ordered, received, cancelled.
- **FR-50** The app suggests a quantity based on usable stock, expected consumption, patient-carried medicine, and pending purchases.
- **FR-51** Authorized users can approve or edit the suggestion.
- **FR-52** Stock increases only when receipt is recorded.
- **FR-53** The purchaser and other authorized members can see pending needs.
- **FR-54** Purchase history is kept.
- **FR-55** v1 records responsibility and costs only. It does not process payments or move money between people.

### 4.8 Transfers and transport

- **FR-56** Authorized users can record a transfer between locations.
- **FR-57** A transfer holds medicine, quantity, source, destination, responsible person, status, and timestamps.
- **FR-58** "Prepared for transport" is distinct from "received at destination."
- **FR-59** A transfer is not consumption.
- **FR-60** The same quantity can't count as available at both source and destination mid-transfer.
- **FR-61** Members can see what needs transporting and its status.
- **FR-62** Cancellations or quantity errors are corrected in inventory history.

### 4.9 Notifications and activity

- **FR-63** Notify relevant members about:
    - Upcoming doses and recorded outcomes (where enabled)
    - Low stock and purchase needs
    - Medicine received and transfer updates
    - Schedule changes
    - Important membership or permission changes
- **FR-64** Only members authorized for the information receive the notification.
- **FR-65** An in-app activity/notification history is kept.
- **FR-66** Events recorded offline trigger server-side notifications after sync.
- **FR-67** Delivery is not proof that someone read or acted on it.

## 5. Offline and synchronization

### Offline access

- **FR-68** Previously synced information needed for permitted care activities is available offline.
- **FR-69** Authorized users can record dose outcomes, supported stock changes, and transfers offline.
- **FR-70** Offline records are stored securely on the device until synced.
- **FR-71** The app shows online/offline state, pending changes, and last successful sync time.
- **FR-72** Offline use is limited to data already on the device and operations covered by valid offline authorization.

### Offline authorization

- **FR-73** Default offline authorization for sensitive operations: **24 hours** from the last successful online authorization.
- **FR-74** After it expires, the user must reconnect and sign in again before continuing sensitive offline operations.
- **FR-75** The app doesn't claim revoked permissions take effect instantly on a disconnected device.
- **FR-76** Offline data exposure is limited, and access changes sync on reconnect.

### Synchronization

- **FR-77** Offline changes are queued and synced when connectivity returns.
- **FR-78** Each record keeps its unique ID, recording user, event time, and sync status.
- **FR-79** Event time and server arrival time are kept separately.
- **FR-80** Resubmitting a queued event never creates duplicate administration records.
- **FR-81** Conflicting inventory changes are never silently overwritten; they're flagged with a resolution process.
- **FR-82** Conflicting outcomes for the same dose from two offline caregivers are flagged for authorized review.
- **FR-83** The server is the authoritative shared record after sync, with event history preserved.

## 6. Security and privacy

- **SR-01** Authenticate before accessing any protected care information.
- **SR-02** The server checks authorization for protected operations. Hiding a button in the frontend isn't enough.
- **SR-03** HTTPS for all client-server traffic.
- **SR-04** Encryption at rest for sensitive server-side data.
- **SR-05** Encrypt locally cached sensitive data using a mechanism the target browser and device support.
- **SR-06** No credentials, tokens, or keys in insecure storage or logs.
- **SR-07** Care plans are isolated from each other.
- **SR-08** Sensitive operations follow plan permissions.
- **SR-09** Audit events for schedules, administration records, inventory, purchases, transfers, memberships, permissions, and ownership.
- **SR-10** Audit records identify the account and timestamps; corrections preserve original history.
- **SR-11** Secure sessions, with reauthentication for sensitive operations.
- **SR-12** No sensitive patient details in push previews, URLs, or unnecessary logs.
- **SR-13** Minimize sensitive data kept on devices, and clear cached plan data when access is removed and the device is online.
- **SR-14** Ownership recovery uses a verified process; an administrator can't take ownership unilaterally.
- **SR-15** Invalid, expired, or revoked authorization never grants access.
- **SR-16** Backups and recovery procedures protect patient information.

## 7. Non-functional requirements

### 📱 Usability

- **NFR-01** Mobile-first, usable on common phone sizes.
- **NFR-02** Schedules and dose recording are easy to find.
- **NFR-03** Statuses (given, missed, low stock, pending purchase, pending sync) are clearly distinguishable.
- **NFR-04** Clear error messages and confirmation for important actions.

### ⚡ Performance

- **NFR-05** Opening the schedule and recording a dose complete promptly under normal conditions.
- **NFR-06** Synced offline data is available without waiting on the server.
- **NFR-07** Avoid unnecessary network requests and excessive local storage.

### 🧮 Reliability and data integrity

- **NFR-08** Care events are never silently lost when the network drops.
- **NFR-09** Repeated sync never duplicates stock movements or administration events.
- **NFR-10** Inventory stays consistent across locations and devices.
- **NFR-11** Changes and corrections are traceable via audit history.

### 🌐 Compatibility

- **NFR-12** Modern browsers on Android and desktop.
- **NFR-13** Installable as a PWA on supported devices.
- **NFR-14** Offline storage, local reminders, and push work only as far as the browser and OS allow, and the app says so clearly.

### 🛠️ Maintainability

- **NFR-15** Clear separation between React frontend, backend API, and database.
- **NFR-16** The backend enforces rules for permissions, medication records, inventory, and sync wherever shared data integrity is involved.
- **NFR-17** Future features shouldn't require redesigning existing care records.

## 8. Proposed technology

Subject to confirmation during development.

| Component | Technology |
| --- | --- |
| Frontend | React |
| Build tool | Vite |
| App format | Installable PWA |
| Backend | [ASP.NET](http://ASP.NET) Core Web API |
| Database | SQL Server |
| Authentication | [ASP.NET](http://ASP.NET) Core Identity or equivalent |
| API | HTTPS REST |
| Offline data | IndexedDB with encryption and access controls |
| Reminders | Browser notifications and local reminders where feasible |
| Sync | Backend API with queued offline changes |

<aside>
⚠️

The frontend must never be the sole authority for permissions, inventory calculations, or shared-record integrity.

</aside>

## 9. Core data entities

Final tables and relationships will be decided during database design.

| Entity | Purpose |
| --- | --- |
| User | Account and authentication info |
| CarePlan | A care plan for one patient |
| Patient | Patient profile and care details |
| CarePlanMember | Links users to plans, with roles and permissions |
| Medicine | Identity, strength, form, instructions |
| MedicationSchedule | Administration times and frequency |
| DoseRecord | Dose outcomes and correction history |
| Inventory | Stock info per medicine |
| InventoryLocation | Storage and carrying locations |
| StockMovement | Receipts, consumption, adjustments, transfers |
| PurchaseRecord | Planned purchases, orders, receipts, responsible people |
| TransferRecord | Transport between locations |
| Notification | Notification and delivery history |
| AuditLog | Changes and security-sensitive activity |
| SyncRecord | Pending or synced offline events |

## 10. Key business rules

| ID | Rule |
| --- | --- |
| BR-01 | One care plan represents exactly one patient. |
| BR-02 | A user can belong to multiple care plans. |
| BR-03 | Access for all four roles is controlled by permissions. |
| BR-04 | Schedules are based on manually entered prescribed instructions. |
| BR-05 | A dose reduces stock only when recorded as given. |
| BR-06 | A purchase increases stock only after receipt is recorded. |
| BR-07 | Transfers between locations don't change total quantity. |
| BR-08 | Medicine carried by the patient stays in total inventory. |
| BR-09 | Inventory adjustments require a reason and preserve history. |
| BR-10 | Schedule changes are traceable to the responsible user. |
| BR-11 | Offline changes keep their origin and event time when synced. |
| BR-12 | Conflicting administration records or inventory updates are never silently discarded. |
| BR-13 | Expired medicine is excluded from usable stock if expiry tracking exists. |
| BR-14 | Purchase suggestions account for usable stock, expected consumption, and pending purchases. |
| BR-15 | The app never diagnoses or recommends prescription changes. |

## 11. Acceptance criteria

Version 1 is acceptable when these scenarios pass testing.

- [ ]  **Care plan access:** An owner can create a plan for one patient, invite members, and assign permissions. Unauthorized members can't access the plan.
- [ ]  **Scheduling:** An authorized user can enter a schedule, and permitted caregivers can view it.
- [ ]  **Dose recording:** A caregiver can record given, missed, refused, or other outcomes, and the record shows who and when.
- [ ]  **Inventory update:** "Given" reduces stock. "Missed" doesn't.
- [ ]  **Stock transfer:** Moving medicine between Dhaka and Cumilla changes the location breakdown but not the total.
- [ ]  **Purchase tracking:** A planned or pending purchase doesn't add stock. Recording receipt adds the received quantity.
- [ ]  **Low-stock alerts:** At the configured threshold, the app flags replenishment and notifies eligible members where supported.
- [ ]  **Audit history:** Changes to schedules, stock, dose records, and permissions trace to the responsible user.
- [ ]  **Offline operation:** A caregiver can view synced info and record permitted events offline, and they sync on reconnect.
- [ ]  **Sync integrity:** Retrying a sync creates no duplicates. Conflicts are flagged, not silently overwritten.
- [ ]  **Security:** Users can't reach other plans or exceed their permissions, including by calling protected API endpoints directly.
- [ ]  **PWA:** The app installs on supported devices, and supported offline features keep working after temporary network loss.

## 12. Decisions to finalize

These don't block the initial draft but need answers before implementation.

1. **Batches and expiry:** Track expiry dates and batches, or just totals? Batch tracking is recommended when expiry dates differ.
2. **Duplicate dose records:** Prevent duplicates for the same scheduled dose where possible, with a controlled way to document corrections and genuine exceptions. Offline conflicts need review.
3. **Ownership recovery:** Define the verification method (independent account recovery, or review by a trusted person).
4. **Offline reminders:** Use local reminders on supported caregiver devices, plus server notifications when online. Neither guarantees delivery in every state.
5. **Stock units:** Confirm units per medicine type (tablets, capsules, bottles, ml) and how partly used packages are represented.
6. **Locations:** Confirm whether they're user-defined (e.g. Dhaka home, Cumilla home, patient-carried supply).
7. **Purchase responsibility:** Only identify the purchaser, or also record who paid and each person's contribution?
8. **Offline authorization:** Keep 24 hours, or use a different policy?

## 13. Future enhancements

Not part of v1 unless explicitly approved.

- Medicine batch and expiry management
- Advanced purchase forecasting
- Detailed cost-sharing between family members
- Printable medication and inventory reports
- Caregiver activity reports
- Better notification delivery options
- Pharmacy or health-system integration, after security and privacy review

## 14. Summary

<aside>
🎯

The app gives family members and caregivers a shared, secure, and auditable way to coordinate medication, inventory, purchases, and transport.
Priorities: accurate shared records, clear responsibilities, reliable offline recording, safe sync, and controlled access to patient data. Build these core workflows first, before any advanced automation or external integrations.

</aside>

[API Documentation](https://app.notion.com/p/API-Documentation-408da91f30b2802296d7c62239b76f5c?pvs=21)

[Page Documentation](https://app.notion.com/p/Page-Documentation-408da91f30b2803699fffd48e4576e83?pvs=21)
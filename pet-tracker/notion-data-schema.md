# Notion Data Schema for Pet Tracker

This document details the schema for the 6 Notion databases required for the Pet Tracker application. 
All property names are **case-sensitive** and must match exactly for the API integration to function.

## 1. Data Source: `Pets`
Stores the profiles of each pet being tracked.

| Property Name | Type | Options / Details | Relation Target (Reciprocal Property) |
| :--- | :--- | :--- | :--- |
| **Name** | Title | **Required** | - |
| **Species** | Select | `Dog`, `Cat`, `Bird`, `Fish`, `Rabbit`, `Reptile`, `Hamster`, `Guinea Pig`, `Other` | - |
| **Breed** | Text | - | - |
| **Sex** | Select | `Male`, `Female`, `Unknown` | - |
| **Birth Date** | Date | - | - |
| **Adoption Date** | Date | - | - |
| **Status** | Select | `Active`, `Inactive`, `Deceased` | - |
| **Microchip ID** | Text | - | - |
| **Photo** | Files | - | - |
| **Tags** | Multi-select | User defined tags | - |
| **Notes** | Rich text | - | - |
| **Primary Vet** | Relation | - | `Contacts` (Property: `Related Pets`) |
| **Related Contacts** | Relation | - | `Contacts` (Property: `Related Pets`) |
| **Target Weight Min** | Number | - | - |
| **Target Weight Max** | Number | - | - |
| **Weight Unit** | Select | `lb`, `kg` | - |
| **Color** | Text | Hex color code | - |
| **Icon** | Files | Custom icon image | - |
| **Is Primary** | Checkbox | For AI defaults | - |

---

## 2. Data Source: `Events`
The central log of all activities (meds, vets, walks, etc.).

| Property Name | Type | Options / Details | Relation Target (Reciprocal Property) |
| :--- | :--- | :--- | :--- |
| **Title** | Title | **Required** | - |
| **Pet(s)** | Relation | **Required** | `Pets` (Property: *Events* or One-way) |
| **Event Type** | Relation | **Required** | `Event Types` (Property: *Events* or One-way) |
| **Start Date** | Date | **Required** | - |
| **End Date** | Date | Optional | - |
| **Status** | Select | `Planned`, `Completed`, `Missed` | - |
| **Severity Level** | Relation | - | `Scale Levels` (Property: *Related Events* or One-way) |
| **Value** | Number | - | - |
| **Unit** | Select | User defined units | - |
| **Duration** | Number | In minutes | - |
| **Notes** | Rich text | - | - |
| **Media** | Files | - | - |
| **Tags** | Multi-select | User defined tags | - |
| **Source** | Select | `Manual`, `Scheduled`, `Share`, `AI` | - |
| **Provider** | Relation | - | `Contacts` (Property: *Provided Events* or One-way) |
| **Cost** | Number | - | - |
| **Cost Category** | Select | `Medical`, `Vet Visit`, `Grooming`, `Boarding`, `Sitting`, `Other` | - |
| **Cost Currency** | Select | `USD`, `EUR`, `GBP`, `INR`, `CAD`, `AUD`, `Other` | - |
| **Todoist Task ID** | Text | - | - |
| **Client Updated At** | Date | Sync conflict detection | - |

---

## 3. Data Source: `Event Types`
Templates for events (e.g., "Medication Given", "Weight Check").

| Property Name | Type | Options / Details | Relation Target (Reciprocal Property) |
| :--- | :--- | :--- | :--- |
| **Name** | Title | **Required** | - |
| **Category** | Select | `Habit`, `Medication`, `Vaccine`, `Vet Visit`, `Symptom`, `Activity`, `Weight`, `Other` | - |
| **Tracking Mode** | Select | `Stamp`, `Timed`, `Range` | - |
| **Uses Severity** | Checkbox | - | - |
| **Default Scale** | Relation | - | `Scales` (Property: *Used By Event Types* or One-way) |
| **Default Color** | Select | Notion Colors | - |
| **Default Icon** | Text | Emoji or URL | - |
| **Default Tags** | Multi-select | User defined tags | - |
| **Allow Attachments** | Checkbox | - | - |
| **Default Value Kind** | Select | `None`, `Weight`, `Dose`, `Duration`, `Severity`, `Other` | - |
| **Default Unit** | Select | User defined units | - |
| **Correlation Group** | Select | e.g., "Meds", "Symptoms" | - |
| **Is Recurring** | Checkbox | Whether this event type has a recurring schedule | - |
| **Schedule Type** | Select | `Fixed`, `Rolling`, `One-off` | - |
| **Interval Value** | Number | Interval between occurrences | - |
| **Interval Unit** | Select | `Days`, `Weeks`, `Months`, `Years` | - |
| **Anchor Date** | Date | Schedule start date | - |
| **Due Time** | Text | HH:mm format | - |
| **Time of Day Preference** | Select | `Morning`, `Afternoon`, `Evening`, `Night`, `Any` | - |
| **Window Before** | Number | Days grace period before due | - |
| **Window After** | Number | Days grace period after due | - |
| **End Date** | Date | When schedule ends | - |
| **End After Occurrences** | Number | Stop after N occurrences | - |
| **Next Due** | Date | Computed/cached next due date | - |
| **Todoist Sync** | Checkbox | Sync to Todoist | - |
| **Todoist Project** | Text | Todoist project name | - |
| **Todoist Labels** | Text | Todoist labels | - |
| **Todoist Lead Time** | Number | Days before to create task | - |
| **Default Dose** | Text | For medications | - |
| **Default Route** | Select | `Oral`, `Topical`, `Injection`, `Other` | - |
| **Active** | Checkbox | Is this event type currently active | - |
| **Active Start** | Date | When to start showing | - |
| **Active End** | Date | When to stop showing | - |
| **Files** | Files | Attachments (prescriptions, etc.) | - |
| **Related Pets** | Relation | Pets this applies to | `Pets` (Property: *Event Types* or One-way) |

---

## 4. Data Source: `Scales`
Definitions for severity or quality scales (e.g., "Symptom Severity").

| Property Name | Type | Options / Details | Relation Target (Reciprocal Property) |
| :--- | :--- | :--- | :--- |
| **Name** | Title | **Required** | - |
| **Value Type** | Select | `Labels`, `Numeric` | - |
| **Unit** | Text | - | - |
| **Notes** | Rich text | - | - |

---

## 5. Data Source: `Scale Levels`
The individual steps in a scale (e.g., "Mild", "Severe").

| Property Name | Type | Options / Details | Relation Target (Reciprocal Property) |
| :--- | :--- | :--- | :--- |
| **Name** | Title | **Required** (e.g., "Mild") | - |
| **Scale** | Relation | **Required** | `Scales` (Property: *Levels* or One-way) |
| **Order** | Number | **Required** (Sorting) | - |
| **Color** | Select | Notion Colors | - |
| **Numeric Value** | Number | - | - |
| **Description** | Rich text | - | - |

---

## 6. Data Source: `Contacts`
Address book for vets, sitters, etc.

| Property Name | Type | Options / Details | Relation Target (Reciprocal Property) |
| :--- | :--- | :--- | :--- |
| **Name** | Title | **Required** | - |
| **Role** | Select | `Vet`, `Groomer`, `Sitter`, `Breeder`, `Emergency`, `Other` | - |
| **Phone** | Text | - | - |
| **Email** | Text | - | - |
| **Address** | Text | - | - |
| **Notes** | Rich text | - | - |
| **Related Pets** | Relation | - | `Pets` (Property: `Primary Vet` or `Related Contacts`) |

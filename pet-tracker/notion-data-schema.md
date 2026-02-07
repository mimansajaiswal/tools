# Notion Data Schema for Pet Tracker

Property names are case-sensitive and must match exactly.

Notes:
- For `Events`, `End Date` is stored as the end of the `Start Date` date-range (not a separate property).
- Pet visual icon uses the Notion page icon (not a database property).

## 1) Data Source: `Pets`

Required properties:
- `Name` (Title)
- `Species` (Select)
- `Breed` (Rich text/Text)
- `Sex` (Select)
- `Birth Date` (Date)
- `Adoption Date` (Date)
- `Status` (Select)
- `Microchip ID` (Rich text/Text)
- `Photo` (Files/Attachments)
- `Tags` (Multi-select)
- `Notes` (Rich text)
- `Target Weight Min` (Number)
- `Target Weight Max` (Number)
- `Weight Unit` (Select)
- `Color` (Rich text/Text)
- `Is Primary` (Checkbox)

Select/Multi-select options used by app:
- `Species`: `Dog`, `Cat`, `Bird`, `Fish`, `Rabbit`, `Reptile`, `Hamster`, `Guinea Pig`, `Other`
- `Sex`: `Male`, `Female`, `Unknown`
- `Status`: `Active`, `Deceased`, `Rehomed`, `Lost`
- `Weight Unit`: `lb`, `kg`, `oz`, `g`
- `Tags`: user-defined

Optional supported properties:
- `Primary Vet` (Relation -> `Contacts`)
- `Related Contacts` (Relation -> `Contacts`)

## 2) Data Source: `Events`

Required properties:
- `Title` (Title)
- `Pet(s)` (Relation -> `Pets`)
- `Event Type` (Relation -> `Event Types`)
- `Start Date` (Date; use date range end for event end)
- `Status` (Select)
- `Severity Level` (Relation -> `Scale Levels`)
- `Value` (Number)
- `Unit` (Select)
- `Duration` (Number)
- `Notes` (Rich text)
- `Media` (Files/Attachments)
- `Tags` (Multi-select)
- `Source` (Select)
- `Provider` (Relation -> `Contacts`)
- `Cost` (Number)
- `Cost Category` (Select)
- `Cost Currency` (Select)
- `Todoist Task ID` (Rich text/Text)
- `Client Updated At` (Date)

Select/Multi-select options used by app:
- `Status`: `Planned`, `Completed`, `Missed`
- `Source`: `Manual`, `Scheduled`, `AI` (legacy/imported data may include others)
- `Cost Category`: `Routine`, `Emergency`, `Preventive`, `Surgery`, `Medication`, `Supplies`, `Other`
- `Cost Currency`: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `INR`
- `Unit`: open set (seed common values you use, e.g. `lb`, `kg`, `oz`, `g`, `mg`, `mL`)
- `Tags`: user-defined

## 3) Data Source: `Event Types`

Required properties:
- `Name` (Title)
- `Category` (Select)
- `Tracking Mode` (Select)
- `Uses Severity` (Checkbox)
- `Default Scale` (Relation -> `Scales`)
- `Default Color` (Select)
- `Default Icon` (Rich text/Text)
- `Default Tags` (Multi-select)
- `Allow Attachments` (Checkbox)
- `Default Value Kind` (Select)
- `Default Unit` (Select)
- `Correlation Group` (Select)
- `Is Recurring` (Checkbox)
- `Schedule Type` (Select)
- `Interval Value` (Number)
- `Interval Unit` (Select)
- `Anchor Date` (Date)
- `Due Time` (Rich text/Text)
- `Time of Day Preference` (Select)
- `Window Before` (Number)
- `Window After` (Number)
- `End Date` (Date)
- `End After Occurrences` (Number)
- `Next Due` (Date)
- `Todoist Sync` (Checkbox)
- `Todoist Project` (Rich text/Text)
- `Todoist Labels` (Rich text/Text)
- `Todoist Lead Time` (Number)
- `Default Dose` (Rich text/Text)
- `Default Route` (Select)
- `Active` (Checkbox)
- `Active Start` (Date)
- `Active End` (Date)
- `Related Pets` (Relation -> `Pets`)

Select/Multi-select options used by app:
- `Category`: `Symptom`, `Medication`, `Vaccine`, `Vet Visit`, `Activity`, `Weight`, `Nutrition`, `Grooming`, `Wellness`, `Health`, `Other`
- `Tracking Mode`: `Stamp`, `Timed`
- `Default Color`: `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`, `cyan`, `blue`, `indigo`, `purple`, `pink`
- `Default Value Kind`: `Weight`, `Duration`, `Count`, `Temperature` (or empty/none)
- `Default Unit`: open set (app input is free text; seed whichever select options you need)
- `Correlation Group`: open set (app input is free text; seed values such as `Meds`, `Symptoms`)
- `Schedule Type`: `Fixed`, `Rolling`, `One-off`
- `Interval Unit`: `Days`, `Weeks`, `Months`, `Years`
- `Time of Day Preference`: `Morning`, `Afternoon`, `Evening`, `Night`, `Any`
- `Default Route`: `Oral`, `Topical`, `Injection`, `Other` (or empty/none)
- `Default Tags`: user-defined

## 4) Data Source: `Scales`

Required properties:
- `Name` (Title)
- `Value Type` (Select)
- `Unit` (Rich text/Text)
- `Notes` (Rich text)

Select options used by app:
- `Value Type`: `Labels`, `Numeric`

## 5) Data Source: `Scale Levels`

Required properties:
- `Name` (Title)
- `Scale` (Relation -> `Scales`)
- `Order` (Number)
- `Color` (Select)
- `Numeric Value` (Number)
- `Description` (Rich text)

Select options used by app:
- `Color`: `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`, `cyan`, `blue`, `indigo`, `purple`, `pink`

## 6) Data Source: `Contacts`

Required properties:
- `Name` (Title)
- `Role` (Select)
- `Phone` (Rich text/Text)
- `Email` (Rich text/Text)
- `Address` (Rich text/Text)
- `Notes` (Rich text)
- `Related Pets` (Relation -> `Pets`)

Select options used by app:
- `Role`: `Vet`, `Groomer`, `Sitter`, `Breeder`, `Emergency`, `Other`

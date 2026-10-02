# Picker Wheel Notion connection

The picker wheel works on its own. Notion is an optional source for importing
pages as wheel options. The connection reads databases and pages; adding rows to
the wheel never writes to Notion. The **Update in Notion** action is the only
write path and sends the properties you changed for one page.

## Use an existing proxy

If you already have a trusted Photo Chronicles or similar Notion proxy, enter
its HTTPS URL in **Connection settings**. Enter its proxy token when it asks for
one, then enter your Notion integration token. Credentials stay in the current
tab unless **Remember credentials on this device** is selected.

The integration must be added to each database you want to browse. In Notion,
open the database, choose **Connections**, and add the integration.

## Deploy the included Cloudflare Worker

Deploy `picker-wheel-notion-worker.mjs` as a module Worker. Set these Worker
variables:

- `ALLOWED_ORIGINS`: comma-separated origins that may use the Worker, such as
  `https://your-site.example,http://127.0.0.1:8765`.
- `PROXY_TOKEN`: optional secret required in the picker wheel's proxy token
  field.

The Worker's route allowlist only forwards the Notion endpoints used by this
page. It does not store the integration token. Keep the Worker URL on HTTPS in
production and do not add credentials or query parameters to it.

## Choose rows

After choosing a data source, map the title, optional description, URL, and
numeric weight properties. You can then select rows manually, take the first N
matching rows, or take a random N from the current search/filter matches. The
browser shows the first 200 rows as a preview; selection rules can sample from
the full source (up to 10,000 browsable rows and 1,000 wheel options).

Exports and share links contain the wheel options only. They never contain
Notion tokens or proxy credentials.

## Wheel settings

Settings includes an optional wheel icon toggle. It only changes the canvas;
the option list and result keep their icons. Dense wheels can use numbered
segments for quick lookup or one-line clipped labels for more context. For
weighted options, **Larger slice** shows a single arc sized by its weight.
**Spread chances** splits a weight into interleaved virtual slices, so a
weight of 2 beside a weight of 1 appears as two chances beside one while
keeping the same probabilities. The virtual slices still resolve to the
original option.

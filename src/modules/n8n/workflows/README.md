# n8n Workflows

All Vigil n8n workflows are managed in the cloud at **rashadbarnett.app.n8n.cloud**.

## Workflow Export & Version Control

To keep workflows in version control:

1. **Export from n8n:**
   - Open n8n dashboard at rashadbarnett.app.n8n.cloud
   - Navigate to each workflow
   - Click Menu → Download → Download as JSON
   - Save the JSON file to this directory with the naming convention: `{workflow-slug}.workflow.json`

2. **File Naming Convention:**
   - `grief-followup.workflow.json` — Grief Follow-Up Scheduler (1w, 1mo, 6mo, 1yr emails)
   - `staff-notify.workflow.json` — Staff Notification Hub (new case, overdue tasks, vendor confirmations)
   - `intake-notify.workflow.json` — Intake Notification (immediate email to staff)
   - `doc-generate.workflow.json` — Document Generation (service program PDF on case complete)
   - `data-retention.workflow.json` — Data Retention Cleanup (monthly hard-delete after 7-year archive)
   - `review-request.workflow.json` — Review Request (Google review SMS + email 14 days post-service)

3. **Restore from Version Control:**
   - Open n8n dashboard
   - Click Menu → Import from File
   - Select the `.workflow.json` file from this directory
   - Review and activate

## Workflow Callback

All workflows POST back to the backend at:
```
POST /internal/n8n/callback
Header: x-vigil-internal-key: <shared-secret>
Body: { event: string, payload: unknown }
```

See `n8n-callback.controller.ts` for implementation details.

## Current Workflows

- [ ] grief-followup.workflow.json
- [ ] staff-notify.workflow.json
- [ ] intake-notify.workflow.json
- [ ] doc-generate.workflow.json
- [ ] data-retention.workflow.json
- [ ] review-request.workflow.json

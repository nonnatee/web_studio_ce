# Odoo Studio CE (Community Edition) - Odoo 19 Replica

Odoo Studio CE is a powerful, visual no-code/low-code configuration tool built specifically for **Odoo Community Edition (18.0 & 19.0)**. It replicates Odoo 19 Enterprise Studio workflows, offering model builders, view visual editors, security privilege matrices, automated actions, webhooks, button approvals, and print report designers.

---

## 🚀 Key Features

### 1. App / Model Creator Wizard (14 Suggested Features)
- Create new models and menus instantly.
- Toggle from **14 suggested features** which automatically add database fields and views:
  - **Chatter**: Adds message followers, activities, and thread tracking.
  - **Archiving**: Instantiates `active` boolean field for archiving records.
  - **Sorting**: Instantiates `x_sequence` sequence integer field.
  - **Company**: Multi-company `res.company` Many2one relation field.
  - **Monetary**: Adds currency and price/amount fields.
  - **Notes**: Adds HTML-based internal notes area.
  - **Picture**: Adds avatar/binary image headers.
  - **Tags**: Adds Many2many tags (`res.partner.category`).
  - **User**: Assigned internal user Many2one link.
  - **Contact**: Partner/Customer Many2one link.
  - **Date Range**: Start/End dates fields.
  - **Calendar**: Datetime scheduling fields.
  - Conforms strictly to Odoo 18/19 view syntax (uses `<list>` instead of `<tree>` tags and `view_mode="list,form"`).

### 2. Button-Level sequential Approvals
- Attach multi-step sequential approvals to *any* action or button in Odoo.
- **Exclusive Approvals**: Block users who approved a prior step from approving a subsequent step.
- **Auto-Interception**: Overrides Odoo's backend `call_button` execution to ensure no button method can run unless steps are met.
- **Visual Status Badges**: Buttons render a custom shield badge in design mode showing the steps count.

### 3. Security Matrices & Record Rules
- **ACL Matrix**: Manage Read, Write, Create, and Delete permissions of any Odoo group on models.
- **Row-Level Record Rules (`ir.rule`)**: Create python-based conditions (e.g. `[('create_uid', '=', user.id)]`) to restrict record visibility per user group.

### 4. Automated Actions & REST Webhooks
- **Incoming Webhook Trigger**: Creates a public, CSRF-free POST endpoint to trigger automations externally. JSON payload can be processed inside Python using `webhook_payload`.
- **Outbound Webhooks**: Perform outbound REST requests (POST, PUT, GET, PATCH) to external microservices as an action.
- **Python / Next Activity / Email**: Standard actions fully configurable from the sidebar.

### 5. Print Report Designer (WYSIWYG)
- **Live HTML Preview**: Live iframe displaying the compiled print preview.
- **Highlight Selector**: Hover over elements inside preview to view CSS layouts; click to locate elements in the QWeb tree.
- **Raw XML Code Mode**: Edit the XML structure directly with live validation.
- **Slash Commands (`/`)**: Select elements and quickly insert templates:
  - `/field` -> Inserts a dynamic `<span t-field="..."/>` tag.
  - `/table` -> Inserts a beautiful striped tabular list with t-foreach looping.
  - `/if` -> Inserts a conditional QWeb block.

### 6. Logging & Zip Module Export
- **Customisation Logs**: Undo/revert any customizations (fields, views, rules, approvals) instantly.
- **ZIP Export Engine**: Compiles custom fields, view inheritances, record rules, and button approvals into a standard Odoo module ZIP file.

---

## 🛠️ Architecture & Folder Structure

- `models/`: Database models.
  - `studio_approval.py`: Interception validation and step rules.
  - `studio_log.py`: Revert log actions.
  - `studio_export.py`: ZIP compiler.
  - `ir_model.py`: Inherited tracking flags.
- `controllers/main.py`: RPC controller endpoints and CSRF-free webhook receiver.
- `static/src/`: OWL 2 Frontend JS / XML assets.
  - `js/studio_ce_patches.js`: View renderer patches for click interception and drag handles.
  - `js/security_editor.js`: Group ACL & Record Rule editing logic.
  - `js/approval_editor.js`: Multi-step button rule setup.
  - `js/report_editor.js`: WYSIWYG element selectors and raw XML editor.
  - `js/studio_ce_docs.js`: Embedded user documentation.

---

## 📦 Installation & Setup

1. Copy the `web_studio_ce` module to your custom addons path.
2. Upgrade/install dependencies (`base_automation`, `mail`).
3. Activate Developer Mode, go to **Apps**, search for `Studio CE` and click **Activate**.
4. Assign the **Studio Administrator** (`web_studio_ce.group_studio_ce`) group to authorised users.
5. Launch Odoo, go to any page, and toggle the **Studio CE** button in the main navbar.

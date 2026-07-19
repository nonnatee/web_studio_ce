# Odoo Studio CE - Complete Features List

Odoo Studio CE replicates the core and advanced capabilities of Odoo 19 Enterprise Studio for Odoo Community Edition. Below is the complete list of all features implemented across the application:

---

## 🎨 1. Visual Designer Canvas
- **Design Mode Toggle**: Activates an interactive design layer on standard Odoo forms, lists, and kanban views.
- **Odoo 19 Slate-Gray Layout**: Fully replicates the slate-gray color palette, premium Google Fonts (Outfit & Inter), and structure of the official Odoo 19 Enterprise Studio.
- **Dynamic Breadcrumbs & UNDO/REDO**: Top header breadcrumbs matching active view types (`VIEWS > FORM`) and fully functional Undo/Redo buttons wired to customizations logs to reverse recent changes.
- **Left Sidebar Sub-Tabs**: Reorganized sidebar featuring (+ Add, View, Properties) sub-tabs that automatically focus properties when canvas blocks are clicked.
- **2-Column Field Grid Palette**: Clean, icon-rich 2-column button grid of field components (Char, HTML, Integer, Float, Monetary, Date, Datetime, Boolean, Selection, Binary, Many2one, Many2many, Smart Button).
- **Interception of Clicks**: Disables default input focuses and clicks, allowing designers to select elements for editing.
- **Drag-and-Drop Handles**: Custom visual handles (`⋮`) to rearrange fields and inner groups.
- **Form/List/Kanban Renderer Mock Previews**: Renders realistic visual mock representations for Forms (with sheet/group columns grids and notebook tab systems), Lists (with draggable rows and headers), and Kanbans (with board columns and status cards).
- **Interactive Mode Switcher**: A header toggle allowing the developer to switch dynamically between **Live Preview** (visual mock mode) and **XML Layout Blocks** (structural schema outline node tree).
- **Chatter & Statusbar Mockups**: Realistic visual mockups of Odoo's Chatter feed, statusbar pipeline widgets, and button creation placeholders.

---

## 🧙‍♂️ 2. App & Model Creator Wizard
Creates fresh custom databases, models, and menus instantly using asuggested features checklist. Conforms to **Odoo 18/19 view syntax** (`<list>` tags and `view_mode="list,form"`).
Supports **14 suggested features** which automatically provision fields and view elements:
1. **Chatter**: Integrates messaging feed, follower sub-tables, and schedule activity feeds.
2. **Archiving**: Instantiates `active` boolean toggle to hide/show records.
3. **Sorting**: Instantiates `x_sequence` sequence integer field to sort lists.
4. **Company**: Multi-company support linking to `res.company`.
5. **Monetary**: Adds `x_currency_id` and `x_amount` fields with monetary symbol formatting.
6. **Notes**: Inserts an HTML notebook tab for rich-text internal descriptions.
7. **Picture**: Adds a binary avatar widget header field.
8. **Tags**: Integrates category labels linking to `res.partner.category`.
9. **User**: Link to assign an internal `res.users` owner.
10. **Contact**: Link to reference a customer/vendor `res.partner` record.
11. **Date Range**: Instantiates `x_date_start` and `x_date_end` fields.
12. **Calendar**: Datetime scheduling field (`x_date`).
13. **Lines**: Sub-detail line items linking to core tables.
14. **Custom Name**: Automatic `x_name` label char field.

---

## 🛡️ 3. Multi-Step Button Approvals
Ensures business processes are validated before execution by intercepting Odoo's backend actions:
- **Sequential Rules**: Set a strict series of sequential validation steps for any form view button.
- **Authorized Group Filters**: Target steps to specific security groups.
- **Exclusive Approvals**: Block users from self-approving multiple steps in a sequence.
- **ORM-Level Interception**: Intercepts `call_button` calls on `BaseModel` to block methods if approval rules are pending.
- **Design Mode Badges**: Buttons with active approval rules render a custom shield overlay indicating the step count.

---

## 🔒 4. Security & Record Rules Editor
Row-level and table-level access permissions managed in a single dashboard:
- **ACL Matrix**: Simple grid to toggle Read, Write, Create, and Delete (unlink) privileges per Odoo user group.
- **Add Group Control**: Dropdown to dynamically append active groups to the matrix.
- **Row-Level Record Rules**: Create and edit `ir.rule` records using python expression domain forces (e.g. `[('create_uid', '=', user.id)]`).
- **Targeted Rules**: Assign rules to specific subsets of Odoo groups.

---

## 📄 5. QWeb Print Report Designer
Full WYSIWYG printing template editor:
- **Live HTML Preview**: Embedded preview iframe rendering the compiled report layout.
- **Interactive Highlighter**: Outline elements on hover inside preview and click to trace them in the tree.
- **QWeb Tree Explorer**: Navigate through elements (tables, divs, text spans) in a folder-like structure.
- **Raw XML Source Tab**: Directly edit and save the raw QWeb arch code with validation.
- **Slash Commands (`/`) Snippets**: Fast element insertion:
  - `/field` -> Inserts a dynamic `<span t-field="o.x_name"/>` tag.
  - `/table` -> Inserts a striped tabular sub-list with loop binders.
  - `/if` -> Inserts a conditional `<div t-if="..."/>` block.

---

## ⚡ 6. Automation & Webhooks
Automate processes based on events:
- **Odoo 19 Triggers**: Support rules firing on Creation (`on_create`), Update (`on_write`), Deletion (`on_unlink`), Date Timers (`on_time`), or Webhooks (`on_webhook`).
- **Incoming Webhook Receiver**: Registers a public, CSRF-free POST route `/web_studio_ce/trigger_webhook/<webhook_name>` to trigger python actions externally using JSON payloads.
- **Outbound Webhooks**: Perform outbound REST requests (POST, PUT, GET, PATCH) to external APIs.
- **Action Binders**: Trigger Python code, send emails, SMS, WhatsApp notifications, or schedule next activities.

---

## 🔄 7. Logging & Reversion System
- **Reversion Logs**: Track all modifications made in Studio CE (fields, views, menus, rules, approvals).
- **Undo Actions**: One-click revert option to restore database schemas, restore view files, or delete rules.

---

## 📦 8. Standard Module Exporter
- **Module Packaging**: Gather all customisations and generate a standalone zip archive.
- **Standard Structure**: Includes fields defined in python files, views, rules, approvals, and menus in XML data folders, plus a valid `__manifest__.py`.

---

## 🌿 9. Hierarchical Menu Editor
- **Full Tree Explorer**: Displays the entire nested navigation menu hierarchy in Odoo.
- **Menu Management**: Supports adding new sub-menus, renaming headers, re-sequencing order sequence, and unlinking custom menus recursively.
- **Window Action Targets**: Link menus directly to active Odoo window actions via visual dropdown lists.

---

## 🌟 10. Smart Buttons (Stat Buttons)
- **Drag-and-Drop Builder**: Drag a "Smart Button" layout component from the sidebar and drop it into the form header.
- **Automatic Button Box Injection**: Auto-provisions a `<div class="oe_button_box" name="button_box">` at the top of the form sheet if it does not already exist.
- **Stat Properties Editing**: Click on any smart button in preview mode to configure its label, select font-awesome icons, and map its click action to window actions.

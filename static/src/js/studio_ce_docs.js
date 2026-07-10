/** @odoo-module **/

import { Component, useState } from "@odoo/owl";

// ─────────────────────────────────────────────────────────────────────────────
//  Documentation Content — User Guide
// ─────────────────────────────────────────────────────────────────────────────

const USER_GUIDE_TOPICS = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: "🚀",
        sections: [
            {
                heading: "What is Studio CE?",
                content: `Odoo Studio CE (Community Edition) is a powerful no-code/low-code customization environment for Odoo Community Edition. It provides an interactive visual builder that lets you modify fields, views, PDF report templates, automated actions, menus, and user access rights — all without writing a single line of code.`,
            },
            {
                heading: "How to Open Studio CE",
                content: `To open Studio CE, navigate to any model view (e.g., Contacts, Sales Orders) in your Odoo backend. Look for the <strong>Studio CE</strong> toggle button in the top navigation bar. Click it to launch the Studio CE editor for the current model.`,
                tip: `The Studio CE button is only visible to users with the <strong>Studio Administrator</strong> permission. If you don't see the button, contact your system administrator.`,
            },
            {
                heading: "Interface Overview",
                content: `The Studio CE editor consists of three main areas:`,
                list: [
                    "<strong>Top Navbar</strong> — Shows the Studio CE branding, current model name, and action buttons (Help, Close Studio).",
                    "<strong>Left Sidebar</strong> — Contains tabbed panels for Fields, Views, and Automation Rules. This is where you make changes.",
                    "<strong>Central Canvas</strong> — The main workspace area showing a live preview and layout information for the active model.",
                ],
            },
            {
                heading: "Supported Odoo Versions",
                content: `Studio CE is designed for <strong>Odoo 17+</strong> (Community Edition). It uses OWL (Odoo Web Library) components and requires the <code>web</code>, <code>base_automation</code>, and <code>mail</code> modules as dependencies.`,
            },
        ],
    },
    {
        id: "managing-fields",
        title: "Managing Fields",
        icon: "📝",
        sections: [
            {
                heading: "Adding Custom Fields",
                content: `The <strong>Fields</strong> tab in the sidebar allows you to add new custom fields to the current model. Studio CE supports three field types out of the box:`,
                list: [
                    "<strong>Text (Char)</strong> — A single-line text field for short strings like names or labels.",
                    "<strong>Integer</strong> — A whole number field for counts, quantities, or numeric IDs.",
                    "<strong>Checkbox (Boolean)</strong> — A true/false toggle field.",
                ],
            },
            {
                heading: "Field Naming Convention",
                content: `All fields created by Studio CE are automatically prefixed with <code>x_studio_</code>. This is an Odoo convention for dynamically-created fields and ensures they don't conflict with core module fields.`,
                tip: `For example, if you create a field labeled "Custom Label", it will be stored as <code>x_studio_field_XXXX</code> where XXXX is a unique timestamp-based suffix.`,
            },
            {
                heading: "Viewing Existing Fields",
                content: `The <strong>Existing Fields</strong> list in the Fields tab shows all fields currently defined on the model, including both core Odoo fields and Studio CE custom fields. Each field displays its label and technical name.`,
            },
            {
                heading: "Adding Fields to Views",
                content: `Each field in the existing fields list has an <strong>"Add to View"</strong> button. Clicking this adds the field to the first available form view using XPath-based view inheritance. The field is inserted inside the form's <code>&lt;sheet&gt;</code> element.`,
                warning: `Fields are added to the <em>first</em> form view found for the model. If the model has multiple form views, verify the correct view received the modification.`,
            },
        ],
    },
    {
        id: "editing-views",
        title: "Editing Views",
        icon: "🖼️",
        sections: [
            {
                heading: "How View Editing Works",
                content: `Studio CE modifies views using Odoo's native <strong>view inheritance</strong> system. Instead of directly editing the original view XML, Studio CE creates (or updates) an inherited view with the <code>is_studio_ce</code> flag set to <code>True</code>.`,
            },
            {
                heading: "View Types",
                content: `The <strong>Views</strong> tab shows all views associated with the current model, filtered to include:`,
                list: [
                    "<strong>Form views</strong> — Detail/edit views for individual records.",
                    "<strong>Tree views</strong> — List/table views showing multiple records.",
                    "<strong>Search views</strong> — Define search filters and group-by options.",
                ],
            },
            {
                heading: "Understanding Inherited Views",
                content: `When you add a field to a view, Studio CE creates an inherited view named <code>[original_view_name]_studio_ce_custom</code>. Subsequent modifications to the same view are appended to this inherited view rather than creating new ones. This keeps customizations organized and reversible.`,
                tip: `To remove a Studio CE customization, find the inherited view in <strong>Settings → Technical → Views</strong> and archive or delete the view with <code>is_studio_ce = True</code>.`,
            },
            {
                heading: "XPath Expressions",
                content: `View modifications use XPath expressions to target specific elements in the original view's XML. By default, Studio CE targets <code>//sheet</code> with <code>position="inside"</code>, meaning fields are appended inside the form's sheet area.`,
            },
        ],
    },
    {
        id: "automation-rules",
        title: "Automation Rules",
        icon: "⚡",
        sections: [
            {
                heading: "What Are Automation Rules?",
                content: `Automation rules are triggers that execute actions automatically when specific events occur on a model. Studio CE leverages Odoo's built-in <code>base.automation</code> module to create these rules.`,
            },
            {
                heading: "Creating a Rule",
                content: `In the <strong>Rules</strong> tab, click <strong>"Create Rule"</strong> to add a new automation. By default, rules are created with the <code>on_create</code> trigger, which fires when a new record is created on the model.`,
            },
            {
                heading: "Available Triggers",
                content: `Odoo's base automation framework supports several trigger events:`,
                list: [
                    "<strong>on_create</strong> — When a record is created.",
                    "<strong>on_write</strong> — When a record is updated.",
                    "<strong>on_unlink</strong> — When a record is deleted.",
                    "<strong>on_change</strong> — When a specific field value changes.",
                    "<strong>on_time</strong> — Based on a date/datetime field condition.",
                ],
            },
            {
                heading: "Managing Existing Rules",
                content: `All automation rules for the current model are listed in the Rules tab, showing the rule name and its trigger type. Rules created by Studio CE are flagged with <code>is_studio_ce = True</code> for easy identification.`,
                tip: `For advanced configuration (server actions, email templates, Python code), edit the automation rule directly in <strong>Settings → Technical → Automated Actions</strong>.`,
            },
        ],
    },
    {
        id: "security-permissions",
        title: "Security & Permissions",
        icon: "🔒",
        sections: [
            {
                heading: "Who Can Access Studio CE?",
                content: `Access to Studio CE is restricted to users with the <strong>Studio Administrator</strong> permission. This is a dedicated security group (<code>web_studio_ce.group_studio_ce</code>) that controls who can open and use the Studio CE editor.`,
            },
            {
                heading: "The Studio Administrator Group",
                content: `By default, only the <strong>root user</strong> and the <strong>admin user</strong> have Studio Administrator permissions. The group is defined under the <strong>Studio CE</strong> category and implies the base <code>Internal User</code> group.`,
            },
            {
                heading: "Granting Access",
                content: `To grant a user access to Studio CE:`,
                list: [
                    "Go to <strong>Settings → Users & Companies → Users</strong>.",
                    "Select the user you want to grant access to.",
                    "Under the <strong>Studio CE</strong> section, enable <strong>Studio Administrator</strong>.",
                    "Save the user record.",
                ],
            },
            {
                heading: "Access Control in Detail",
                content: `Every Studio CE controller endpoint checks for <code>web_studio_ce.group_studio_ce</code> membership before executing. If a user without this group attempts to call any Studio CE API, they will receive an <strong>"Access Denied"</strong> error.`,
                warning: `Studio CE grants significant power to modify your Odoo database structure. Only assign the Studio Administrator role to trusted users who understand the implications of adding fields and modifying views.`,
            },
        ],
    },
    {
        id: "troubleshooting",
        title: "Troubleshooting / FAQ",
        icon: "🔧",
        sections: [
            {
                heading: "\"Access Denied\" Error",
                content: `This error means your user account doesn't have the <strong>Studio Administrator</strong> group. Ask your system administrator to grant you the Studio CE permission under Settings → Users.`,
            },
            {
                heading: "\"Field already exists\" Error",
                content: `This occurs when you try to create a field with a technical name that already exists on the model. Studio CE auto-generates unique names using timestamps, so this is rare. If it happens, try again — a new timestamp suffix will be generated.`,
            },
            {
                heading: "\"XML Parsing Error\"",
                content: `This error occurs when Studio CE cannot parse the existing view's XML while trying to append modifications. This may indicate corrupted view architecture. Check the view's XML in <strong>Settings → Technical → Views</strong>.`,
            },
            {
                heading: "Studio CE Button Not Visible",
                content: `The Studio CE toggle in the main Odoo navbar is only visible to users with the Studio Administrator group. Additionally, the button requires the current page to have an active model context (e.g., you must be viewing a model's records, not a static page).`,
            },
            {
                heading: "Changes Not Appearing",
                content: `If your field or view changes aren't appearing:`,
                list: [
                    "Hard-refresh your browser (<code>Ctrl+Shift+R</code> or <code>Cmd+Shift+R</code>).",
                    "Clear your browser cache.",
                    "Restart the Odoo server to reload the registry.",
                    "Check the browser console for JavaScript errors.",
                ],
            },
            {
                heading: "How to Undo Changes",
                content: `Studio CE modifications are stored as inherited views and custom fields in the database. To undo changes:`,
                list: [
                    "<strong>Remove a field:</strong> Go to Settings → Technical → Database Structure → Fields, find the field with <code>is_studio_ce = True</code>, and delete it.",
                    "<strong>Remove a view modification:</strong> Go to Settings → Technical → Views, find the inherited view with <code>is_studio_ce = True</code>, and archive or delete it.",
                    "<strong>Remove an automation:</strong> Go to Settings → Technical → Automated Actions, find the rule with <code>is_studio_ce = True</code>, and delete it.",
                ],
            },
        ],
    },
    {
        id: "export-backup",
        title: "Export & Backup",
        icon: "📦",
        sections: [
            {
                heading: "Export Wizard",
                content: `Studio CE includes a built-in <strong>Export Wizard</strong> that packages all your customizations into a standalone Odoo module. Access it via the <strong>Studio CE → Export Module</strong> menu item.`,
            },
            {
                heading: "What Gets Exported?",
                content: `The export process gathers all Studio CE customizations:`,
                list: [
                    "<strong>Custom Fields</strong> — All fields with <code>is_studio_ce = True</code>, exported as Python model definitions.",
                    "<strong>Custom Views</strong> — All inherited views created by Studio CE, exported as XML data files.",
                    "<strong>Custom Menus</strong> — Any menus flagged as Studio CE creations.",
                    "<strong>Automation Rules</strong> — All automation rules with <code>is_studio_ce = True</code>, exported as XML data.",
                ],
            },
            {
                heading: "Downloading the ZIP",
                content: `After clicking <strong>"Export ZIP"</strong>, the wizard generates a complete Odoo module as a ZIP file containing:`,
                list: [
                    "<code>__manifest__.py</code> — Module manifest with dependencies.",
                    "<code>__init__.py</code> and <code>models/__init__.py</code> — Python package initialization.",
                    "<code>models/custom_models.py</code> — Field definitions grouped by model.",
                    "<code>views/custom_views.xml</code> — View inheritance records.",
                    "<code>views/custom_menus.xml</code> — Menu item records.",
                    "<code>data/custom_automations.xml</code> — Automation rule records.",
                ],
            },
            {
                heading: "Installing the Exported Module",
                content: `To use the exported module:`,
                list: [
                    "Extract the ZIP file into your Odoo <code>addons</code> directory.",
                    "Restart Odoo and update the apps list.",
                    "Install the new module from the Apps menu.",
                ],
                tip: `The exported module is a fully standalone Odoo module. You can version-control it with Git, share it across instances, or use it as a starting point for further development.`,
            },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Documentation Content — Developer Docs
// ─────────────────────────────────────────────────────────────────────────────

const DEVELOPER_DOCS_TOPICS = [
    {
        id: "architecture",
        title: "Architecture Overview",
        icon: "🏗️",
        sections: [
            {
                heading: "Module Structure",
                content: `The Studio CE module follows standard Odoo module conventions:`,
                code: `web_studio_ce/
├── __init__.py              # Python package init
├── __manifest__.py          # Module manifest
├── controllers/
│   ├── __init__.py
│   └── main.py              # JSON-RPC endpoints
├── models/
│   ├── __init__.py
│   ├── ir_model_fields.py   # Field extensions
│   ├── ir_ui_view.py        # View extensions
│   └── studio_export.py     # Export wizard + model extensions
├── security/
│   ├── security.xml         # Groups & categories
│   └── ir.model.access.csv  # ACL rules
├── static/src/
│   ├── js/                  # OWL components
│   ├── scss/                # Stylesheets
│   └── xml/                 # QWeb templates
├── tests/                   # Test suite
└── views/
    └── studio_ce_menus.xml  # Menu items & wizard views`,
            },
            {
                heading: "Component Architecture",
                content: `Studio CE's frontend is built with OWL (Odoo Web Library) components:`,
                list: [
                    "<strong>StudioCeEditor</strong> — Main editor component. Registered as a client action (<code>web_studio_ce.editor_action</code>). Manages state for fields, views, automations, and groups.",
                    "<strong>StudioCeDocsPanel</strong> — Documentation overlay component. Rendered conditionally when the Help button is clicked.",
                    "<strong>NavBar patch</strong> — Patches the Odoo NavBar to add the Studio CE toggle button for users with the correct permission.",
                ],
            },
            {
                heading: "Data Flow",
                content: `The frontend communicates with the backend exclusively through <strong>JSON-RPC</strong> calls:`,
                list: [
                    "User clicks an action in the sidebar (e.g., \"Add Custom Field\").",
                    "The OWL component calls <code>this.rpc()</code> with the appropriate endpoint.",
                    "The controller validates permissions, processes the request, and returns JSON.",
                    "The component updates its reactive state, triggering a re-render.",
                    "For field additions, the Odoo registry is reloaded server-side to create the DB column.",
                ],
            },
        ],
    },
    {
        id: "api-reference",
        title: "API Reference",
        icon: "📡",
        sections: [
            {
                heading: "GET Studio Context",
                content: `Returns metadata about fields, views, automations, and security groups for a model.`,
                code: `Endpoint: POST /web_studio_ce/get_studio_context
Auth: user (requires group_studio_ce)
Content-Type: application/json

Request Body:
{
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
        "model_name": "res.partner",   // Required: technical model name
        "view_id": 123                 // Optional: specific view ID
    }
}

Response:
{
    "model_id": 42,
    "fields": [
        {
            "id": 1,
            "name": "x_studio_field_1234",
            "field_description": "Custom Label",
            "ttype": "char",
            "relation": false,
            "is_studio_ce": true
        }
    ],
    "views": [
        {
            "id": 10,
            "name": "res.partner.form",
            "type": "form",
            "arch": "<form>...</form>",
            "is_studio_ce": false
        }
    ],
    "groups": [
        {
            "id": 5,
            "display_name": "Studio Administrator",
            "category_name": "Studio CE"
        }
    ],
    "automations": [
        {
            "id": 3,
            "name": "Auto Rule",
            "trigger": "on_create",
            "is_studio_ce": true
        }
    ]
}`,
            },
            {
                heading: "Add Field",
                content: `Creates a new custom field on a model dynamically.`,
                code: `Endpoint: POST /web_studio_ce/add_field
Auth: user (requires group_studio_ce)

Request Body:
{
    "params": {
        "model_name": "res.partner",     // Required
        "field_name": "custom_priority",  // Auto-prefixed with x_studio_
        "field_label": "Priority Level",  // Required: human-readable label
        "field_type": "integer",          // Required: char|integer|boolean|...
        "relation": "res.partner"         // Optional: for relational fields
    }
}

Response (success):
{
    "id": 456,
    "name": "x_studio_custom_priority",
    "field_description": "Priority Level",
    "ttype": "integer",
    "relation": false
}

Response (error):
{
    "error": "Field x_studio_custom_priority already exists."
}

Side Effects:
- Creates ir.model.fields record with is_studio_ce=True
- Triggers registry reload (setup_models + init_models)
- Creates physical DB column on the model's table`,
            },
            {
                heading: "Edit View",
                content: `Adds XPath-based modifications to a view via inheritance.`,
                code: `Endpoint: POST /web_studio_ce/edit_view
Auth: user (requires group_studio_ce)

Request Body:
{
    "params": {
        "view_id": 10,
        "xpath_expr": "//sheet",
        "modification_xml": "<xpath expr=\\"//sheet\\" position=\\"inside\\"><field name=\\"x_studio_field\\"/></xpath>"
    }
}

Response (success):
{
    "studio_view_id": 99,
    "arch": "<data>...</data>"
}

Behavior:
- If no studio_ce inherited view exists: creates one
- If one already exists: appends the new XPath to the existing <data> root`,
            },
            {
                heading: "Save Automation",
                content: `Creates a new automation rule on a model.`,
                code: `Endpoint: POST /web_studio_ce/save_automation
Auth: user (requires group_studio_ce)

Request Body:
{
    "params": {
        "model_name": "res.partner",
        "name": "Auto-tag new contacts",
        "trigger_event": "on_create",
        "action_type": "code",    // Optional, default: "code"
        "code": "pass"            // Optional, default: "pass"
    }
}

Response:
{
    "id": 7,
    "name": "Auto-tag new contacts"
}`,
            },
        ],
    },
    {
        id: "data-models",
        title: "Data Models",
        icon: "🗄️",
        sections: [
            {
                heading: "ir.model.fields Extension",
                content: `Studio CE extends the <code>ir.model.fields</code> model with a boolean flag to track which fields were created by Studio CE.`,
                code: `class IrModelFields(models.Model):
    _inherit = 'ir.model.fields'

    is_studio_ce = fields.Boolean(
        string='Created by Studio CE',
        default=False
    )`,
            },
            {
                heading: "ir.ui.view Extension",
                content: `Studio CE extends <code>ir.ui.view</code> to identify inherited views created by the editor.`,
                code: `class IrUiView(models.Model):
    _inherit = 'ir.ui.view'

    is_studio_ce = fields.Boolean(
        string='Created by Studio CE',
        default=False
    )`,
            },
            {
                heading: "base.automation Extension",
                content: `Automation rules created by Studio CE are flagged for identification and export.`,
                code: `class BaseAutomation(models.Model):
    _inherit = 'base.automation'

    is_studio_ce = fields.Boolean(
        string='Created by Studio CE',
        default=False
    )`,
            },
            {
                heading: "ir.ui.menu Extension",
                content: `Menu items created by Studio CE are flagged for export purposes.`,
                code: `class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'

    is_studio_ce = fields.Boolean(
        string='Created by Studio CE',
        default=False
    )`,
            },
            {
                heading: "studio.ce.export (Transient Model)",
                content: `A wizard model used to package all Studio CE customizations into a downloadable Odoo module ZIP file.`,
                code: `class StudioCeExport(models.TransientModel):
    _name = 'studio.ce.export'
    _description = 'Studio CE Customization Export Engine'

    name = fields.Char(default='studio_ce_customizations.zip')
    zip_file = fields.Binary(readonly=True)

    def action_export_zip(self):
        # Gathers is_studio_ce records from:
        # - ir.model.fields
        # - ir.ui.view
        # - ir.ui.menu
        # - base.automation
        # Generates a complete Odoo module as ZIP`,
            },
        ],
    },
    {
        id: "frontend-architecture",
        title: "Frontend Architecture",
        icon: "⚛️",
        sections: [
            {
                heading: "OWL Component Lifecycle",
                content: `The <code>StudioCeEditor</code> component follows the OWL lifecycle:`,
                list: [
                    "<strong>setup()</strong> — Initializes services (<code>useService('rpc')</code>, <code>useService('action')</code>) and reactive state via <code>useState()</code>.",
                    "<strong>onWillStart()</strong> — Async hook that calls <code>loadStudioContext()</code> to fetch model metadata before the first render.",
                    "<strong>Reactive rendering</strong> — State changes trigger automatic re-renders. The <code>state</code> object is reactive thanks to OWL's <code>useState</code>.",
                ],
            },
            {
                heading: "State Management",
                content: `The editor maintains a single reactive state object:`,
                code: `this.state = useState({
    model: "res.partner",     // Current model name
    viewId: null,             // Current view ID (optional)
    activeTab: "views",       // Active sidebar tab
    fields: [],               // Model field metadata
    views: [],                // Model view metadata
    automations: [],          // Automation rule metadata
    groups: [],               // Security group metadata
    loading: true,            // Loading spinner state
    showDocs: false,          // Documentation panel visibility
});`,
            },
            {
                heading: "Service Hooks",
                content: `Studio CE uses two OWL service hooks:`,
                list: [
                    "<code>useService('rpc')</code> — For JSON-RPC calls to Studio CE controller endpoints.",
                    "<code>useService('action')</code> — For triggering Odoo client actions (e.g., navigating away via <code>doAction</code>).",
                ],
            },
            {
                heading: "Template Binding",
                content: `Templates use OWL's directive system:`,
                list: [
                    "<code>t-on-click</code> — Event handlers for button clicks.",
                    "<code>t-att-class</code> — Dynamic class binding for active tab states.",
                    "<code>t-foreach / t-as / t-key</code> — List rendering for fields, views, and automations.",
                    "<code>t-if</code> — Conditional rendering for tab content and loading states.",
                    "<code>t-esc</code> — Text interpolation for dynamic content.",
                ],
            },
            {
                heading: "Action Registry",
                content: `The editor is registered as a client action in Odoo's action registry:`,
                code: `registry.category("actions").add(
    "web_studio_ce.editor_action",
    StudioCeEditor
);

// This allows it to be launched via:
actionService.doAction({
    type: "ir.actions.client",
    tag: "web_studio_ce.editor_action",
    params: { model: "res.partner", view_id: 123 }
});`,
            },
        ],
    },
    {
        id: "security-model",
        title: "Security Model",
        icon: "🛡️",
        sections: [
            {
                heading: "Security Group",
                content: `Studio CE defines a single security group:`,
                code: `Group: web_studio_ce.group_studio_ce
Name: Studio Administrator
Category: Studio CE
Implied groups: base.group_user (Internal User)
Default members: root, admin`,
            },
            {
                heading: "Access Control Lists (ACLs)",
                content: `The <code>ir.model.access.csv</code> file defines CRUD permissions for Studio CE models. Only users in the <code>group_studio_ce</code> group have access to the export wizard model (<code>studio.ce.export</code>).`,
            },
            {
                heading: "Controller-Level Checks",
                content: `Every controller endpoint performs an explicit permission check before processing:`,
                code: `if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
    return {'error': 'Access Denied: Studio CE Administrator permissions required.'}`,
                warning: `This check is performed on every single API call. There is no way to bypass it without the correct group membership.`,
            },
            {
                heading: "Frontend Permission Check",
                content: `The NavBar patch also checks permissions to control visibility of the Studio CE toggle button:`,
                code: `async checkStudioCePermission() {
    const userService = this.env.services.user;
    if (userService) {
        this.isStudioCeAdmin = await userService.hasGroup(
            "web_studio_ce.group_studio_ce"
        );
    } else {
        this.isStudioCeAdmin = session.is_admin || false;
    }
    this.render();
}`,
            },
            {
                heading: "Security Data (noupdate)",
                content: `The security group records are defined with <code>noupdate="1"</code>, meaning they will not be overwritten during module upgrades. This ensures that custom group membership assignments are preserved.`,
            },
        ],
    },
    {
        id: "contributing",
        title: "Contributing Guide",
        icon: "🤝",
        sections: [
            {
                heading: "Code Conventions",
                content: `When contributing to Studio CE, follow these conventions:`,
                list: [
                    "<strong>Field names</strong> — Always use the <code>x_studio_</code> prefix for dynamically created fields.",
                    "<strong>Tracking flag</strong> — Set <code>is_studio_ce = True</code> on all records created by Studio CE (fields, views, menus, automations).",
                    "<strong>JavaScript modules</strong> — Use the <code>/** @odoo-module **/</code> header for all JS files.",
                    "<strong>OWL components</strong> — Extend from <code>Component</code>, use <code>useState</code> for reactivity.",
                    "<strong>Templates</strong> — Use <code>owl=\"1\"</code> attribute on template definitions.",
                    "<strong>Styling</strong> — Use Bootstrap 5 utility classes. Custom styles go in <code>studio_ce.scss</code>.",
                ],
            },
            {
                heading: "Pull Request Process",
                content: `To contribute:`,
                list: [
                    "Fork the repository and create a feature branch.",
                    "Make your changes following the code conventions above.",
                    "Test your changes in a fresh Odoo 17+ instance.",
                    "Submit a pull request with a clear description of what you changed and why.",
                    "Ensure your PR doesn't break existing functionality.",
                ],
            },
            {
                heading: "Testing Guidelines",
                content: `Studio CE includes a <code>tests/</code> directory for unit tests. When adding new features:`,
                list: [
                    "Add Python tests for new controller endpoints.",
                    "Test permission checks (both authorized and unauthorized access).",
                    "Test edge cases (duplicate field names, invalid XML, missing models).",
                    "Verify that the Odoo registry reloads correctly after field additions.",
                ],
            },
            {
                heading: "License",
                content: `Studio CE is licensed under <strong>LGPL-3</strong> (GNU Lesser General Public License v3). All contributions must be compatible with this license.`,
            },
        ],
    },
    {
        id: "extending",
        title: "Extending Studio CE",
        icon: "🔌",
        sections: [
            {
                heading: "Adding New Field Types",
                content: `To add support for additional field types (e.g., Date, Selection, Many2one):`,
                list: [
                    "Add a new button in the <strong>Fields tab</strong> of <code>studio_ce_editor.xml</code>.",
                    "Map the button's <code>t-on-click</code> to <code>addCustomField()</code> with the correct Odoo field type string.",
                    "If the field type requires extra parameters (e.g., <code>relation</code> for Many2one), extend the <code>addCustomField()</code> method to prompt for them.",
                    "Update the <code>/web_studio_ce/add_field</code> controller to handle any new parameters.",
                    "Update the export wizard to handle the new field type in its code generation.",
                ],
            },
            {
                heading: "Adding New Sidebar Tabs",
                content: `To add a new tab (e.g., a Reports editor):`,
                list: [
                    "Add a new <code>&lt;li&gt;</code> in the sidebar's <code>&lt;ul class=\"nav nav-tabs\"&gt;</code> in the editor template.",
                    "Add a corresponding <code>t-if</code> content div in the <code>tab-content</code> area.",
                    "Add the tab key to the <code>activeTab</code> state values.",
                    "Implement any required backend endpoints in <code>controllers/main.py</code>.",
                ],
            },
            {
                heading: "Adding New Endpoints",
                content: `To add a new backend API endpoint:`,
                code: `# In controllers/main.py
@http.route('/web_studio_ce/your_endpoint', type='json', auth='user')
def your_endpoint(self, param1, param2):
    # Always check permissions first
    if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
        return {'error': 'Access Denied.'}
    
    # Your logic here
    return {'result': 'success'}`,
            },
            {
                heading: "Adding New Automation Triggers",
                content: `Studio CE currently creates automations with <code>on_create</code> as the default trigger. To support more triggers:`,
                list: [
                    "Add trigger selection UI in the Rules tab (e.g., a dropdown before the Create button).",
                    "Pass the selected trigger value to the <code>/web_studio_ce/save_automation</code> endpoint.",
                    "The backend already accepts any valid <code>trigger_event</code> string — no controller changes needed.",
                ],
            },
        ],
    },
    {
        id: "configuration",
        title: "Configuration & Deployment",
        icon: "⚙️",
        sections: [
            {
                heading: "Dependencies",
                content: `Studio CE requires the following Odoo modules:`,
                list: [
                    "<code>web</code> — Core web framework (OWL, RPC, services).",
                    "<code>base_automation</code> — Provides the <code>base.automation</code> model for automation rules.",
                    "<code>mail</code> — Required for certain base model features.",
                ],
            },
            {
                heading: "Installation",
                content: `To install Studio CE:`,
                list: [
                    "Place the <code>web_studio_ce</code> directory in your Odoo <code>addons</code> path.",
                    "Restart the Odoo server.",
                    "Go to <strong>Apps</strong>, remove the \"Apps\" filter, and search for \"Studio CE\".",
                    "Click <strong>Install</strong> (or <strong>Activate</strong>).",
                ],
            },
            {
                heading: "Odoo Version Compatibility",
                content: `Studio CE is built for <strong>Odoo 17+</strong> Community Edition. It uses:`,
                list: [
                    "<strong>OWL 2</strong> — The component framework used since Odoo 16+.",
                    "<strong>ES Module syntax</strong> — <code>import</code>/<code>export</code> statements.",
                    "<strong>res.groups.privilege</strong> — Privilege-based group system available in Odoo 17+.",
                ],
                warning: `Studio CE is NOT compatible with Odoo Enterprise's built-in Studio module. Do not install both simultaneously on the same database.`,
            },
            {
                heading: "Upgrading",
                content: `To upgrade Studio CE after updating the source code:`,
                list: [
                    "Stop the Odoo server.",
                    "Update the module files on disk.",
                    "Restart Odoo with the <code>-u web_studio_ce</code> flag, or upgrade via the Apps menu.",
                ],
                tip: `Security data uses <code>noupdate="1"</code>, so group membership assignments are preserved during upgrades. Custom fields, views, and automations are also unaffected.`,
            },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
//  StudioCeDocsPanel Component
// ─────────────────────────────────────────────────────────────────────────────

export class StudioCeDocsPanel extends Component {
    setup() {
        this.state = useState({
            activeDocType: "user", // "user" or "dev"
            activeTopicId: USER_GUIDE_TOPICS[0].id,
            searchQuery: "",
        });
    }

    get topics() {
        return this.state.activeDocType === "user"
            ? USER_GUIDE_TOPICS
            : DEVELOPER_DOCS_TOPICS;
    }

    get filteredTopics() {
        const query = this.state.searchQuery.toLowerCase().trim();
        if (!query) {
            return this.topics;
        }
        return this.topics.filter((topic) => {
            if (topic.title.toLowerCase().includes(query)) return true;
            return topic.sections.some(
                (section) =>
                    section.heading.toLowerCase().includes(query) ||
                    section.content.toLowerCase().includes(query)
            );
        });
    }

    get activeTopic() {
        const found = this.topics.find(
            (t) => t.id === this.state.activeTopicId
        );
        // If active topic is not in filtered list, fall back to first match
        if (!found) {
            return this.filteredTopics[0] || null;
        }
        return found;
    }

    switchDocType(docType) {
        this.state.activeDocType = docType;
        this.state.searchQuery = "";
        const topics =
            docType === "user" ? USER_GUIDE_TOPICS : DEVELOPER_DOCS_TOPICS;
        this.state.activeTopicId = topics[0].id;
    }

    selectTopic(topicId) {
        this.state.activeTopicId = topicId;
    }

    onSearchInput(ev) {
        this.state.searchQuery = ev.target.value;
    }

    close() {
        this.props.onClose();
    }
}

StudioCeDocsPanel.template = "web_studio_ce.StudioCeDocsPanel";
StudioCeDocsPanel.props = {
    onClose: Function,
};

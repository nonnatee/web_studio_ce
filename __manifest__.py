# -*- coding: utf-8 -*-
{
    'name': 'Odoo Studio CE',
    'version': '1.0',
    'category': 'Extra Tools',
    'summary': 'Interactive visual builder for views, reports, automations, and security in Odoo CE.',
    'description': """
Odoo Studio CE is a complete no-code/low-code customization environment replicating Odoo 19 Enterprise Studio features:
* App & Model Wizard: Easily create new models with 14 suggested features (Chatter, Archiving, Sorting, Company, Tags, image fields, etc.) using Odoo 19 <list> syntax.
* Multi-Step Button Approvals: Configure button-specific sequential approval workflows with exclusive approval rules and visual badge indicators.
* Security Matrix: Edit group ACL privileges (Read/Write/Create/Delete) and record rules dynamically.
* Automated Actions & Webhooks: Support incoming webhook endpoints and outgoing REST REST actions.
* QWeb Report Editor: Interactive element selector, raw XML editing tab, and slash commands snippets editor.
* Customisation Logger: Live list of changes with support to revert any modification.
    """,
    'author': 'Nonnatee Kanjana',
    'depends': [
        'web',
        'base_automation',
        'mail',
        'product',
    ],
    'data': [
        'security/security.xml',
        'security/ir.model.access.csv',
        'views/studio_ce_menus.xml',
    ],
    'assets': {
        'web.assets_backend': [
            '/web_studio_ce/static/src/scss/studio_ce.scss',
            '/web_studio_ce/static/src/js/studio_ce_navbar_toggle.js',
            '/web_studio_ce/static/src/xml/studio_ce_navbar_toggle.xml',
            '/web_studio_ce/static/src/js/studio_ce_patches.js',
            '/web_studio_ce/static/src/js/studio_ce_editor.js',
            '/web_studio_ce/static/src/js/studio_ce_sidebar.js',
            '/web_studio_ce/static/src/js/studio_ce_canvas.js',
            '/web_studio_ce/static/src/js/report_editor.js',
            '/web_studio_ce/static/src/js/automation_editor.js',
            '/web_studio_ce/static/src/js/security_editor.js',
            '/web_studio_ce/static/src/js/studio_ce_docs.js',
            '/web_studio_ce/static/src/js/app_creator.js',
            '/web_studio_ce/static/src/js/menu_editor.js',
            '/web_studio_ce/static/src/js/model_explorer.js',
            '/web_studio_ce/static/src/js/properties_builder.js',
            '/web_studio_ce/static/src/js/approval_editor.js',
            '/web_studio_ce/static/src/js/studio_ce_debug_items.js',
            '/web_studio_ce/static/src/xml/studio_ce_editor.xml',
            '/web_studio_ce/static/src/xml/studio_ce_sidebar.xml',
            '/web_studio_ce/static/src/xml/report_editor.xml',
            '/web_studio_ce/static/src/xml/automation_editor.xml',
            '/web_studio_ce/static/src/xml/approval_editor.xml',
            '/web_studio_ce/static/src/xml/studio_ce_docs.xml',
            '/web_studio_ce/static/src/xml/app_creator.xml',
            '/web_studio_ce/static/src/xml/menu_editor.xml',
            '/web_studio_ce/static/src/xml/security_editor.xml',
            '/web_studio_ce/static/src/xml/model_explorer.xml',
            '/web_studio_ce/static/src/xml/properties_builder.xml',
            '/web_studio_ce/static/src/xml/studio_ce_canvas.xml',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}

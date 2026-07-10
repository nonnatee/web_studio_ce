# -*- coding: utf-8 -*-
{
    'name': 'Odoo StudioCE)',
    'version': '1.0',
    'category': 'Extra Tools',
    'summary': 'Interactive visual builder for views, reports, automations, and security in Odoo CE.',
    'description': """
This module provides a complete no-code/low-code customization environment for Odoo Community Edition.
It enables dynamic modification of fields, views, PDF report templates, automated actions, menus, and user access rights.
    """,
    'author': 'Nonnatee Kanjana',
    'depends': [
        'web',
        'base_automation',
        'mail',
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
            '/web_studio_ce/static/src/js/studio_ce_editor.js',
            '/web_studio_ce/static/src/js/studio_ce_sidebar.js',
            '/web_studio_ce/static/src/js/studio_ce_canvas.js',
            '/web_studio_ce/static/src/js/report_editor.js',
            '/web_studio_ce/static/src/js/automation_editor.js',
            '/web_studio_ce/static/src/js/security_editor.js',
            '/web_studio_ce/static/src/js/studio_ce_docs.js',
            '/web_studio_ce/static/src/xml/studio_ce_editor.xml',
            '/web_studio_ce/static/src/xml/studio_ce_sidebar.xml',
            '/web_studio_ce/static/src/xml/report_editor.xml',
            '/web_studio_ce/static/src/xml/automation_editor.xml',
            '/web_studio_ce/static/src/xml/studio_ce_docs.xml',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}

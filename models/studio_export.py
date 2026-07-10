# -*- coding: utf-8 -*-
import io
import zipfile
import base64
from odoo import models, fields, api

class BaseAutomation(models.Model):
    _inherit = 'base.automation'

    is_studio_ce = fields.Boolean(string='Created by Studio CE', default=False)

class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'

    is_studio_ce = fields.Boolean(string='Created by Studio CE', default=False)

class StudioCeExport(models.TransientModel):
    _name = 'studio.ce.export'
    _description = 'Studio CE Customization Export Engine'

    name = fields.Char(string='File Name', default='studio_ce_customizations.zip')
    zip_file = fields.Binary(string='Zip File', readonly=True)

    def action_export_zip(self):
        # 1. Gather custom fields
        custom_fields = self.env['ir.model.fields'].search([('is_studio_ce', '=', True)])
        # 2. Gather custom views
        custom_views = self.env['ir.ui.view'].search([('is_studio_ce', '=', True)])
        # 3. Gather custom menus
        custom_menus = self.env['ir.ui.menu'].search([('is_studio_ce', '=', True)])
        # 4. Gather custom automations
        custom_automations = self.env['base.automation'].search([('is_studio_ce', '=', True)])

        # Create zip in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Write manifest
            manifest = f"""# -*- coding: utf-8 -*-
{{
    'name': 'Studio CE Customizations',
    'version': '1.0',
    'summary': 'Exported customizations from Studio CE',
    'depends': ['base', 'web', 'base_automation', 'mail'],
    'data': [
        'views/custom_views.xml',
        'views/custom_menus.xml',
        'data/custom_automations.xml',
    ],
    'installable': True,
    'license': 'LGPL-3',
}}
"""
            zip_file.writestr('__manifest__.py', manifest)
            zip_file.writestr('__init__.py', "from . import models\n")
            zip_file.writestr('models/__init__.py', "from . import custom_models\n")

            # Generate models/custom_models.py
            models_code = ["# -*- coding: utf-8 -*-\nfrom odoo import models, fields\n"]
            grouped_fields = {}
            for field in custom_fields:
                grouped_fields.setdefault(field.model, []).append(field)

            for model_name, fields_list in grouped_fields.items():
                class_name = ''.join([x.capitalize() for x in model_name.split('.')])
                models_code.append(f"\nclass {class_name}(models.Model):")
                models_code.append(f"    _inherit = '{model_name}'\n")
                for f in fields_list:
                    # Map field types
                    f_type = f.ttype
                    kwargs = [f"string='{f.field_description}'"]
                    if f.required:
                        kwargs.append("required=True")
                    if f.readonly:
                        kwargs.append("readonly=True")
                    
                    if f_type == 'char':
                        models_code.append(f"    {f.name} = fields.Char({', '.join(kwargs)})")
                    elif f_type == 'text':
                        models_code.append(f"    {f.name} = fields.Text({', '.join(kwargs)})")
                    elif f_type == 'integer':
                        models_code.append(f"    {f.name} = fields.Integer({', '.join(kwargs)})")
                    elif f_type == 'float':
                        models_code.append(f"    {f.name} = fields.Float({', '.join(kwargs)})")
                    elif f_type == 'boolean':
                        models_code.append(f"    {f.name} = fields.Boolean({', '.join(kwargs)})")
                    elif f_type == 'selection':
                        selection_values = f.selection_ids or [('draft', 'Draft')] # fallback
                        models_code.append(f"    {f.name} = fields.Selection({selection_values}, {', '.join(kwargs)})")
                    elif f_type == 'many2one':
                        kwargs.insert(0, f"'{f.relation}'")
                        models_code.append(f"    {f.name} = fields.Many2one({', '.join(kwargs)})")
            
            zip_file.writestr('models/custom_models.py', '\n'.join(models_code))

            # Generate views/custom_views.xml
            views_xml = ['<?xml version="1.0" encoding="utf-8"?>\n<odoo>']
            for view in custom_views:
                views_xml.append(f"""    <record id="view_custom_{view.id}" model="ir.ui.view">
        <field name="name">{view.name}</field>
        <field name="model">{view.model}</field>
        <field name="inherit_id" ref="{view.inherit_id.xml_id if view.inherit_id else ''}"/>
        <field name="arch" type="xml">
{view.arch}
        </field>
    </record>""")
            views_xml.append('</odoo>')
            zip_file.writestr('views/custom_views.xml', '\n'.join(views_xml))

            # Generate views/custom_menus.xml
            menus_xml = ['<?xml version="1.0" encoding="utf-8"?>\n<odoo>']
            for menu in custom_menus:
                parent_ref = f' ref="{menu.parent_id.xml_id}"' if menu.parent_id else ''
                action_ref = f' action="{menu.action.xml_id}"' if menu.action else ''
                menus_xml.append(f'    <menuitem id="menu_custom_{menu.id}" name="{menu.name}"{parent_ref}{action_ref} sequence="{menu.sequence}"/>')
            menus_xml.append('</odoo>')
            zip_file.writestr('views/custom_menus.xml', '\n'.join(menus_xml))

            # Generate data/custom_automations.xml
            automations_xml = ['<?xml version="1.0" encoding="utf-8"?>\n<odoo>\n    <data noupdate="1">']
            for auto in custom_automations:
                automations_xml.append(f"""        <record id="automation_custom_{auto.id}" model="base.automation">
            <field name="name">{auto.name}</field>
            <field name="model_id" ref="base.model_{auto.model_id.model.replace('.', '_')}"/>
            <field name="trigger">{auto.trigger}</field>
            <field name="active" eval="True"/>
        </record>""")
            automations_xml.append('    </data>\n</odoo>')
            zip_file.writestr('data/custom_automations.xml', '\n'.join(automations_xml))

        zip_buffer.seek(0)
        self.zip_file = base64.b64encode(zip_buffer.read())
        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/?model=studio.ce.export&id={self.id}&field=zip_file&download=true&filename={self.name}',
            'target': 'self',
        }

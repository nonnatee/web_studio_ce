# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
from lxml import etree

class StudioCeController(http.Controller):

    @http.route('/web_studio_ce/get_studio_context', type='json', auth='user')
    def get_studio_context(self, model_name, view_id=None):
        """Returns metadata about fields, views, automations, and groups for a given model."""
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied: Studio CE Administrator permissions required.'}

        model = request.env['ir.model'].search([('model', '=', model_name)], limit=1)
        if not model:
            return {'error': f'Model {model_name} not found.'}

        # Fields
        fields_data = []
        for field in request.env['ir.model.fields'].search([('model_id', '=', model.id)]):
            fields_data.append({
                'id': field.id,
                'name': field.name,
                'field_description': field.field_description,
                'ttype': field.ttype,
                'relation': field.relation,
                'is_studio_ce': field.is_studio_ce,
            })

        # Views
        views_data = []
        domain = [('model', '=', model_name), ('type', 'in', ['form', 'tree', 'search'])]
        for view in request.env['ir.ui.view'].search(domain):
            views_data.append({
                'id': view.id,
                'name': view.name,
                'type': view.type,
                'arch': view.arch,
                'is_studio_ce': view.is_studio_ce,
            })

        # Groups (for security panel)
        groups_data = []
        for group in request.env['res.groups'].search([]):
            groups_data.append({
                'id': group.id,
                'display_name': group.display_name,
                'category_name': group.category_id.name or 'Other',
            })

        # Automations
        automations_data = []
        for auto in request.env['base.automation'].search([('model_id', '=', model.id)]):
            automations_data.append({
                'id': auto.id,
                'name': auto.name,
                'trigger': auto.trigger,
                'is_studio_ce': auto.is_studio_ce,
            })

        return {
            'model_id': model.id,
            'fields': fields_data,
            'views': views_data,
            'groups': groups_data,
            'automations': automations_data,
        }

    @http.route('/web_studio_ce/add_field', type='json', auth='user')
    def add_field(self, model_name, field_name, field_label, field_type, relation=None):
        """Creates a custom field dynamically on a model."""
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        model = request.env['ir.model'].search([('model', '=', model_name)], limit=1)
        if not model:
            return {'error': f'Model {model_name} not found.'}

        # Enforce name prefix
        if not field_name.startswith('x_studio_'):
            field_name = 'x_studio_' + field_name

        existing = request.env['ir.model.fields'].search([
            ('model_id', '=', model.id),
            ('name', '=', field_name)
        ])
        if existing:
            return {'error': f'Field {field_name} already exists.'}

        vals = {
            'name': field_name,
            'model_id': model.id,
            'model': model_name,
            'field_description': field_label,
            'ttype': field_type,
            'state': 'manual',
            'is_studio_ce': True,
        }
        if relation:
            vals['relation'] = relation

        new_field = request.env['ir.model.fields'].create(vals)
        
        # Trigger Odoo Registry reload so the new DB column is physically created
        request.env.registry.setup_models(request.cr)
        request.env.registry.init_models(request.cr, [model_name], request.context)

        return {
            'id': new_field.id,
            'name': new_field.name,
            'field_description': new_field.field_description,
            'ttype': new_field.ttype,
            'relation': new_field.relation,
        }

    @http.route('/web_studio_ce/edit_view', type='json', auth='user')
    def edit_view(self, view_id, xpath_expr, modification_xml):
        """Adds inheritance modifications to an XML view."""
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        target_view = request.env['ir.ui.view'].browse(view_id)
        if not target_view.exists():
            return {'error': 'Target view not found.'}

        # Find or create studio_ce inherited view
        studio_view = request.env['ir.ui.view'].search([
            ('inherit_id', '=', target_view.id),
            ('is_studio_ce', '=', True)
        ], limit=1)

        if not studio_view:
            studio_view = request.env['ir.ui.view'].create({
                'name': f'{target_view.name}_studio_ce_custom',
                'model': target_view.model,
                'inherit_id': target_view.id,
                'mode': 'extension',
                'is_studio_ce': True,
                'arch': f'<data>{modification_xml}</data>'
            })
        else:
            # Append modifications to the existing inherited view arch
            try:
                parser = etree.XMLParser(remove_blank_text=True)
                root = etree.fromstring(studio_view.arch, parser=parser)
                new_element = etree.fromstring(modification_xml, parser=parser)
                root.append(new_element)
                studio_view.arch = etree.tostring(root, encoding='utf-8', pretty_print=True).decode('utf-8')
            except Exception as e:
                return {'error': f'XML Parsing Error: {str(e)}'}

        return {
            'studio_view_id': studio_view.id,
            'arch': studio_view.arch
        }

    @http.route('/web_studio_ce/save_automation', type='json', auth='user')
    def save_automation(self, model_name, name, trigger_event, action_type='code', code='pass'):
        """Creates an automation rule using base.automation."""
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        model = request.env['ir.model'].search([('model', '=', model_name)], limit=1)
        vals = {
            'name': name,
            'model_id': model.id,
            'trigger': trigger_event,
            'is_studio_ce': True,
        }
        new_auto = request.env['base.automation'].create(vals)
        return {'id': new_auto.id, 'name': new_auto.name}

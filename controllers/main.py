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
    def add_field(self, model_name, field_name, field_label, field_type, relation=None, selection=None):
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
        if selection:
            vals['selection'] = selection

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
            'selection': new_field.selection,
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

    @http.route('/web_studio_ce/create_model', type='json', auth='user')
    def create_model(self, model_label, model_name, parent_menu_id=None):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        if not model_name.startswith('x_'):
            model_name = 'x_' + model_name

        existing = request.env['ir.model'].search([('model', '=', model_name)])
        if existing:
            return {'error': f'Model {model_name} already exists.'}

        # Create model
        model = request.env['ir.model'].create({
            'name': model_label,
            'model': model_name,
            'state': 'manual',
            'is_studio_ce': True,
        })

        # Setup models & init registry to instantiate the table and dynamic fields (like x_name)
        request.env.registry.setup_models(request.cr)
        request.env.registry.init_models(request.cr, [model_name], request.context)

        # Create default Form View
        form_view = request.env['ir.ui.view'].create({
            'name': f'{model_name}.form',
            'model': model_name,
            'type': 'form',
            'is_studio_ce': True,
            'arch': f'<form string="{model_label}"><sheet><group><field name="x_name"/></group></sheet></form>'
        })

        # Create default List View (Using <list> instead of <tree>)
        list_view = request.env['ir.ui.view'].create({
            'name': f'{model_name}.list',
            'model': model_name,
            'type': 'tree',
            'is_studio_ce': True,
            'arch': f'<list string="{model_label}"><field name="x_name"/></list>'
        })

        # Create default Search View
        search_view = request.env['ir.ui.view'].create({
            'name': f'{model_name}.search',
            'model': model_name,
            'type': 'search',
            'is_studio_ce': True,
            'arch': f'<search string="{model_label}"><field name="x_name"/></search>'
        })

        # Create Window Action (Use view_mode = 'list,form')
        action = request.env['ir.actions.act_window'].create({
            'name': model_label,
            'res_model': model_name,
            'view_mode': 'list,form',
            'target': 'current',
        })

        # Create Menu
        menu_vals = {
            'name': model_label,
            'action': f'ir.actions.act_window,{action.id}',
            'is_studio_ce': True,
        }
        if parent_menu_id:
            menu_vals['parent_id'] = parent_menu_id
        else:
            menu_vals['parent_id'] = request.env.ref('web_studio_ce.menu_studio_ce_root').id

        menu = request.env['ir.ui.menu'].create(menu_vals)

        # Refresh Odoo registry again
        request.env.registry.setup_models(request.cr)
        request.env.registry.init_models(request.cr, [model_name], request.context)

        return {
            'model_id': model.id,
            'model_name': model_name,
            'menu_id': menu.id,
            'action_id': action.id,
        }

    @http.route('/web_studio_ce/save_view_arch', type='json', auth='user')
    def save_view_arch(self, view_id, arch):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        view = request.env['ir.ui.view'].browse(view_id)
        if not view.exists():
            return {'error': 'View not found.'}

        if view.is_studio_ce:
            view.arch = arch
        else:
            # Create a child view (inherited)
            inherited = request.env['ir.ui.view'].create({
                'name': f'{view.name}_studio_ce_custom',
                'model': view.model,
                'inherit_id': view.id,
                'mode': 'extension',
                'is_studio_ce': True,
                'arch': arch,
            })
            return {'studio_view_id': inherited.id, 'arch': inherited.arch}

        return {'studio_view_id': view.id, 'arch': view.arch}

    @http.route('/web_studio_ce/get_security_matrix', type='json', auth='user')
    def get_security_matrix(self, model_name):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        model = request.env['ir.model'].search([('model', '=', model_name)], limit=1)
        if not model:
            return {'error': f'Model {model_name} not found.'}

        # Fetch all ACLs for this model
        acls = request.env['ir.model.access'].search([('model_id', '=', model.id)])
        acl_data = []
        for acl in acls:
            acl_data.append({
                'id': acl.id,
                'name': acl.name,
                'group_id': acl.group_id.id if acl.group_id else False,
                'group_name': acl.group_id.display_name if acl.group_id else 'Global/All',
                'read': acl.perm_read,
                'write': acl.perm_write,
                'create': acl.perm_create,
                'unlink': acl.perm_unlink,
            })

        # Fetch all groups for dropdown
        groups = request.env['res.groups'].search([])
        group_list = [{'id': g.id, 'name': g.display_name} for g in groups]

        return {
            'acls': acl_data,
            'groups': group_list,
        }

    @http.route('/web_studio_ce/save_security_matrix', type='json', auth='user')
    def save_security_matrix(self, model_name, acls_to_save):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        model = request.env['ir.model'].search([('model', '=', model_name)], limit=1)
        if not model:
            return {'error': f'Model {model_name} not found.'}

        for acl_vals in acls_to_save:
            acl_id = acl_vals.get('id')
            group_id = acl_vals.get('group_id')

            vals = {
                'name': acl_vals.get('name', f'access_{model_name}_{group_id or "global"}'),
                'model_id': model.id,
                'group_id': group_id,
                'perm_read': acl_vals.get('read', True),
                'perm_write': acl_vals.get('write', True),
                'perm_create': acl_vals.get('create', True),
                'perm_unlink': acl_vals.get('unlink', True),
            }

            if acl_id:
                acl = request.env['ir.model.access'].browse(acl_id)
                if acl.exists():
                    acl.write(vals)
            else:
                request.env['ir.model.access'].create(vals)

        return {'status': 'success'}

    @http.route('/web_studio_ce/get_reports', type='json', auth='user')
    def get_reports(self, model_name):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        reports = request.env['ir.actions.report'].search([('model', '=', model_name)])
        report_data = []
        for r in reports:
            # Find the QWeb view template for this report
            template_view = request.env['ir.ui.view'].search([('key', '=', r.report_name)], limit=1)
            report_data.append({
                'id': r.id,
                'name': r.name,
                'report_name': r.report_name,
                'report_type': r.report_type,
                'view_id': template_view.id if template_view else False,
                'arch': template_view.arch if template_view else False,
            })
        return {'reports': report_data}

    @http.route('/web_studio_ce/save_report_layout', type='json', auth='user')
    def save_report_layout(self, view_id, arch):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        view = request.env['ir.ui.view'].browse(view_id)
        if not view.exists():
            return {'error': 'Report template view not found.'}

        view.arch = arch
        return {'status': 'success'}

    @http.route('/web_studio_ce/get_menu_tree', type='json', auth='user')
    def get_menu_tree(self):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        menus = request.env['ir.ui.menu'].search([('parent_id', '=', False)])

        def build_tree(menu):
            return {
                'id': menu.id,
                'name': menu.name,
                'sequence': menu.sequence,
                'parent_id': menu.parent_id.id if menu.parent_id else False,
                'children': [build_tree(child) for child in menu.child_id.sorted('sequence')],
            }

        return [build_tree(m) for m in menus.sorted('sequence')]

    @http.route('/web_studio_ce/save_menu', type='json', auth='user')
    def save_menu(self, name, parent_id=None, sequence=10, action_id=None, menu_id=None):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        vals = {
            'name': name,
            'parent_id': parent_id,
            'sequence': sequence,
        }
        if action_id:
            vals['action'] = f'ir.actions.act_window,{action_id}'

        if menu_id:
            menu = request.env['ir.ui.menu'].browse(menu_id)
            if menu.exists():
                menu.write(vals)
                return {'id': menu.id}
        else:
            vals['is_studio_ce'] = True
            new_menu = request.env['ir.ui.menu'].create(vals)
            return {'id': new_menu.id}

    @http.route('/web_studio_ce/update_field_properties', type='json', auth='user')
    def update_field_properties(self, field_name, model_name, vals):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        field = request.env['ir.model.fields'].search([
            ('model', '=', model_name),
            ('name', '=', field_name)
        ], limit=1)
        if not field:
            return {'error': f'Field {field_name} not found.'}

        # Map values to ir.model.fields field names
        field_vals = {}
        if 'field_description' in vals:
            field_vals['field_description'] = vals['field_description']
        if 'required' in vals:
            field_vals['required'] = vals['required']
        if 'readonly' in vals:
            field_vals['readonly'] = vals['readonly']
        if 'relation' in vals:
            field_vals['relation'] = vals['relation']
        if 'selectionOptions' in vals:
            # Convert list of lists/tuples to string representation for selection options
            field_vals['selection'] = str(vals['selectionOptions'])

        if field_vals:
            field.write(field_vals)
            # Reload registry if critical properties changed
            if any(k in field_vals for k in ['required', 'readonly', 'relation', 'selection']):
                request.env.registry.setup_models(request.cr)
                request.env.registry.init_models(request.cr, [model_name], request.context)

        return {'status': 'success'}

    @http.route('/web_studio_ce/update_automation', type='json', auth='user')
    def update_automation(self, automation_id, vals):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        rule = request.env['base.automation'].browse(automation_id)
        if not rule.exists():
            return {'error': 'Rule not found.'}

        update_vals = {}
        if 'name' in vals:
            update_vals['name'] = vals['name']
        if 'trigger' in vals:
            update_vals['trigger'] = vals['trigger']

        rule.write(update_vals)
        return {'status': 'success'}

    @http.route('/web_studio_ce/get_models', type='json', auth='user')
    def get_models(self):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        model_records = request.env['ir.model'].search([])
        models_data = []
        for model in model_records:
            table_name = model.model.replace('.', '_')
            count = 0
            try:
                request.cr.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table_name}')")
                table_exists = request.cr.fetchone()[0]
                if table_exists:
                    request.cr.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = request.cr.fetchone()[0]
            except Exception:
                pass

            models_data.append({
                'id': model.id,
                'name': model.name,
                'model': model.model,
                'count': count,
                'is_studio_ce': model.is_studio_ce,
            })

        return models_data

    @http.route('/web_studio_ce/get_properties_schema', type='json', auth='user')
    def get_properties_schema(self, model_name, field_name):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        ModelClass = request.env.get(model_name)
        if not ModelClass:
            return {'error': f'Model {model_name} not found.'}

        field_obj = ModelClass._fields.get(field_name)
        if not field_obj or field_obj.type != 'properties':
            return {'error': f'Field {field_name} is not a properties field.'}

        definition_path = getattr(field_obj, 'definition', '')
        if not definition_path or '.' not in definition_path:
            return {'error': f'No valid definition path found for {field_name}.'}

        rel_field_name, def_field_name = definition_path.split('.')

        rel_field = ModelClass._fields.get(rel_field_name)
        if not rel_field or not rel_field.comodel_name:
            return {'error': f'Relation field {rel_field_name} not found.'}

        comodel_name = rel_field.comodel_name
        comodel = request.env[comodel_name]
        parent_record = comodel.search([], limit=1)
        if not parent_record:
            # Create a fallback record
            create_vals = {}
            if 'name' in comodel._fields:
                create_vals['name'] = 'Default Studio CE Properties Category'
            parent_record = comodel.create(create_vals)

        schema_data = parent_record[def_field_name] or []
        return {'schema': schema_data}

    @http.route('/web_studio_ce/save_properties_schema', type='json', auth='user')
    def save_properties_schema(self, model_name, field_name, schema_json):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        ModelClass = request.env.get(model_name)
        if not ModelClass:
            return {'error': f'Model {model_name} not found.'}

        field_obj = ModelClass._fields.get(field_name)
        if not field_obj or field_obj.type != 'properties':
            return {'error': f'Field {field_name} is not a properties field.'}

        definition_path = getattr(field_obj, 'definition', '')
        if not definition_path or '.' not in definition_path:
            return {'error': f'No valid definition path found for {field_name}.'}

        rel_field_name, def_field_name = definition_path.split('.')

        rel_field = ModelClass._fields.get(rel_field_name)
        comodel_name = rel_field.comodel_name
        comodel = request.env[comodel_name]
        parent_record = comodel.search([], limit=1)
        if not parent_record:
            create_vals = {}
            if 'name' in comodel._fields:
                create_vals['name'] = 'Default Studio CE Properties Category'
            parent_record = comodel.create(create_vals)

        parent_record.write({def_field_name: schema_json})
        return {'status': 'success'}

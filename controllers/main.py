# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
from lxml import etree

class StudioCeController(http.Controller):

    def _reload_registry(self, env, model_name=None):
        """Helper to flush pending database changes and reload the Odoo model registry."""
        try:
            env.flush_all()
        except AttributeError:
            if hasattr(env, 'cr') and hasattr(env.cr, 'flush'):
                env.cr.flush()
        
        registry = env.registry
        if hasattr(registry, '_setup_models__'):
            registry._setup_models__(env.cr)
        elif hasattr(registry, 'setup_models'):
            registry.setup_models(env.cr)
            
        if hasattr(registry, 'init_models') and model_name:
            registry.init_models(env.cr, [model_name], env.context)

    @http.route('/web_studio_ce/get_studio_context', type='json', auth='user')
    def get_studio_context(self, model_name, view_id=None):
        """Returns metadata about fields, views, automations, and groups for a given model."""
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied: Studio CE Administrator permissions required.'}

        try:
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
                    'compute': field.compute or '',
                    'depends': field.depends or '',
                })

            # Views
            views_data = []
            domain = [('model', '=', model_name), ('type', 'in', ['form', 'list', 'tree', 'kanban', 'search'])]
            views = request.env['ir.ui.view'].search(domain)
            # Sort base views (non-inherited) first manually
            base_views = [v for v in views if not v.inherit_id]
            inherited_views = [v for v in views if v.inherit_id]
            sorted_views = base_views + inherited_views

            for view in sorted_views:
                arch = view.arch
                if not view.inherit_id:
                    try:
                        if hasattr(view, 'get_combined_arch'):
                            arch = view.get_combined_arch()
                        else:
                            from lxml import etree
                            arch_tree = view._get_combined_arch()
                            arch = etree.tostring(arch_tree, encoding='unicode')
                    except Exception:
                        arch = view.arch
                views_data.append({
                    'id': view.id,
                    'name': view.name,
                    'type': view.type,
                    'arch': arch,
                    'is_studio_ce': view.is_studio_ce,
                })

            # Groups (for security panel)
            groups_data = []
            for group in request.env['res.groups'].search([]):
                # Odoo 19 uses privilege_id; older versions use category_id
                privilege = getattr(group, 'privilege_id', False)
                category = getattr(group, 'category_id', False)
                category_name = (privilege and privilege.name) or (category and category.name) or 'Other'
                groups_data.append({
                    'id': group.id,
                    'display_name': group.display_name,
                    'category_name': category_name,
                })

            # Automations
            automations_data = []
            for auto in request.env['base.automation'].search([('model_id', '=', model.id)]):
                action = auto.action_server_ids[0] if auto.action_server_ids else False
                automations_data.append({
                    'id': auto.id,
                    'name': auto.name,
                    'trigger': auto.trigger,
                    'trg_date_field_name': auto.trg_date_id.name or '',
                    'trg_date_range': auto.trg_date_range or 0,
                    'trg_date_range_type': auto.trg_date_range_type or 'days',
                    'filter_domain': auto.filter_domain or '[]',
                    'filter_pre_domain': auto.filter_pre_domain or '[]',
                    'is_studio_ce': auto.is_studio_ce,
                    'action_state': action.state if action else 'code',
                    'code': action.code if action else '',
                    'template_id': action.template_id.id if action and action.template_id else False,
                    'activity_type_id': action.activity_type_id.id if action and action.activity_type_id else False,
                    'activity_summary': action.activity_summary if action else '',
                    'activity_note': action.activity_note if action else '',
                    'activity_date_deadline_range': action.activity_date_deadline_range if action else 0,
                    'activity_date_deadline_range_type': action.activity_date_deadline_range_type if action else 'days',
                    'activity_user_id': action.activity_user_id.id if action and action.activity_user_id else False,
                })

            # Approvals
            approvals_data = []
            for app in request.env['studio.ce.approval'].search([('model_name', '=', model_name), ('active', '=', True)]):
                approvals_data.append({
                    'id': app.id,
                    'name': app.name,
                    'min_approvals': app.min_approvals,
                    'user_ids': app.user_ids.ids,
                    'group_ids': app.group_ids.ids,
                    'state_field_name': app.state_field_id.name or 'x_studio_approval_state',
                    'approved_value': app.approved_value,
                    'refused_value': app.refused_value,
                    'required_domain': app.required_domain,
                })

            return {
                'model_id': model.id,
                'fields': fields_data,
                'views': views_data,
                'groups': groups_data,
                'automations': automations_data,
                'approvals': approvals_data,
            }
        except Exception as e:
            import logging
            _logger = logging.getLogger(__name__)
            _logger.exception("Failed to load Studio CE context for model '%s'", model_name)
            return {'error': f'Server error loading context for {model_name}: {str(e)}'}

    @http.route('/web_studio_ce/add_field', type='json', auth='user')
    def add_field(self, model_name, field_name, field_label, field_type, relation=None, selection=None, compute=None, depends=None):
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

        # If monetary type, check if currency_id exists or create a fallback x_currency_id
        if field_type == 'monetary':
            currency_field = request.env['ir.model.fields'].search([
                ('model_id', '=', model.id),
                ('name', 'in', ['currency_id', 'x_currency_id'])
            ], limit=1)
            if not currency_field:
                request.env['ir.model.fields'].create({
                    'name': 'x_currency_id',
                    'model_id': model.id,
                    'model': model_name,
                    'field_description': 'Currency',
                    'ttype': 'many2one',
                    'relation': 'res.currency',
                    'state': 'manual',
                    'is_studio_ce': True,
                })

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
        if compute:
            vals['compute'] = compute
        if depends:
            vals['depends'] = depends

        new_field = request.env['ir.model.fields'].create(vals)

        # Log change
        request.env['studio.ce.log'].create({
            'name': f"Created custom field '{field_name}' ({field_type})",
            'model_name': model_name,
            'log_type': 'field_create',
            'field_id': new_field.id,
        })
        
        # Trigger Odoo Registry reload so the new DB column is physically created
        self._reload_registry(request.env, model_name)

        return {
            'id': new_field.id,
            'name': new_field.name,
            'field_description': new_field.field_description,
            'ttype': new_field.ttype,
            'relation': new_field.relation,
            'selection': new_field.selection,
            'compute': new_field.compute or '',
            'depends': new_field.depends or '',
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
            # If modification_xml already starts with <data>, don't double wrap
            arch_xml = modification_xml if modification_xml.strip().startswith('<data>') else f'<data>{modification_xml}</data>'
            studio_view = request.env['ir.ui.view'].create({
                'name': f'{target_view.name}_studio_ce_custom',
                'model': target_view.model,
                'inherit_id': target_view.id,
                'mode': 'extension',
                'is_studio_ce': True,
                'arch': arch_xml
            })
        else:
            # Append modifications or mutate existing view arch in-place
            try:
                parser = etree.XMLParser(remove_blank_text=True)
                root = etree.fromstring(studio_view.arch, parser=parser)
                
                # Parse the incoming modification_xml (wrapped in <data> to allow multiple tags)
                stripped_xml = modification_xml.strip()
                if stripped_xml.startswith('<data>'):
                    new_elements = etree.fromstring(stripped_xml, parser=parser)
                else:
                    wrapped_xml = f"<data>{modification_xml}</data>"
                    new_elements = etree.fromstring(wrapped_xml, parser=parser)
                
                for xpath_elem in new_elements:
                    if xpath_elem.tag != 'xpath':
                        root.append(xpath_elem)
                        continue
                    
                    expr = xpath_elem.get('expr')
                    position = xpath_elem.get('position')
                    
                    # Try to locate the target node inside our own studio view arch
                    target_node = None
                    if expr:
                        try:
                            # Evaluate xpath expr inside the root tree
                            nodes = root.xpath(expr)
                            if nodes:
                                target_node = nodes[0]
                        except Exception:
                            pass
                    
                    if target_node is not None:
                        # Mutate target_node in-place!
                        if position == 'inside':
                            for child in xpath_elem:
                                target_node.append(child)
                        elif position == 'before':
                            parent = target_node.getparent()
                            if parent is not None:
                                index = parent.index(target_node)
                                for child in reversed(xpath_elem):
                                    parent.insert(index, child)
                        elif position == 'after':
                            parent = target_node.getparent()
                            if parent is not None:
                                index = parent.index(target_node) + 1
                                for child in reversed(xpath_elem):
                                    parent.insert(index, child)
                        elif position == 'replace':
                            parent = target_node.getparent()
                            if parent is not None:
                                index = parent.index(target_node)
                                for child in reversed(xpath_elem):
                                    parent.insert(index, child)
                                parent.remove(target_node)
                        elif position == 'attributes':
                            for child in xpath_elem:
                                if child.tag == 'attribute':
                                    name = child.get('name')
                                    val = child.text or ''
                                    target_node.set(name, val)
                    else:
                        # Fallback: target node is in base view, so append as new xpath tag
                        root.append(xpath_elem)
                
                studio_view.arch = etree.tostring(root, encoding='utf-8', pretty_print=True).decode('utf-8')
            except Exception as e:
                import logging
                logging.getLogger(__name__).exception("Failed to merge studio arch modification")
                return {'error': f'XML Parsing Error: {str(e)}'}

        # Log change
        request.env['studio.ce.log'].create({
            'name': f"Modified layout for view '{target_view.name}'",
            'model_name': target_view.model,
            'view_id': target_view.id,
            'log_type': 'view_modify',
            'xpath_expr': xpath_expr,
            'modification_xml': modification_xml,
        })

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
        
        # Link a server action
        request.env['ir.actions.server'].create({
            'name': f"{name} - Action",
            'model_id': model.id,
            'state': action_type,
            'code': code,
            'base_automation_id': new_auto.id,
            'usage': 'base_automation',
        })
        
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
        self._reload_registry(request.env, model_name)

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
            'type': 'list',
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
        self._reload_registry(request.env, model_name)

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
        if 'compute' in vals:
            field_vals['compute'] = vals['compute']
        if 'depends' in vals:
            field_vals['depends'] = vals['depends']

        if field_vals:
            field.write(field_vals)
            if any(k in field_vals for k in ['required', 'readonly', 'relation', 'selection', 'compute', 'depends']):
                self._reload_registry(request.env, model_name)

        return {'status': 'success'}

    @http.route('/web_studio_ce/update_automation', type='json', auth='user')
    def update_automation(self, automation_id, vals):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        rule = request.env['base.automation'].browse(automation_id)
        if not rule.exists():
            return {'error': 'Rule not found.'}

        # Update automation rule properties
        auto_vals = {}
        if 'name' in vals:
            auto_vals['name'] = vals['name']
        if 'trigger' in vals:
            auto_vals['trigger'] = vals['trigger']
        if 'trg_date_field_name' in vals:
            field = request.env['ir.model.fields'].search([
                ('model_id', '=', rule.model_id.id),
                ('name', '=', vals['trg_date_field_name'])
            ], limit=1)
            auto_vals['trg_date_id'] = field.id if field else False
        if 'trg_date_range' in vals:
            auto_vals['trg_date_range'] = int(vals['trg_date_range'])
        if 'trg_date_range_type' in vals:
            auto_vals['trg_date_range_type'] = vals['trg_date_range_type']
        if 'filter_domain' in vals:
            auto_vals['filter_domain'] = vals['filter_domain']
        if 'filter_pre_domain' in vals:
            auto_vals['filter_pre_domain'] = vals['filter_pre_domain']

        if auto_vals:
            rule.write(auto_vals)

        # Update linked server action properties
        action_vals = {}
        if 'action_state' in vals:
            action_vals['state'] = vals['action_state']
        if 'code' in vals:
            action_vals['code'] = vals['code']
        if 'template_id' in vals:
            action_vals['template_id'] = vals['template_id']
        if 'activity_type_id' in vals:
            action_vals['activity_type_id'] = vals['activity_type_id']
        if 'activity_summary' in vals:
            action_vals['activity_summary'] = vals['activity_summary']
        if 'activity_note' in vals:
            action_vals['activity_note'] = vals['activity_note']
        if 'activity_date_deadline_range' in vals:
            action_vals['activity_date_deadline_range'] = int(vals['activity_date_deadline_range'])
        if 'activity_date_deadline_range_type' in vals:
            action_vals['activity_date_deadline_range_type'] = vals['activity_date_deadline_range_type']
        if 'activity_user_id' in vals:
            action_vals['activity_user_id'] = vals['activity_user_id']
        if 'name' in vals:
            action_vals['name'] = f"{vals['name']} - Action"

        if action_vals:
            action = rule.action_server_ids[0] if rule.action_server_ids else False
            if action:
                action.write(action_vals)
            else:
                action_vals['base_automation_id'] = rule.id
                action_vals['model_id'] = rule.model_id.id
                action_vals['usage'] = 'base_automation'
                request.env['ir.actions.server'].create(action_vals)

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

    @http.route('/web_studio_ce/insert_field_into_view', type='json', auth='user')
    def insert_field_into_view(self, view_id, field_name, target_field_name=None, position='after', group_name=None, page_name=None):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        target_view = request.env['ir.ui.view'].browse(view_id)
        if not target_view.exists():
            return {'error': 'Target view not found.'}

        model_name = target_view.model
        if field_name.startswith('x_studio_') and field_name not in request.env[model_name]._fields:
            self._reload_registry(request.env, model_name)

        # Check if the field already exists in the compiled layout
        field_exists = False
        try:
            if hasattr(target_view, 'get_combined_arch'):
                combined_arch = target_view.get_combined_arch()
            else:
                arch_tree = target_view._get_combined_arch()
                combined_arch = etree.tostring(arch_tree, encoding='unicode')
            
            combined_tree = etree.fromstring(combined_arch)
            # Find any occurrence of the field name
            field_nodes = combined_tree.xpath(f"//field[@name='{field_name}']")
            if field_nodes:
                field_exists = True
        except Exception:
            # Fallback to checking the studio view arch if combined arch check fails
            studio_view = request.env['ir.ui.view'].search([
                ('inherit_id', '=', target_view.id),
                ('is_studio_ce', '=', True)
            ], limit=1)
            if studio_view and f'name="{field_name}"' in (studio_view.arch or ''):
                field_exists = True

        modification_xml = ""
        if field_exists:
            # Prepend a replacement/removal xpath to remove the field from its previous position
            modification_xml += f'<xpath expr="//field[@name=\'{field_name}\']" position="replace"/>\n'

        # Build modification XML
        field_xml = f'<field name="{field_name}"/>'
        if group_name:
            field_xml = f'<group string="{group_name}">{field_xml}</group>'
        if page_name:
            field_xml = f'<page string="{page_name}">{field_xml}</page>'

        if target_field_name:
            if target_field_name.startswith('//'):
                xpath_expr = target_field_name
            else:
                xpath_expr = f"//field[@name='{target_field_name}']"
        else:
            xpath_expr = "//sheet"
            position = "inside"

        modification_xml += f'<xpath expr="{xpath_expr}" position="{position}">{field_xml}</xpath>'

        res = self.edit_view(view_id=view_id, xpath_expr=xpath_expr, modification_xml=modification_xml)
        if 'error' not in res:
            latest_log = request.env['studio.ce.log'].search([
                ('view_id', '=', target_view.id),
                ('log_type', '=', 'view_modify')
            ], limit=1, order='id desc')
            if latest_log:
                if field_exists:
                    latest_log.name = f"Relocated field '{field_name}' {position} '{target_field_name or 'sheet'}'"
                else:
                    latest_log.name = f"Inserted field '{field_name}' {position} '{target_field_name or 'sheet'}'"
        return res

    @http.route('/web_studio_ce/toggle_field_visibility', type='json', auth='user')
    def toggle_field_visibility(self, view_id, field_name, invisible):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        target_view = request.env['ir.ui.view'].browse(view_id)
        if not target_view.exists():
            return {'error': 'Target view not found.'}

        xpath_expr = f"//field[@name='{field_name}']"
        val = "1" if invisible else "0"
        modification_xml = f'<xpath expr="{xpath_expr}" position="attributes"><attribute name="invisible">{val}</attribute></xpath>'

        res = self.edit_view(view_id=view_id, xpath_expr=xpath_expr, modification_xml=modification_xml)
        if 'error' not in res:
            latest_log = request.env['studio.ce.log'].search([
                ('view_id', '=', target_view.id),
                ('log_type', '=', 'view_modify')
            ], limit=1, order='id desc')
            if latest_log:
                state_str = "Hidden" if invisible else "Shown"
                latest_log.name = f"Toggled field '{field_name}' visibility to {state_str}"
                latest_log.log_type = 'property_override'
        return res

    @http.route('/web_studio_ce/override_view_field_property', type='json', auth='user')
    def override_view_field_property(self, view_id, field_name, prop_name, prop_value):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        target_view = request.env['ir.ui.view'].browse(view_id)
        if not target_view.exists():
            return {'error': 'Target view not found.'}

        attr_map = {
            'label': 'string',
            'required': 'required',
            'readonly': 'readonly',
            'widget': 'widget',
            'placeholder': 'placeholder',
        }
        xml_attr = attr_map.get(prop_name, prop_name)

        if field_name.startswith('//'):
            xpath_expr = field_name
        else:
            xpath_expr = f"//field[@name='{field_name}']"

        modification_xml = f'<xpath expr="{xpath_expr}" position="attributes"><attribute name="{xml_attr}">{prop_value}</attribute></xpath>'

        res = self.edit_view(view_id=view_id, xpath_expr=xpath_expr, modification_xml=modification_xml)
        if 'error' not in res:
            latest_log = request.env['studio.ce.log'].search([
                ('view_id', '=', target_view.id),
                ('log_type', '=', 'view_modify')
            ], limit=1, order='id desc')
            if latest_log:
                latest_log.name = f"Overrode property '{prop_name}' on '{field_name}' to '{prop_value}'"
                latest_log.log_type = 'property_override'
        return res

    @http.route('/web_studio_ce/move_node_in_view', type='json', auth='user')
    def move_node_in_view(self, view_id, source_xpath, target_xpath, position, node_xml):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        target_view = request.env['ir.ui.view'].browse(view_id)
        if not target_view.exists():
            return {'error': 'Target view not found.'}

        if not source_xpath and not target_xpath:
            modification_xml = node_xml
        else:
            # 1. Remove node from original position
            modification_xml = f'<xpath expr="{source_xpath}" position="replace"/>\n'
            # 2. Insert node at the new position
            modification_xml += f'<xpath expr="{target_xpath}" position="{position}">{node_xml}</xpath>'

        res = self.edit_view(view_id=view_id, xpath_expr=target_xpath or "//sheet", modification_xml=modification_xml)
        if 'error' not in res:
            latest_log = request.env['studio.ce.log'].search([
                ('view_id', '=', target_view.id),
                ('log_type', '=', 'view_modify')
            ], limit=1, order='id desc')
            if latest_log:
                latest_log.name = f"Moved layout element"
        return res

    @http.route('/web_studio_ce/delete_node_in_view', type='json', auth='user')
    def delete_node_in_view(self, view_id, xpath_expr):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        target_view = request.env['ir.ui.view'].browse(view_id)
        if not target_view.exists():
            return {'error': 'Target view not found.'}

        modification_xml = f'<xpath expr="{xpath_expr}" position="replace"/>'
        res = self.edit_view(view_id=view_id, xpath_expr=xpath_expr, modification_xml=modification_xml)
        if 'error' not in res:
            latest_log = request.env['studio.ce.log'].search([
                ('view_id', '=', target_view.id),
                ('log_type', '=', 'view_modify')
            ], limit=1, order='id desc')
            if latest_log:
                latest_log.name = f"Deleted layout element"
        return res

    @http.route('/web_studio_ce/get_customisation_logs', type='json', auth='user')
    def get_customisation_logs(self, model_name):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        logs = request.env['studio.ce.log'].search([
            ('model_name', '=', model_name),
            ('active', '=', True)
        ])
        log_data = []
        for log in logs:
            log_data.append({
                'id': log.id,
                'name': log.name,
                'create_date': log.create_date.strftime('%Y-%m-%d %H:%M:%S') if log.create_date else '',
                'log_type': log.log_type,
            })
        return log_data

    @http.route('/web_studio_ce/revert_customisation', type='json', auth='user')
    def revert_customisation(self, log_id):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        log = request.env['studio.ce.log'].browse(log_id)
        if not log.exists():
            return {'error': 'Log record not found.'}

        try:
            log.action_revert()
            return {'status': 'success'}
        except Exception as e:
            return {'error': f'Revert failed: {str(e)}'}

    @http.route('/web_studio_ce/get_approvals', type='json', auth='user')
    def get_approvals(self, model_name):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        approvals = request.env['studio.ce.approval'].search([
            ('model_name', '=', model_name),
            ('active', '=', True)
        ])
        approvals_data = []
        for app in approvals:
            approvals_data.append({
                'id': app.id,
                'name': app.name,
                'min_approvals': app.min_approvals,
                'user_ids': app.user_ids.ids,
                'group_ids': app.group_ids.ids,
                'state_field_name': app.state_field_id.name or 'x_studio_approval_state',
                'approved_value': app.approved_value,
                'refused_value': app.refused_value,
                'required_domain': app.required_domain,
            })
        return {'approvals': approvals_data}

    @http.route('/web_studio_ce/save_approval', type='json', auth='user')
    def save_approval(self, model_name, name, min_approvals=1, user_ids=None, group_ids=None, state_field_name='x_studio_approval_state', approved_value='approved', refused_value='refused', required_domain='[]', approval_id=None):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        model = request.env['ir.model'].search([('model', '=', model_name)], limit=1)
        if not model:
            return {'error': f'Model {model_name} not found.'}

        # Find or create state field
        field_name = state_field_name or 'x_studio_approval_state'
        field = request.env['ir.model.fields'].search([
            ('model_id', '=', model.id),
            ('name', '=', field_name)
        ], limit=1)
        if not field:
            field = request.env['ir.model.fields'].create({
                'name': field_name,
                'model_id': model.id,
                'model': model_name,
                'field_description': 'Approval State',
                'ttype': 'selection',
                'selection': str([('draft', 'Draft'), ('to_approve', 'To Approve'), ('approved', 'Approved'), ('refused', 'Refused')]),
                'state': 'manual',
                'is_studio_ce': True,
            })
            # Setup & init registry
            self._reload_registry(request.env, model_name)

        vals = {
            'name': name,
            'model_id': model.id,
            'min_approvals': int(min_approvals),
            'state_field_id': field.id,
            'approved_value': approved_value,
            'refused_value': refused_value,
            'required_domain': required_domain,
            'user_ids': [(6, 0, user_ids or [])],
            'group_ids': [(6, 0, group_ids or [])],
        }

        if approval_id:
            approval = request.env['studio.ce.approval'].browse(approval_id)
            if approval.exists():
                approval.write(vals)
        else:
            approval = request.env['studio.ce.approval'].create(vals)

        # Inject buttons into the primary form view of the model
        form_view = request.env['ir.ui.view'].search([
            ('model', '=', model_name),
            ('type', '=', 'form'),
            ('inherit_id', '=', False)
        ], limit=1)
        if form_view:
            # Check if header is already in the compiled arch
            arch_str = form_view._get_combined_arch()
            has_header = '<header>' in arch_str or '<header ' in arch_str

            buttons_xml = f"""
                <button name="action_studio_approve" string="Approve" type="object" class="btn-primary" invisible="{field_name} != 'to_approve'"/>
                <button name="action_studio_reject" string="Reject" type="object" class="btn-secondary" invisible="{field_name} != 'to_approve'"/>
                <field name="{field_name}" widget="statusbar" statusbar_visible="draft,to_approve,approved,refused"/>
            """

            if has_header:
                modification_xml = f'<xpath expr="//header" position="inside">{buttons_xml}</xpath>'
            else:
                modification_xml = f'<xpath expr="//sheet" position="before"><header>{buttons_xml}</header></xpath>'

            self.edit_view(view_id=form_view.id, xpath_expr="//form", modification_xml=modification_xml)

        return {'id': approval.id, 'name': approval.name}

    @http.route('/web_studio_ce/delete_approval', type='json', auth='user')
    def delete_approval(self, approval_id):
        if not request.env.user.has_group('web_studio_ce.group_studio_ce'):
            return {'error': 'Access Denied.'}

        approval = request.env['studio.ce.approval'].browse(approval_id)
        if approval.exists():
            approval.active = False
            return {'status': 'success'}
        return {'error': 'Approval not found.'}


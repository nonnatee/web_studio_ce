# -*- coding: utf-8 -*-
from odoo import models, fields, api
from lxml import etree

class StudioCeLog(models.Model):
    _name = 'studio.ce.log'
    _description = 'Studio CE Customisation Log'
    _order = 'create_date desc'

    name = fields.Char(string='Description', required=True)
    model_name = fields.Char(string='Target Model', required=True)
    view_id = fields.Many2one('ir.ui.view', string='Modified View')
    log_type = fields.Selection([
        ('field_create', 'Field Created'),
        ('view_modify', 'View XML Modified'),
        ('property_override', 'Field Property Override'),
    ], string='Change Type', default='view_modify')
    
    # Store exact details for reverting
    field_id = fields.Many2one('ir.model.fields', string='Dynamic Field')
    xpath_expr = fields.Char(string='XPath Expression')
    modification_xml = fields.Text(string='XML Modifications')
    active = fields.Boolean(default=True)

    def action_revert(self):
        self.ensure_one()
        if not self.active:
            return
            
        if self.log_type == 'field_create' and self.field_id:
            # Delete custom field
            field_name = self.field_id.name
            model_name = self.field_id.model
            
            # Find and clean all inherited views containing this field
            inherited_views = self.env['ir.ui.view'].search([
                ('model', '=', model_name),
                ('is_studio_ce', '=', True)
            ])
            for view in inherited_views:
                try:
                    parser = etree.XMLParser(remove_blank_text=True)
                    root = etree.fromstring(view.arch, parser=parser)
                    # Find all elements matching the field
                    nodes = root.xpath(f"//field[@name='{field_name}']")
                    for node in nodes:
                        parent = node.getparent()
                        if parent is not None:
                            parent.remove(node)
                    view.arch = etree.tostring(root, encoding='utf-8', pretty_print=True).decode('utf-8')
                except Exception:
                    pass
            
            self.field_id.unlink()
            # Trigger registry reload
            self.env.flush_all()
            if hasattr(self.env.registry, '_setup_models__'):
                self.env.registry._setup_models__(self._cr)
            elif hasattr(self.env.registry, 'setup_models'):
                self.env.registry.setup_models(self._cr)
            if hasattr(self.env.registry, 'init_models'):
                self.env.registry.init_models(self._cr, [model_name], self._context)
            
        elif self.log_type in ['view_modify', 'property_override'] and self.view_id and self.xpath_expr:
            # Surgically remove this specific xpath modification from the inherited studio view
            studio_view = self.env['ir.ui.view'].search([
                ('inherit_id', '=', self.view_id.id),
                ('is_studio_ce', '=', True)
            ], limit=1)
            if studio_view:
                try:
                    parser = etree.XMLParser(remove_blank_text=True)
                    root = etree.fromstring(studio_view.arch, parser=parser)
                    # Find the specific xpath elements in the studio view
                    xpath_elements = root.xpath(f"//xpath[@expr=\"{self.xpath_expr}\"]")
                    for elem in xpath_elements:
                        root.remove(elem)
                    
                    if len(root) == 0:
                        studio_view.unlink()
                    else:
                        studio_view.arch = etree.tostring(root, encoding='utf-8', pretty_print=True).decode('utf-8')
                except Exception:
                    pass

        self.active = False

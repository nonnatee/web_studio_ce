# -*- coding: utf-8 -*-
from odoo.tests.common import TransactionCase

class TestStudioCeFlow(TransactionCase):

    def setUp(self):
        super(TestStudioCeFlow, self).setUp()
        self.partner_model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)

    def test_01_dynamic_field_creation(self):
        """Test that dynamic field creation works and sets correct flags."""
        field_name = 'x_studio_test_field'
        field_label = 'Test Field Label'
        
        # Create field
        new_field = self.env['ir.model.fields'].create({
            'name': field_name,
            'model_id': self.partner_model.id,
            'model': 'res.partner',
            'field_description': field_label,
            'ttype': 'char',
            'state': 'manual',
            'is_studio_ce': True,
        })
        
        self.assertTrue(new_field.exists())
        self.assertEqual(new_field.name, 'x_studio_test_field')
        self.assertTrue(new_field.is_studio_ce)

    def test_02_dynamic_view_inheritance(self):
        """Test that custom inherited view creates successfully."""
        base_view = self.env['ir.ui.view'].search([
            ('model', '=', 'res.partner'),
            ('type', '=', 'form')
        ], limit=1)
        
        self.assertTrue(base_view.exists())
        
        studio_view = self.env['ir.ui.view'].create({
            'name': 'res.partner.studio.ce.custom',
            'model': 'res.partner',
            'inherit_id': base_view.id,
            'mode': 'extension',
            'is_studio_ce': True,
            'arch': '<data><xpath expr="//sheet" position="inside"><field name="name"/></xpath></data>'
        })
        
        self.assertTrue(studio_view.exists())
        self.assertTrue(studio_view.is_studio_ce)
        self.assertEqual(studio_view.inherit_id.id, base_view.id)

    def test_03_zip_export_engine(self):
        """Test that customization export compiles into base64 zip data."""
        # Setup one customized field and view
        self.env['ir.model.fields'].create({
            'name': 'x_studio_export_field',
            'model_id': self.partner_model.id,
            'model': 'res.partner',
            'field_description': 'Export Field',
            'ttype': 'char',
            'state': 'manual',
            'is_studio_ce': True,
        })
        
        export_wizard = self.env['studio.ce.export'].create({
            'name': 'test_customizations.zip'
        })
        
        action = export_wizard.action_export_zip()
        self.assertTrue(export_wizard.zip_file)
        self.assertIn('url', action)
        self.assertIn('studio.ce.export', action['url'])


class TestStudioCeProductFlow(TransactionCase):

    def setUp(self):
        super(TestStudioCeProductFlow, self).setUp()
        self.product_model = self.env['ir.model'].search([('model', '=', 'product.template')], limit=1)

    def test_01_product_dynamic_field_creation(self):
        """Test that dynamic field creation on product.template works."""
        field_name = 'x_studio_test_product_field'
        field_label = 'Test Product Field Label'
        
        # Create field
        new_field = self.env['ir.model.fields'].create({
            'name': field_name,
            'model_id': self.product_model.id,
            'model': 'product.template',
            'field_description': field_label,
            'ttype': 'char',
            'state': 'manual',
            'is_studio_ce': True,
        })
        
        self.assertTrue(new_field.exists())
        self.assertEqual(new_field.name, 'x_studio_test_product_field')
        self.assertTrue(new_field.is_studio_ce)

    def test_02_product_dynamic_view_inheritance(self):
        """Test that custom inherited view creates successfully on product.template."""
        base_view = self.env['ir.ui.view'].search([
            ('model', '=', 'product.template'),
            ('type', '=', 'form')
        ], limit=1)
        
        self.assertTrue(base_view.exists())
        
        studio_view = self.env['ir.ui.view'].create({
            'name': 'product.template.studio.ce.custom',
            'model': 'product.template',
            'inherit_id': base_view.id,
            'mode': 'extension',
            'is_studio_ce': True,
            'arch': '<data><xpath expr="//sheet" position="inside"><field name="name"/></xpath></data>'
        })
        
        self.assertTrue(studio_view.exists())
        self.assertTrue(studio_view.is_studio_ce)
        self.assertEqual(studio_view.inherit_id.id, base_view.id)


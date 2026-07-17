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

    def test_04_computed_field_creation(self):
        """Test computed field creation and evaluation."""
        field_name = 'x_studio_computed_test'
        new_field = self.env['ir.model.fields'].create({
            'name': field_name,
            'model_id': self.partner_model.id,
            'model': 'res.partner',
            'field_description': 'Computed Field',
            'ttype': 'char',
            'state': 'manual',
            'is_studio_ce': True,
            'compute': "for r in self: r['x_studio_computed_test'] = 'Calculated'",
            'depends': 'name',
        })
        self.assertTrue(new_field.exists())
        self.assertEqual(new_field.compute, "for r in self: r['x_studio_computed_test'] = 'Calculated'")
        self.assertEqual(new_field.depends, 'name')

    def test_05_rich_automation_rules(self):
        """Test rich automation rules configuration and linked server actions."""
        # Create automation with delay and code action
        auto = self.env['base.automation'].create({
            'name': 'Delayed Automation',
            'model_id': self.partner_model.id,
            'trigger': 'on_time',
            'trg_date_range': 2,
            'trg_date_range_type': 'days',
            'is_studio_ce': True,
        })
        self.assertTrue(auto.exists())
        self.assertEqual(auto.trigger, 'on_time')
        self.assertEqual(auto.trg_date_range, 2)
        
        # Link server action
        action = self.env['ir.actions.server'].create({
            'name': 'Delayed Action',
            'model_id': self.partner_model.id,
            'state': 'code',
            'code': 'pass',
            'base_automation_id': auto.id,
            'usage': 'base_automation',
        })
        self.assertTrue(action.exists())
        self.assertEqual(action.base_automation_id.id, auto.id)

    def test_06_approval_workflows(self):
        """Test button-level multi-step approvals configuration and execution interception."""
        approval = self.env['studio.ce.approval'].create({
            'name': 'Partner Write Button Approval',
            'model_id': self.partner_model.id,
            'button_name': 'write',
            'required_domain': '[]',
        })
        self.assertTrue(approval.exists())
        self.assertEqual(approval.button_name, 'write')

        step1 = self.env['studio.ce.approval.rule'].create({
            'approval_id': approval.id,
            'name': 'Manager Approval',
            'sequence': 10,
            'user_ids': [(6, 0, [self.env.user.id])],
        })
        step2 = self.env['studio.ce.approval.rule'].create({
            'approval_id': approval.id,
            'name': 'Director Approval',
            'sequence': 20,
            'exclusive': True,
        })
        self.assertTrue(step1.exists())
        self.assertTrue(step2.exists())

        partner = self.env['res.partner'].create({'name': 'Test Partner'})

        from odoo.exceptions import UserError
        
        # Calling write should raise UserError because second step is pending
        with self.assertRaises(UserError):
            partner.write({'name': 'New Partner Name'})
        
        # Verify first step was logged/approved automatically
        log1 = self.env['studio.ce.approval.log'].search([
            ('rule_id', '=', step1.id),
            ('res_id', '=', partner.id)
        ])
        self.assertTrue(log1.exists())

    def test_07_record_rules(self):
        """Test record rules creation and flags."""
        rule = self.env['ir.rule'].create({
            'name': 'Custom Security Rule',
            'model_id': self.partner_model.id,
            'domain_force': "[('create_uid', '=', user.id)]",
            'is_studio_ce': True,
        })
        self.assertTrue(rule.exists())
        self.assertTrue(rule.is_studio_ce)


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


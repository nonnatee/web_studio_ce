# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import UserError

class StudioCeApproval(models.Model):
    _name = 'studio.ce.approval'
    _description = 'Studio CE Approval Configuration'
    _order = 'name, id'

    name = fields.Char(string='Workflow Name', required=True)
    model_id = fields.Many2one('ir.model', string='Model', required=True, ondelete='cascade')
    model_name = fields.Char(related='model_id.model', string='Model Name', store=True, readonly=True)
    min_approvals = fields.Integer(string='Min Approvals Required', default=1)
    user_ids = fields.Many2many('res.users', 'studio_ce_approval_users_rel', 'approval_id', 'user_id', string='Allowed Approvers')
    group_ids = fields.Many2many('res.groups', 'studio_ce_approval_groups_rel', 'approval_id', 'group_id', string='Allowed Groups')
    state_field_id = fields.Many2one('ir.model.fields', string='State Field')
    approved_value = fields.Char(string='Approved State Value', default='approved')
    refused_value = fields.Char(string='Refused State Value', default='refused')
    required_domain = fields.Char(string='Condition Domain', default='[]')
    active = fields.Boolean(default=True)
    rule_ids = fields.One2many('studio.ce.approval.rule', 'approval_id', string='Rules')

class StudioCeApprovalRule(models.Model):
    _name = 'studio.ce.approval.rule'
    _description = 'Studio CE Approval Rule'
    _order = 'sequence, id'

    approval_id = fields.Many2one('studio.ce.approval', string='Approval', required=True, ondelete='cascade')
    name = fields.Char(string='Rule Name', required=True)
    sequence = fields.Integer(default=10)
    domain = fields.Char(string='Condition Domain', default='[]')
    user_ids = fields.Many2many('res.users', 'studio_ce_approval_rule_users_rel', 'rule_id', 'user_id', string='Approvers')
    group_ids = fields.Many2many('res.groups', 'studio_ce_approval_rule_groups_rel', 'rule_id', 'group_id', string='Groups')
    min_approvals = fields.Integer(string='Min Approvals', default=1)

class StudioCeApprovalLog(models.Model):
    _name = 'studio.ce.approval.log'
    _description = 'Studio CE Approval Log'
    _order = 'date desc, id desc'

    approval_id = fields.Many2one('studio.ce.approval', string='Approval', required=True, ondelete='cascade')
    res_id = fields.Integer(string='Record ID', required=True)
    user_id = fields.Many2one('res.users', string='User', required=True, default=lambda self: self.env.user)
    date = fields.Datetime(string='Date', required=True, default=fields.Datetime.now)
    note = fields.Text(string='Note')
    action_type = fields.Selection([('approve', 'Approve'), ('reject', 'Reject')], string='Action Type', required=True)

class BaseModel(models.AbstractModel):
    _inherit = 'base'

    def action_studio_approve(self):
        self.ensure_one()
        approval = self.env['studio.ce.approval'].search([
            ('model_name', '=', self._name),
            ('active', '=', True)
        ], limit=1)
        if not approval:
            raise UserError(_("No approval configuration found for this model."))

        is_authorized = False
        if not approval.user_ids and not approval.group_ids:
            is_authorized = True
        else:
            if self.env.user in approval.user_ids:
                is_authorized = True
            elif any(g in self.env.user.groups_id for g in approval.group_ids):
                is_authorized = True

        if not is_authorized:
            raise UserError(_("You are not authorized to approve this record."))

        state_field = approval.state_field_id.name or 'x_studio_approval_state'
        if state_field in self._fields:
            self.write({state_field: approval.approved_value})

        self.env['studio.ce.approval.log'].create({
            'approval_id': approval.id,
            'res_id': self.id,
            'user_id': self.env.user.id,
            'date': fields.Datetime.now(),
            'action_type': 'approve',
        })
        if hasattr(self, 'message_post'):
            self.message_post(body=_("Document approved by %s") % self.env.user.name)
        return True

    def action_studio_reject(self):
        self.ensure_one()
        approval = self.env['studio.ce.approval'].search([
            ('model_name', '=', self._name),
            ('active', '=', True)
        ], limit=1)
        if not approval:
            raise UserError(_("No approval configuration found for this model."))

        is_authorized = False
        if not approval.user_ids and not approval.group_ids:
            is_authorized = True
        else:
            if self.env.user in approval.user_ids:
                is_authorized = True
            elif any(g in self.env.user.groups_id for g in approval.group_ids):
                is_authorized = True

        if not is_authorized:
            raise UserError(_("You are not authorized to reject this record."))

        state_field = approval.state_field_id.name or 'x_studio_approval_state'
        if state_field in self._fields:
            self.write({state_field: approval.refused_value})

        self.env['studio.ce.approval.log'].create({
            'approval_id': approval.id,
            'res_id': self.id,
            'user_id': self.env.user.id,
            'date': fields.Datetime.now(),
            'action_type': 'reject',
        })
        if hasattr(self, 'message_post'):
            self.message_post(body=_("Document rejected by %s") % self.env.user.name)
        return True

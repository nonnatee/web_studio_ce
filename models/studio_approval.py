# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import UserError
from odoo.tools.safe_eval import safe_eval

class StudioCeApproval(models.Model):
    _name = 'studio.ce.approval'
    _description = 'Studio CE Approval Configuration'
    _order = 'model_name, button_name, id'

    name = fields.Char(string='Workflow Name', required=True)
    model_id = fields.Many2one('ir.model', string='Model', required=True, ondelete='cascade')
    model_name = fields.Char(related='model_id.model', string='Model Name', store=True, readonly=True)
    button_name = fields.Char(string='Button Method Name', required=True)
    required_domain = fields.Char(string='Condition Domain', default='[]')
    active = fields.Boolean(default=True, string='Active')
    rule_ids = fields.One2many('studio.ce.approval.rule', 'approval_id', string='Approval Steps', copy=True)

class StudioCeApprovalRule(models.Model):
    _name = 'studio.ce.approval.rule'
    _description = 'Studio CE Approval Step'
    _order = 'sequence, id'

    approval_id = fields.Many2one('studio.ce.approval', string='Approval Configuration', required=True, ondelete='cascade')
    name = fields.Char(string='Step Name', required=True, default='New Approval Step')
    sequence = fields.Integer(string='Approval Order', default=10)
    user_ids = fields.Many2many('res.users', 'studio_ce_approval_rule_users_rel', 'rule_id', 'user_id', string='Approvers')
    group_ids = fields.Many2many('res.groups', 'studio_ce_approval_rule_groups_rel', 'rule_id', 'group_id', string='Approver Group')
    exclusive = fields.Boolean(string='Exclusive Approval', default=False, help="If checked, a user who approved a previous step cannot approve this step.")
    notify_user_ids = fields.Many2many('res.users', 'studio_ce_approval_rule_notify_users_rel', 'rule_id', 'user_id', string='Users to Notify')

class StudioCeApprovalLog(models.Model):
    _name = 'studio.ce.approval.log'
    _description = 'Studio CE Approval Log'
    _order = 'date desc, id desc'

    rule_id = fields.Many2one('studio.ce.approval.rule', string='Approved Step', required=True, ondelete='cascade')
    approval_id = fields.Many2one('studio.ce.approval', related='rule_id.approval_id', string='Approval Configuration', store=True, readonly=True)
    res_id = fields.Integer(string='Record ID', required=True)
    user_id = fields.Many2one('res.users', string='User', required=True, default=lambda self: self.env.user)
    date = fields.Datetime(string='Date', required=True, default=fields.Datetime.now)
    action_type = fields.Selection([('approve', 'Approve'), ('reject', 'Reject')], string='Action Type', default='approve', required=True)
    note = fields.Text(string='Note')

class StudioCeApprovalDelegate(models.Model):
    _name = 'studio.ce.approval.delegate'
    _description = 'Studio CE Approval Delegation'
    _order = 'id desc'

    approver_id = fields.Many2one('res.users', string='Original Approver', required=True, default=lambda self: self.env.user)
    delegate_ids = fields.Many2many('res.users', 'studio_ce_approval_delegate_users_rel', 'delegate_id', 'user_id', string='Delegated Approvers', required=True)
    date_to = fields.Date(string='Until Date', help="Leave empty for indefinite delegation")
    active = fields.Boolean(default=True)

class BaseModel(models.AbstractModel):
    _inherit = 'base'

    def _check_studio_approval_status(self, method):
        """Intercepts and validates if this method call is blocked by Studio CE Approval Rules."""
        self.ensure_one()
        
        # 1. Look for active approvals for this model and method
        approvals = self.env['studio.ce.approval'].search([
            ('model_name', '=', self._name),
            ('button_name', '=', method),
            ('active', '=', True)
        ])
        if not approvals:
            return True

        for approval in approvals:
            # 2. Check if the record matches the required condition domain
            if approval.required_domain and approval.required_domain != '[]':
                try:
                    domain = safe_eval(approval.required_domain, {'self': self})
                    # Filter self to see if it matches domain
                    if not self.filtered_domain(domain):
                        continue
                except Exception:
                    # If domain fails to evaluate, assume it doesn't match or log it
                    continue

            # 3. Evaluate each approval step in order of sequence
            steps = approval.rule_ids
            approved_users_in_log = []
            
            for step in steps:
                # Find log for this specific step and record
                log = self.env['studio.ce.approval.log'].search([
                    ('rule_id', '=', step.id),
                    ('res_id', '=', self.id),
                    ('action_type', '=', 'approve')
                ], limit=1)
                
                if log:
                    approved_users_in_log.append(log.user_id.id)
                    continue  # This step is already approved, move to next step
                
                # Step is pending! Check if the current user has rights to approve
                current_user = self.env.user
                
                # Check for delegation
                delegated_users = self.env['studio.ce.approval.delegate'].search([
                    ('approver_id', 'in', step.user_ids.ids),
                    ('active', '=', True)
                ])
                valid_delegates = []
                for d in delegated_users:
                    if not d.date_to or d.date_to >= fields.Date.today():
                        valid_delegates.extend(d.delegate_ids.ids)
                
                allowed_users = step.user_ids.ids + valid_delegates
                
                is_user_authorized = False
                if not step.user_ids and not step.group_ids:
                    is_user_authorized = True
                else:
                    if current_user.id in allowed_users:
                        is_user_authorized = True
                    elif any(g in current_user.groups_id for g in step.group_ids):
                        is_user_authorized = True
                
                if is_user_authorized:
                    # Check exclusive approval constraint
                    if step.exclusive and current_user.id in approved_users_in_log:
                        raise UserError(_("Exclusive Approval: You have already approved a previous step for this record. Another authorized user must approve step '%s'.") % step.name)
                    
                    # Auto-approve this step for the current user clicking the button
                    self.env['studio.ce.approval.log'].create({
                        'rule_id': step.id,
                        'res_id': self.id,
                        'user_id': current_user.id,
                        'action_type': 'approve'
                    })
                    
                    # Post in chatter
                    if hasattr(self, 'message_post'):
                        self.message_post(body=_("Approval Step '%s' Approved by %s.") % (step.name, current_user.name))
                    
                    # Notify other users if configured
                    if step.notify_user_ids:
                        for u in step.notify_user_ids:
                            self.env['mail.activity'].create({
                                'activity_type_id': self.env.ref('mail.mail_activity_data_todo').id,
                                'note': _("Step '%s' was approved on %s by %s.") % (step.name, self.display_name, current_user.name),
                                'user_id': u.id,
                                'res_id': self.id,
                                'res_model_id': self.env['ir.model'].search([('model', '=', self._name)], limit=1).id,
                            })
                    
                    # Recheck if there are remaining steps
                    remaining_steps = steps.filtered(lambda s: s.sequence > step.sequence)
                    if remaining_steps:
                        next_step = remaining_steps[0]
                        raise UserError(_("Step '%s' approved. Action pending approval of next step: '%s'.") % (step.name, next_step.name))
                    
                    # No more steps, we can proceed to run the button's action!
                    return True
                else:
                    # User is not authorized to approve this step. Block button action.
                    # Create a standard activity for authorized users/group
                    approvers_text = ", ".join(step.user_ids.mapped('name')) or ", ".join(step.group_ids.mapped('name'))
                    
                    # Try to create activity
                    try:
                        model_id = self.env['ir.model'].search([('model', '=', self._name)], limit=1).id
                        activity_users = step.user_ids
                        if not activity_users and step.group_ids:
                            activity_users = self.env['res.users'].search([('groups_id', 'in', step.group_ids.ids)])
                        for user in activity_users[:5]:  # limit to 5 activities
                            # Check if activity already exists
                            existing_act = self.env['mail.activity'].search([
                                ('res_id', '=', self.id),
                                ('res_model', '=', self._name),
                                ('user_id', '=', user.id),
                                ('summary', '=', _('Approval Required'))
                            ])
                            if not existing_act:
                                self.env['mail.activity'].create({
                                    'activity_type_id': self.env.ref('mail.mail_activity_data_todo').id,
                                    'summary': _('Approval Required'),
                                    'note': _("Approval required for step '%s' to confirm button action '%s'.") % (step.name, method),
                                    'user_id': user.id,
                                    'res_id': self.id,
                                    'res_model_id': model_id,
                                })
                    except Exception:
                        pass
                        
                    raise UserError(_("This action requires approval for step '%s'. Authorized approvers: %s.") % (step.name, approvers_text))
            
        return True

    def call_button(self, method, *args, **kwargs):
        # Intercept button click and validate approvals
        if self._name != 'studio.ce.approval' and isinstance(self.id, int) and self.id > 0:
            self._check_studio_approval_status(method)
        return super(BaseModel, self).call_button(method, *args, **kwargs)


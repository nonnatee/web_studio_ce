# -*- coding: utf-8 -*-
from odoo import models, fields

class IrModel(models.Model):
    _inherit = 'ir.model'

    is_studio_ce = fields.Boolean(
        string='Created by Studio CE',
        default=False,
        help='Indicates if this model was created dynamically via Odoo Studio CE.'
    )

class IrRule(models.Model):
    _inherit = 'ir.rule'

    is_studio_ce = fields.Boolean(
        string='Created by Studio CE',
        default=False,
        help='Indicates if this record rule was created dynamically via Odoo Studio CE.'
    )


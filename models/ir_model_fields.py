# -*- coding: utf-8 -*-
from odoo import models, fields

class IrModelFields(models.Model):
    _inherit = 'ir.model.fields'

    is_studio_ce = fields.Boolean(
        string='Created by Studio CE',
        default=False,
        prefetch=False,
        help='Indicates if this field was created dynamically via Odoo Studio CE.'
    )

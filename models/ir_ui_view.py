# -*- coding: utf-8 -*-
from odoo import models, fields

class IrUiView(models.Model):
    _inherit = 'ir.ui.view'

    is_studio_ce = fields.Boolean(
        string='Created by Studio CE',
        default=False,
        prefetch=False,
        help='Indicates if this view was created or modified dynamically via Odoo Studio CE.'
    )

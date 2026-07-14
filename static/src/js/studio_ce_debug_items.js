/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";

export function editInStudioCe({ component, env }) {
    const resModel = component.props.resModel || (component.model && component.model.config && component.model.config.resModel);
    if (!resModel) {
        return null;
    }
    return {
        type: "item",
        description: _t("Edit in Studio CE"),
        callback: () => {
            env.services.action.doAction({
                type: "ir.actions.client",
                tag: "web_studio_ce.editor_action",
                params: {
                    model: resModel,
                    view_id: component.props.viewId || null,
                }
            });
        },
        sequence: 10,
        section: "tools",
    };
}

registry.category("debug").category("form").add("editInStudioCe", editInStudioCe);
registry.category("debug").category("list").add("editInStudioCe", editInStudioCe);
registry.category("debug").category("kanban").add("editInStudioCe", editInStudioCe);

/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class AutomationEditor extends Component {
    setup() {
        this.state = useState({
            saving: false,
        });
    }

    async updateRule(prop, val) {
        this.state.saving = true;
        try {
            await rpc("/web_studio_ce/update_automation", {
                automation_id: this.props.rule.id,
                vals: { [prop]: val },
            });
            this.props.onRuleUpdated();
        } catch (error) {
            console.error("Failed to update rule", error);
        } finally {
            this.state.saving = false;
        }
    }
}

AutomationEditor.template = "web_studio_ce.AutomationEditor";
AutomationEditor.props = {
    rule: Object,
    fields: Array,
    onRuleUpdated: Function,
};

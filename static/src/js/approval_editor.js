/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class ApprovalEditor extends Component {
    setup() {
        this.state = useState({
            saving: false,
        });
    }

    async updateApproval(prop, val) {
        this.state.saving = true;
        try {
            const payload = {
                model_name: this.props.modelName,
                approval_id: this.props.approval.id,
                name: this.props.approval.name,
                min_approvals: this.props.approval.min_approvals,
                user_ids: this.props.approval.user_ids,
                group_ids: this.props.approval.group_ids,
                state_field_name: this.props.approval.state_field_name,
                approved_value: this.props.approval.approved_value,
                refused_value: this.props.approval.refused_value,
                required_domain: this.props.approval.required_domain,
            };
            
            if (prop === 'group_ids') {
                const current = [...(this.props.approval.group_ids || [])];
                if (current.includes(val)) {
                    payload.group_ids = current.filter(id => id !== val);
                } else {
                    payload.group_ids = [...current, val];
                }
            } else {
                payload[prop] = val;
            }

            await rpc("/web_studio_ce/save_approval", payload);
            this.props.onApprovalUpdated();
        } catch (error) {
            console.error("Failed to update approval configuration", error);
        } finally {
            this.state.saving = false;
        }
    }
}

ApprovalEditor.template = "web_studio_ce.ApprovalEditor";
ApprovalEditor.props = {
    approval: Object,
    groups: Array,
    modelName: String,
    onApprovalUpdated: Function,
};

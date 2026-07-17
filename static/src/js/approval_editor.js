/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class ApprovalEditor extends Component {
    setup() {
        this.state = useState({
            saving: false,
            steps: [],
        });

        onWillStart(() => {
            this.state.steps = JSON.parse(JSON.stringify(this.props.approval.steps || []));
        });

        onWillUpdateProps((nextProps) => {
            if (nextProps.approval) {
                this.state.steps = JSON.parse(JSON.stringify(nextProps.approval.steps || []));
            }
        });
    }

    addStep() {
        const nextSeq = this.state.steps.length ? Math.max(...this.state.steps.map(s => s.sequence)) + 10 : 10;
        this.state.steps.push({
            id: null,
            name: `Step ${this.state.steps.length + 1}`,
            sequence: nextSeq,
            exclusive: false,
            user_ids: [],
            group_ids: [],
            notify_user_ids: [],
        });
    }

    removeStep(index) {
        this.state.steps.splice(index, 1);
    }

    updateStepVal(index, key, val) {
        this.state.steps[index][key] = val;
    }

    toggleGroupInStep(stepIndex, groupId) {
        const step = this.state.steps[stepIndex];
        const idx = step.group_ids.indexOf(groupId);
        if (idx >= 0) {
            step.group_ids.splice(idx, 1);
        } else {
            step.group_ids.push(groupId);
        }
    }

    async saveApprovalConfig() {
        this.state.saving = true;
        try {
            await rpc("/web_studio_ce/save_approval", {
                model_name: this.props.modelName,
                approval_id: this.props.approval.id,
                name: this.props.approval.name,
                button_name: this.props.approval.button_name,
                required_domain: this.props.approval.required_domain,
                steps_data: this.state.steps,
            });
            this.props.onApprovalUpdated();
        } catch (error) {
            console.error("Failed to save approval rules", error);
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

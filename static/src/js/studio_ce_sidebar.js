/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { AutomationEditor } from "./automation_editor";
import { PropertiesBuilder } from "./properties_builder";
import { ApprovalEditor } from "./approval_editor";

export class StudioCeSidebar extends Component {
    setup() {
        this.state = useState({
            newOptionKey: "",
            newOptionValue: "",
            selectedRule: null,
            selectedApproval: null,
        });
    }

    onDragStartNewField(ev, type) {
        ev.dataTransfer.setData("text/plain", JSON.stringify({
            type: "new",
            fieldType: type
        }));
        ev.dataTransfer.effectAllowed = "copyMove";
    }

    onDragStartExistingField(ev, name, label) {
        ev.dataTransfer.setData("text/plain", JSON.stringify({
            type: "existing",
            name: name,
            label: label
        }));
        ev.dataTransfer.effectAllowed = "move";
    }

    addSelectionOption() {
        if (!this.state.newOptionKey || !this.state.newOptionValue) return;
        const options = [...(this.props.selectedField.selectionOptions || [])];
        options.push([this.state.newOptionKey, this.state.newOptionValue]);
        this.props.onFieldUpdate(this.props.selectedField.name, { selectionOptions: options });
        this.state.newOptionKey = "";
        this.state.newOptionValue = "";
    }

    removeSelectionOption(key) {
        const options = (this.props.selectedField.selectionOptions || []).filter(opt => opt[0] !== key);
        this.props.onFieldUpdate(this.props.selectedField.name, { selectionOptions: options });
    }

    updateProperty(propName, value) {
        this.props.onFieldUpdate(this.props.selectedField.name, { [propName]: value });
    }

    overrideProperty(propName, value) {
        this.props.onOverrideProperty(this.props.selectedField.name, propName, value);
    }

    selectRule(rule) {
        this.state.selectedRule = rule;
    }

    deselectRule() {
        this.state.selectedRule = null;
    }

    onRuleUpdated() {
        // Trigger parent state reload
        this.props.onRuleReload();
        // Update local reference
        const updated = this.props.automations.find(a => a.id === this.state.selectedRule.id);
        if (updated) {
            this.state.selectedRule = updated;
        }
    }

    selectApproval(app) {
        this.state.selectedApproval = app;
    }

    deselectApproval() {
        this.state.selectedApproval = null;
    }

    onApprovalUpdated() {
        this.props.onApprovalReload();
        const updated = this.props.approvals.find(a => a.id === this.state.selectedApproval.id);
        if (updated) {
            this.state.selectedApproval = updated;
        }
    }
}

StudioCeSidebar.template = "web_studio_ce.StudioCeSidebar";
StudioCeSidebar.components = { AutomationEditor, PropertiesBuilder, ApprovalEditor };
StudioCeSidebar.props = {
    activeTab: String,
    fields: Array,
    views: Array,
    automations: Array,
    logs: Array,
    approvals: Array,
    groups: Array,
    selectedField: { type: true, optional: true },
    onFieldUpdate: Function,
    onAddField: Function,
    onAddFieldToView: Function,
    onAddAutomation: Function,
    onRuleReload: Function,
    onAddApproval: Function,
    onApprovalReload: Function,
    onTabChange: Function,
    onSelectField: Function,
    onDeselectField: Function,
    onOverrideProperty: Function,
    onRevertLog: Function,
    onViewChange: Function,
    modelName: String,
};

/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { AutomationEditor } from "./automation_editor";
import { PropertiesBuilder } from "./properties_builder";

export class StudioCeSidebar extends Component {
    setup() {
        this.state = useState({
            newOptionKey: "",
            newOptionValue: "",
            selectedRule: null,
        });
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
}

StudioCeSidebar.template = "web_studio_ce.StudioCeSidebar";
StudioCeSidebar.components = { AutomationEditor, PropertiesBuilder };
StudioCeSidebar.props = {
    activeTab: String,
    fields: Array,
    views: Array,
    automations: Array,
    logs: Array,
    selectedField: { type: [Object, Boolean], optional: true },
    onFieldUpdate: Function,
    onAddField: Function,
    onAddFieldToView: Function,
    onAddAutomation: Function,
    onRuleReload: Function,
    onTabChange: Function,
    onSelectField: Function,
    onDeselectField: Function,
    onOverrideProperty: Function,
    onRevertLog: Function,
    modelName: String,
};

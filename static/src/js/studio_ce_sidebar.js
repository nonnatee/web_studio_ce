/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";
import { AutomationEditor } from "./automation_editor";
import { PropertiesBuilder } from "./properties_builder";
import { ApprovalEditor } from "./approval_editor";
import { rpc } from "@web/core/network/rpc";

export class StudioCeSidebar extends Component {
    setup() {
        this.state = useState({
            newOptionKey: "",
            newOptionValue: "",
            selectedRule: null,
            selectedApproval: null,
            searchQuery: "",
            activeFilter: "all",
            reports: [],
            selectedReportId: null,
        });

        onWillStart(async () => {
            await this.loadReports();
        });

        onWillUpdateProps(async (nextProps) => {
            if (nextProps.modelName !== this.props.modelName) {
                await this.loadReports(nextProps.modelName);
            }
        });
    }

    get filteredFields() {
        const query = (this.state.searchQuery || "").toLowerCase().trim();
        const filter = this.state.activeFilter;
        let fields = this.props.fields || [];

        if (query) {
            fields = fields.filter(f => 
                (f.name || "").toLowerCase().includes(query) || 
                (f.field_description || "").toLowerCase().includes(query)
            );
        }

        if (filter !== "all") {
            fields = fields.filter(f => {
                const type = f.ttype;
                if (filter === "text") {
                    return ["char", "text", "html"].includes(type);
                } else if (filter === "number") {
                    return ["integer", "float", "monetary"].includes(type);
                } else if (filter === "relation") {
                    return ["many2one", "many2many", "one2many"].includes(type);
                } else if (filter === "other") {
                    return !["char", "text", "html", "integer", "float", "monetary", "many2one", "many2many", "one2many"].includes(type);
                }
                return true;
            });
        }

        return fields;
    }

    onDragStartNewGroup(ev) {
        ev.dataTransfer.setData("text/plain", JSON.stringify({
            type: "new_group",
            label: "New Group"
        }));
        ev.dataTransfer.effectAllowed = "copyMove";
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

    async loadReports(model = this.props.modelName) {
        try {
            const data = await rpc("/web_studio_ce/get_reports", { model_name: model });
            if (data && !data.error) {
                this.state.reports = data.reports;
            }
        } catch (error) {
            console.error("Failed to load reports", error);
        }
    }

    selectReport(rep) {
        this.state.selectedReportId = rep.id;
        if (this.props.onSelectReport) {
            this.props.onSelectReport(rep);
        }
    }

    async createNewReport() {
        try {
            const res = await rpc("/web_studio_ce/create_report", {
                model_name: this.props.modelName,
                name: "New Report",
            });
            if (!res.error) {
                await this.loadReports();
            }
        } catch (error) {
            console.error("Failed to create report", error);
        }
    }

    removeFieldFromView() {
        const field = this.props.selectedField;
        if (!field) return;
        if (confirm(`Are you sure you want to remove this ${field.ttype === 'group' ? 'group' : 'field'} from the view?`)) {
            let xpath = "";
            if (field.ttype === "group" || field.ttype === "page" || field.name.startsWith("//")) {
                xpath = field.name;
            } else {
                xpath = `//field[@name='${field.name}']`;
            }
            if (xpath && this.props.onDeleteNode) {
                this.props.onDeleteNode(xpath);
            }
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
    onSelectReport: { type: Function, optional: true },
    onDeleteNode: { type: Function, optional: true },
};

/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { StudioCeDocsPanel } from "./studio_ce_docs";
import { rpc } from "@web/core/network/rpc";
import { AppCreator } from "./app_creator";
import { SecurityEditor } from "./security_editor";
import { StudioCeSidebar } from "./studio_ce_sidebar";
import { StudioCeCanvas } from "./studio_ce_canvas";
import { ReportEditor } from "./report_editor";
import { MenuEditor } from "./menu_editor";

export class StudioCeEditor extends Component {
    setup() {
        this.actionService = useService("action");
        this.state = useState({
            model: (this.props.action.params && this.props.action.params.model) || 
                   (this.props.action.context && this.props.action.context.active_model) || 
                   "product.template",
            viewId: this.props.action.params && this.props.action.params.view_id,
            activeTab: "views", // views, fields, reports, automations, security
            fields: [],
            views: [],
            automations: [],
            groups: [],
            logs: [],
            approvals: [],
            recordRules: [],
            loading: true,
            showDocs: false,
            showAppCreator: false,
            selectedField: null,
            showFieldCreateModal: false,
            fieldCreateType: "char",
            fieldCreateLabel: "",
            fieldCreateTechnicalName: "",
            fieldCreateTargetField: null,
            fieldCreatePosition: "inside",
            fieldCreateIsCustomName: false,
            fieldCreateError: "",
            selectedReport: null,
        });

        onWillStart(async () => {
            await this.loadStudioContext();
        });
    }

    async rpc(route, params) {
        return rpc(route, params);
    }

    async loadStudioContext() {
        this.state.loading = true;
        try {
            const data = await this.rpc("/web_studio_ce/get_studio_context", {
                model_name: this.state.model,
                view_id: this.state.viewId,
            });
            if (data.error) {
                console.error(data.error);
            } else {
                this.state.fields = data.fields;
                this.state.views = data.views;
                this.state.automations = data.automations;
                this.state.groups = data.groups;
                this.state.approvals = data.approvals || [];
                this.state.recordRules = data.record_rules || [];
                
                if (this.env.config) {
                    this.env.config.approvals = this.state.approvals;
                    this.env.config.fields = this.state.fields;
                }
            }

            // Load Customisation Logs
            const logData = await this.rpc("/web_studio_ce/get_customisation_logs", {
                model_name: this.state.model,
            });
            if (logData && !logData.error) {
                this.state.logs = logData;
            }
        } catch (error) {
            console.error("Failed to load Studio CE context", error);
        } finally {
            this.state.loading = false;
        }
    }

    async toggleFieldVisibility(fieldName, invisible) {
        if (!this.state.views || this.state.views.length === 0) return;
        const viewId = this.state.viewId || this.state.views[0].id;
        this.state.loading = true;
        try {
            const res = await this.rpc("/web_studio_ce/toggle_field_visibility", {
                view_id: viewId,
                field_name: fieldName,
                invisible: invisible,
            });
            if (!res.error) {
                await this.loadStudioContext();
            }
        } catch (error) {
            console.error("Failed to toggle field visibility", error);
        } finally {
            this.state.loading = false;
        }
    }

    async insertFieldIntoView(fieldName, targetFieldName, position, groupName, pageName) {
        if (!this.state.views || this.state.views.length === 0) return;
        const viewId = this.state.viewId || this.state.views[0].id;
        this.state.loading = true;
        try {
            const res = await this.rpc("/web_studio_ce/insert_field_into_view", {
                view_id: viewId,
                field_name: fieldName,
                target_field_name: targetFieldName,
                position: position,
                group_name: groupName,
                page_name: pageName,
            });
            if (!res.error) {
                await this.loadStudioContext();
            }
        } catch (error) {
            console.error("Failed to insert field into view", error);
        } finally {
            this.state.loading = false;
        }
    }

    async insertNewFieldIntoView(fieldType, targetFieldName, position) {
        const labelMap = {
            char: 'New Text',
            integer: 'New Integer',
            float: 'New Float',
            monetary: 'New Monetary',
            date: 'New Date',
            datetime: 'New Datetime',
            boolean: 'New Checkbox',
            selection: 'New Selection',
            many2one: 'New Relation',
            many2many: 'New Relation Tags',
            binary: 'New Binary',
            html: 'New HTML',
        };
        const defaultLabel = labelMap[fieldType] || 'New Field';

        this.state.fieldCreateType = fieldType;
        this.state.fieldCreateLabel = defaultLabel;
        this.state.fieldCreateTechnicalName = this.sanitizeTechnicalName(defaultLabel);
        this.state.fieldCreateTargetField = targetFieldName;
        this.state.fieldCreatePosition = position;
        this.state.fieldCreateIsCustomName = false;
        this.state.fieldCreateError = "";
        this.state.showFieldCreateModal = true;
    }

    sanitizeTechnicalName(val) {
        return (val || "")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    onFieldCreateLabelInput(ev) {
        this.state.fieldCreateLabel = ev.target.value;
        if (!this.state.fieldCreateIsCustomName) {
            this.state.fieldCreateTechnicalName = this.sanitizeTechnicalName(ev.target.value);
        }
    }

    onFieldCreateTechnicalNameInput(ev) {
        this.state.fieldCreateIsCustomName = true;
        this.state.fieldCreateTechnicalName = this.sanitizeTechnicalName(ev.target.value);
    }

    closeFieldCreateModal() {
        this.state.showFieldCreateModal = false;
        this.state.fieldCreateError = "";
    }

    async submitFieldCreate() {
        const label = this.state.fieldCreateLabel.trim();
        const techNameInput = this.state.fieldCreateTechnicalName.trim();
        if (!label) {
            this.state.fieldCreateError = "Field Label cannot be empty.";
            return;
        }
        if (!techNameInput) {
            this.state.fieldCreateError = "Technical Name cannot be empty.";
            return;
        }
        const fullFieldName = "x_studio_" + techNameInput;

        const existing = this.state.fields.find(f => f.name === fullFieldName);
        if (existing) {
            this.state.fieldCreateError = `Field '${fullFieldName}' already exists on this model.`;
            return;
        }

        this.state.loading = true;
        this.state.fieldCreateError = "";
        try {
            // 1. Create field in database
            const result = await this.rpc("/web_studio_ce/add_field", {
                model_name: this.state.model,
                field_name: fullFieldName,
                field_label: label,
                field_type: this.state.fieldCreateType,
            });

            if (result.error) {
                this.state.fieldCreateError = result.error;
                this.state.loading = false;
                return;
            }

            // 2. Insert field into view
            if (!this.state.views || this.state.views.length === 0) {
                this.closeFieldCreateModal();
                return;
            }
            const viewId = this.state.viewId || this.state.views[0].id;

            const res = await this.rpc("/web_studio_ce/insert_field_into_view", {
                view_id: viewId,
                field_name: fullFieldName,
                target_field_name: this.state.fieldCreateTargetField,
                position: this.state.fieldCreatePosition,
            });

            if (res.error) {
                this.state.fieldCreateError = res.error;
                this.state.loading = false;
                return;
            }

            await this.loadStudioContext();
            this.closeFieldCreateModal();

            // Auto-select the newly created field and open properties
            const newField = this.state.fields.find(f => f.name === fullFieldName);
            if (newField) {
                this.state.selectedField = newField;
                this.state.activeTab = "fields";
            }
        } catch (error) {
            console.error("Failed to create field", error);
            this.state.fieldCreateError = error.message || "Server Error occurred.";
        } finally {
            this.state.loading = false;
        }
    }

    async insertNewGroupIntoView(targetFieldName, position) {
        if (!this.state.views || this.state.views.length === 0) return;
        const viewId = this.state.viewId || this.state.views[0].id;
        const groupXml = `<group string="New Group"/>`;
        
        let xpathExpr = "";
        let finalPosition = position;
        if (targetFieldName) {
            if (targetFieldName.startsWith('//')) {
                xpathExpr = targetFieldName;
            } else {
                xpathExpr = `//field[@name='${targetFieldName}']`;
            }
        } else {
            xpathExpr = "//sheet";
            finalPosition = "inside";
        }
        
        const modificationXml = `<xpath expr="${xpathExpr}" position="${finalPosition}">${groupXml}</xpath>`;
        
        this.state.loading = true;
        try {
            const res = await this.rpc("/web_studio_ce/edit_view", {
                view_id: viewId,
                xpath_expr: xpathExpr,
                modification_xml: modificationXml,
            });
            if (!res.error) {
                await this.loadStudioContext();
                const groupXpath = `//group[@string='New Group']`;
                this.state.selectedField = {
                    id: groupXpath,
                    name: groupXpath,
                    field_description: 'New Group',
                    ttype: 'group'
                };
                this.state.activeTab = "fields";
            } else {
                console.error("Failed to insert group", res.error);
                alert(`Failed to insert group: ${res.error}`);
            }
        } catch (error) {
            console.error("Failed to insert group", error);
        } finally {
            this.state.loading = false;
        }
    }

    async moveNodeInView(sourceXpath, targetXpath, position, nodeXml) {
        if (!this.state.views || this.state.views.length === 0) return;
        const viewId = this.state.viewId || this.state.views[0].id;
        this.state.loading = true;
        try {
            const res = await this.rpc("/web_studio_ce/move_node_in_view", {
                view_id: viewId,
                source_xpath: sourceXpath,
                target_xpath: targetXpath,
                position: position,
                node_xml: nodeXml,
            });
            if (!res.error) {
                await this.loadStudioContext();
            } else {
                console.error("Failed to move element", res.error);
                alert(`Failed to move element: ${res.error}`);
            }
        } catch (error) {
            console.error("Failed to move element", error);
        } finally {
            this.state.loading = false;
        }
    }

    async deleteNodeInView(xpathExpr) {
        if (!this.state.views || this.state.views.length === 0) return;
        const viewId = this.state.viewId || this.state.views[0].id;
        this.state.loading = true;
        try {
            const res = await this.rpc("/web_studio_ce/delete_node_in_view", {
                view_id: viewId,
                xpath_expr: xpathExpr,
            });
            if (!res.error) {
                await this.loadStudioContext();
                this.state.selectedField = null;
            } else {
                console.error("Failed to delete element", res.error);
                alert(`Failed to delete element: ${res.error}`);
            }
        } catch (error) {
            console.error("Failed to delete element", error);
        } finally {
            this.state.loading = false;
        }
    }

    async overrideViewFieldProperty(fieldName, propName, propValue) {
        if (!this.state.views || this.state.views.length === 0) return;
        const viewId = this.state.viewId || this.state.views[0].id;
        this.state.loading = true;
        try {
            const res = await this.rpc("/web_studio_ce/override_view_field_property", {
                view_id: viewId,
                field_name: fieldName,
                prop_name: propName,
                prop_value: propValue,
            });
            if (!res.error) {
                await this.loadStudioContext();
            }
        } catch (error) {
            console.error("Failed to override view field property", error);
        } finally {
            this.state.loading = false;
        }
    }

    async revertLog(logId) {
        this.state.loading = true;
        try {
            const res = await this.rpc("/web_studio_ce/revert_customisation", {
                log_id: logId,
            });
            if (!res.error) {
                await this.loadStudioContext();
            }
        } catch (error) {
            console.error("Failed to revert customization", error);
        } finally {
            this.state.loading = false;
        }
    }

    async addCustomField(fieldType, label) {
        const labelMap = {
            char: 'New Text',
            integer: 'New Integer',
            float: 'New Float',
            monetary: 'New Monetary',
            date: 'New Date',
            datetime: 'New Datetime',
            boolean: 'New Checkbox',
            selection: 'New Selection',
            many2one: 'New Relation',
            many2many: 'New Relation Tags',
            binary: 'New Binary',
            html: 'New HTML',
        };
        const defaultLabel = labelMap[fieldType] || label || 'New Field';

        this.state.fieldCreateType = fieldType;
        this.state.fieldCreateLabel = defaultLabel;
        this.state.fieldCreateTechnicalName = this.sanitizeTechnicalName(defaultLabel);
        this.state.fieldCreateTargetField = null;
        this.state.fieldCreatePosition = "inside";
        this.state.fieldCreateIsCustomName = false;
        this.state.fieldCreateError = "";
        this.state.showFieldCreateModal = true;
    }

    async addFieldToView(viewId, fieldName) {
        const field = this.state.fields.find(f => f.name === fieldName);
        if (field && this.canvasInstance) {
            this.canvasInstance.startInsertion(field);
        } else {
            this.state.loading = true;
            const xpathExpr = "//sheet"; // target sheets in forms
            const xmlMod = `<xpath expr="${xpathExpr}" position="inside"><field name="${fieldName}"/></xpath>`;
            try {
                const result = await this.rpc("/web_studio_ce/edit_view", {
                    view_id: viewId,
                    xpath_expr: xpathExpr,
                    modification_xml: xmlMod,
                });
                if (!result.error) {
                    await this.loadStudioContext();
                }
            } catch (error) {
                console.error("Failed to edit view", error);
            } finally {
                this.state.loading = false;
            }
        }
    }

    onRegisterCanvas(canvasInstance) {
        this.canvasInstance = canvasInstance;
    }

    onTabChange(tab) {
        this.state.activeTab = tab;
        if (tab !== 'reports') {
            this.state.selectedReport = null;
        }
    }

    onSelectReport(report) {
        this.state.selectedReport = report;
    }

    onBackToReports() {
        this.state.selectedReport = null;
    }

    onSelectField(field) {
        this.state.selectedField = field;
    }

    onDeselectField() {
        this.state.selectedField = null;
    }

    onViewChange(viewId) {
        this.state.viewId = viewId;
        this.loadStudioContext();
    }

    async onFieldUpdate(fieldName, vals) {
        this.state.loading = true;
        try {
            const result = await this.rpc("/web_studio_ce/update_field_properties", {
                field_name: fieldName,
                model_name: this.state.model,
                vals: vals,
            });
            if (!result.error) {
                await this.loadStudioContext();
                // Update selectedField reference in state
                const updated = this.state.fields.find(f => f.name === fieldName);
                if (updated) {
                    this.state.selectedField = updated;
                }
            }
        } catch (error) {
            console.error("Failed to update field properties", error);
        } finally {
            this.state.loading = false;
        }
    }

    async addAutomationRule() {
        this.state.loading = true;
        try {
            await this.rpc("/web_studio_ce/save_automation", {
                model_name: this.state.model,
                name: 'New Automation Rule',
                trigger_event: 'on_create'
            });
            await this.loadStudioContext();
        } catch (error) {
            console.error("Failed to add automation rule", error);
        } finally {
            this.state.loading = false;
        }
    }

    async addApprovalWorkflow() {
        this.state.loading = true;
        try {
            await this.rpc("/web_studio_ce/save_approval", {
                model_name: this.state.model,
                name: 'New Approval Workflow',
                min_approvals: 1,
            });
            await this.loadStudioContext();
        } catch (error) {
            console.error("Failed to add approval workflow", error);
        } finally {
            this.state.loading = false;
        }
    }

    openDocs() {
        this.state.showDocs = true;
    }

    closeDocs() {
        this.state.showDocs = false;
    }

    openAppCreator() {
        this.state.showAppCreator = true;
    }

    closeAppCreator() {
        this.state.showAppCreator = false;
    }

    async onAppCreated(modelName) {
        this.state.model = modelName;
        this.state.viewId = null;
        this.state.showAppCreator = false;
        await this.loadStudioContext();
    }

    closeStudio() {
        this.actionService.doAction("home");
    }
}

StudioCeEditor.template = "web_studio_ce.StudioCeEditor";
StudioCeEditor.components = { StudioCeDocsPanel, AppCreator, SecurityEditor, StudioCeSidebar, StudioCeCanvas, ReportEditor, MenuEditor };
registry.category("actions").add("web_studio_ce.editor_action", StudioCeEditor);

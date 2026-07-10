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

export class StudioCeEditor extends Component {
    setup() {
        this.actionService = useService("action");
        this.state = useState({
            model: (this.props.action.params && this.props.action.params.model) || 
                   (this.props.action.context && this.props.action.context.active_model) || 
                   "res.partner",
            viewId: this.props.action.params && this.props.action.params.view_id,
            activeTab: "views", // views, fields, reports, automations, security
            fields: [],
            views: [],
            automations: [],
            groups: [],
            logs: [],
            loading: true,
            showDocs: false,
            showAppCreator: false,
            selectedField: null,
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
        const fieldName = `x_studio_field_${Date.now().toString().slice(-4)}`;
        this.state.loading = true;
        try {
            const result = await this.rpc("/web_studio_ce/add_field", {
                model_name: this.state.model,
                field_name: fieldName,
                field_label: label,
                field_type: fieldType,
            });
            if (!result.error) {
                await this.loadStudioContext();
            }
        } catch (error) {
            console.error("Failed to add custom field", error);
        } finally {
            this.state.loading = false;
        }
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
StudioCeEditor.components = { StudioCeDocsPanel, AppCreator, SecurityEditor, StudioCeSidebar, StudioCeCanvas };
registry.category("actions").add("web_studio_ce.editor_action", StudioCeEditor);

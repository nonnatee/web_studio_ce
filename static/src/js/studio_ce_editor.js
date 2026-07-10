/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { StudioCeDocsPanel } from "./studio_ce_docs";
import { rpc } from "@web/core/network/rpc";
import { AppCreator } from "./app_creator";
import { SecurityEditor } from "./security_editor";
import { StudioCeSidebar } from "./studio_ce_sidebar";

export class StudioCeEditor extends Component {
    setup() {
        this.actionService = useService("action");
        this.state = useState({
            model: this.props.action.params.model || "res.partner",
            viewId: this.props.action.params.view_id,
            activeTab: "views", // views, fields, reports, automations, security
            fields: [],
            views: [],
            automations: [],
            groups: [],
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
        } catch (error) {
            console.error("Failed to load Studio CE context", error);
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
StudioCeEditor.components = { StudioCeDocsPanel, AppCreator, SecurityEditor, StudioCeSidebar };
registry.category("actions").add("web_studio_ce.editor_action", StudioCeEditor);

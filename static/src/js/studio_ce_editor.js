/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { StudioCeDocsPanel } from "./studio_ce_docs";
import { rpc } from "@web/core/network/rpc";

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

    openDocs() {
        this.state.showDocs = true;
    }

    closeDocs() {
        this.state.showDocs = false;
    }

    closeStudio() {
        this.actionService.doAction("web.action_main_menu");
    }
}

StudioCeEditor.template = "web_studio_ce.StudioCeEditor";
StudioCeEditor.components = { StudioCeDocsPanel };
registry.category("actions").add("web_studio_ce.editor_action", StudioCeEditor);

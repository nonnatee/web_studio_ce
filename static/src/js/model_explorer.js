/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { rpc } from "@web/core/network/rpc";

export class ModelExplorer extends Component {
    setup() {
        this.actionService = useService("action");
        this.state = useState({
            models: [],
            searchQuery: "",
            loading: true,
        });

        onWillStart(async () => {
            await this.loadModels();
        });
    }

    async loadModels() {
        this.state.loading = true;
        try {
            const data = await rpc("/web_studio_ce/get_models");
            if (data && !data.error) {
                this.state.models = data;
            }
        } catch (error) {
            console.error("Failed to load models list", error);
        } finally {
            this.state.loading = false;
        }
    }

    get filteredModels() {
        const query = this.state.searchQuery.toLowerCase().trim();
        if (!query) return this.state.models;
        return this.state.models.filter(m => 
            (m.name && m.name.toLowerCase().includes(query)) ||
            (m.model && m.model.toLowerCase().includes(query))
        );
    }

    customizeModel(modelName) {
        this.actionService.doAction({
            type: "ir.actions.client",
            tag: "web_studio_ce.editor_action",
            params: {
                model: modelName,
            }
        });
    }

    viewRecords(modelName) {
        this.actionService.doAction({
            name: modelName,
            type: "ir.actions.act_window",
            res_model: modelName,
            views: [[false, "list"], [false, "form"]],
            view_mode: "list,form",
            target: "current",
        });
    }

    closeExplorer() {
        this.actionService.doAction("home");
    }
}

ModelExplorer.template = "web_studio_ce.ModelExplorer";
registry.category("actions").add("web_studio_ce.model_explorer", ModelExplorer);

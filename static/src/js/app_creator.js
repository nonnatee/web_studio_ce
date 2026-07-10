/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class AppCreator extends Component {
    setup() {
        this.state = useState({
            step: 1, // 1: App Info, 2: Finish
            appName: "",
            modelTechnicalName: "",
            iconColor: "#0d6efd",
            iconSymbol: "⚙️",
            loading: false,
            error: null,
        });

        this.symbols = ["⚙️", "📈", "👤", "🛒", "✉️", "📦", "💼", "🛠️", "📅", "💡", "💰", "📁"];
        this.colors = ["#0d6efd", "#198754", "#dc3545", "#ffc107", "#0dcaf0", "#6610f2", "#fd7e14", "#20c997", "#343a40"];
    }

    async createModel() {
        if (!this.state.appName.trim() || !this.state.modelTechnicalName.trim()) {
            this.state.error = "Please fill in all fields.";
            return;
        }

        let techName = this.state.modelTechnicalName.toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (!techName.startsWith("x_")) {
            techName = "x_" + techName;
        }

        this.state.loading = true;
        this.state.error = null;

        try {
            const data = await rpc("/web_studio_ce/create_model", {
                model_label: this.state.appName,
                model_name: techName,
            });

            if (data.error) {
                this.state.error = data.error;
            } else {
                this.state.step = 2;
                this.props.onAppCreated(data.model_name);
            }
        } catch (err) {
            this.state.error = "Failed to create application model.";
        } finally {
            this.state.loading = false;
        }
    }

    onClose() {
        this.props.onClose();
    }
}

AppCreator.template = "web_studio_ce.AppCreator";
AppCreator.props = {
    onClose: Function,
    onAppCreated: Function,
};

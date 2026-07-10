/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class SecurityEditor extends Component {
    setup() {
        this.state = useState({
            acls: [],
            availableGroups: [],
            selectedGroupId: "",
            loading: true,
            saving: false,
        });

        onWillStart(async () => {
            await this.loadSecurity();
        });

        onWillUpdateProps(async (nextProps) => {
            if (nextProps.model !== this.props.model) {
                await this.loadSecurity(nextProps.model);
            }
        });
    }

    async loadSecurity(modelName = this.props.model) {
        this.state.loading = true;
        try {
            const data = await rpc("/web_studio_ce/get_security_matrix", {
                model_name: modelName,
            });
            if (!data.error) {
                this.state.acls = data.acls;
                // Filter out groups already in ACL list to show in dropdown
                const existingGroupIds = new Set(data.acls.map(a => a.group_id));
                this.state.availableGroups = data.groups.filter(g => !existingGroupIds.has(g.id));
                if (this.state.availableGroups.length > 0) {
                    this.state.selectedGroupId = this.state.availableGroups[0].id.toString();
                } else {
                    this.state.selectedGroupId = "";
                }
            }
        } catch (error) {
            console.error("Failed to load security matrix", error);
        } finally {
            this.state.loading = false;
        }
    }

    async addGroupToMatrix() {
        if (!this.state.selectedGroupId) return;
        const gId = parseInt(this.state.selectedGroupId);
        const group = this.state.availableGroups.find(g => g.id === gId);
        if (!group) return;

        // Add locally to the state
        this.state.acls.push({
            id: false, // brand new record
            name: `access_${this.props.model}_${group.id}`,
            group_id: group.id,
            group_name: group.name,
            read: true,
            write: true,
            create: true,
            unlink: true,
        });

        // Recalculate dropdown
        this.state.availableGroups = this.state.availableGroups.filter(g => g.id !== gId);
        if (this.state.availableGroups.length > 0) {
            this.state.selectedGroupId = this.state.availableGroups[0].id.toString();
        } else {
            this.state.selectedGroupId = "";
        }
    }

    async saveChanges() {
        this.state.saving = true;
        try {
            const result = await rpc("/web_studio_ce/save_security_matrix", {
                model_name: this.props.model,
                acls_to_save: this.state.acls,
            });
            if (result.status === "success") {
                await this.loadSecurity();
            }
        } catch (error) {
            console.error("Failed to save security permissions", error);
        } finally {
            this.state.saving = false;
        }
    }
}

SecurityEditor.template = "web_studio_ce.SecurityEditor";
SecurityEditor.props = {
    model: String,
};

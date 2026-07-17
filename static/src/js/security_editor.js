/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class SecurityEditor extends Component {
    setup() {
        this.state = useState({
            acls: [],
            availableGroups: [],
            allGroups: [],
            selectedGroupId: "",
            loading: true,
            saving: false,
            
            // Record Rules
            recordRules: [],
            selectedRule: null,
            ruleForm: {
                id: null,
                name: "",
                domain_force: "",
                perm_read: true,
                perm_write: true,
                perm_create: true,
                perm_unlink: true,
                group_ids: []
            }
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
                this.state.allGroups = data.groups || [];
                const existingGroupIds = new Set(data.acls.map(a => a.group_id));
                this.state.availableGroups = data.groups.filter(g => !existingGroupIds.has(g.id));
                if (this.state.availableGroups.length > 0) {
                    this.state.selectedGroupId = this.state.availableGroups[0].id.toString();
                } else {
                    this.state.selectedGroupId = "";
                }
            }
            
            const contextData = await rpc("/web_studio_ce/get_studio_context", {
                model_name: modelName,
            });
            if (contextData && !contextData.error) {
                this.state.recordRules = contextData.record_rules || [];
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

        this.state.acls.push({
            id: false,
            name: `access_${this.props.model}_${group.id}`,
            group_id: group.id,
            group_name: group.name,
            read: true,
            write: true,
            create: true,
            unlink: true,
        });

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

    editRule(rule) {
        this.state.selectedRule = rule;
        this.state.ruleForm = {
            id: rule.id,
            name: rule.name,
            domain_force: rule.domain_force,
            perm_read: rule.perm_read,
            perm_write: rule.perm_write,
            perm_create: rule.perm_create,
            perm_unlink: rule.perm_unlink,
            group_ids: [...rule.group_ids]
        };
    }

    createNewRule() {
        const newRule = {
            id: null,
            name: "New Record Rule",
            domain_force: "[('create_uid', '=', user.id)]",
            perm_read: true,
            perm_write: true,
            perm_create: true,
            perm_unlink: true,
            group_ids: []
        };
        this.state.selectedRule = newRule;
        this.state.ruleForm = newRule;
    }

    cancelRuleEdit() {
        this.state.selectedRule = null;
    }

    async saveRule() {
        this.state.saving = true;
        try {
            const res = await rpc("/web_studio_ce/save_record_rule", {
                model_name: this.props.model,
                name: this.state.ruleForm.name,
                domain_force: this.state.ruleForm.domain_force,
                perm_read: this.state.ruleForm.perm_read,
                perm_write: this.state.ruleForm.perm_write,
                perm_create: this.state.ruleForm.perm_create,
                perm_unlink: this.state.ruleForm.perm_unlink,
                group_ids: this.state.ruleForm.group_ids,
                rule_id: this.state.ruleForm.id
            });
            if (!res.error) {
                await this.loadSecurity();
                this.state.selectedRule = null;
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error("Failed to save rule", error);
        } finally {
            this.state.saving = false;
        }
    }

    async deleteRule(ruleId) {
        if (!confirm("Are you sure you want to delete this record rule?")) return;
        this.state.saving = true;
        try {
            const res = await rpc("/web_studio_ce/delete_record_rule", {
                rule_id: ruleId
            });
            if (!res.error) {
                await this.loadSecurity();
                this.state.selectedRule = null;
            }
        } catch (error) {
            console.error("Failed to delete rule", error);
        } finally {
            this.state.saving = false;
        }
    }

    toggleGroupInRule(groupId) {
        const idx = this.state.ruleForm.group_ids.indexOf(groupId);
        if (idx >= 0) {
            this.state.ruleForm.group_ids.splice(idx, 1);
        } else {
            this.state.ruleForm.group_ids.push(groupId);
        }
    }
}

SecurityEditor.template = "web_studio_ce.SecurityEditor";
SecurityEditor.props = {
    model: String,
};

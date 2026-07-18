/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class MenuEditor extends Component {
    setup() {
        this.state = useState({
            menuTree: [],
            windowActions: [],
            selectedMenu: null,
            loading: false,
            error: null,
            isNew: false,
            // Form state for editing/creation
            menuForm: {
                id: null,
                name: "",
                parent_id: null,
                sequence: 10,
                action_id: null,
            }
        });

        onWillStart(async () => {
            await this.loadMenuTree();
            await this.loadWindowActions();
        });
    }

    async loadMenuTree() {
        this.state.loading = true;
        try {
            this.state.menuTree = await rpc("/web_studio_ce/get_menu_tree", {});
        } catch (err) {
            this.state.error = "Failed to load menus.";
        } finally {
            this.state.loading = false;
        }
    }

    async loadWindowActions() {
        try {
            // Fetch window actions to populate target action dropdown
            const actions = await rpc("/web/dataset/call_kw/ir.actions.act_window/search_read", {
                model: "ir.actions.act_window",
                method: "search_read",
                args: [[]],
                kwargs: {
                    fields: ["id", "name"],
                    order: "name asc",
                }
            });
            this.state.windowActions = actions || [];
        } catch (err) {
            console.error("Failed to load actions", err);
        }
    }

    selectMenu(menu) {
        this.state.isNew = false;
        this.state.selectedMenu = menu;
        this.state.menuForm = {
            id: menu.id,
            name: menu.name,
            parent_id: menu.parent_id || null,
            sequence: menu.sequence || 10,
            action_id: menu.action_id || null,
        };
    }

    initNewMenu() {
        this.state.isNew = true;
        this.state.selectedMenu = {};
        this.state.menuForm = {
            id: null,
            name: "New Menu",
            parent_id: this.state.selectedMenu.id || null,
            sequence: 10,
            action_id: null,
        };
    }

    getFlatMenus(menus = this.state.menuTree, list = []) {
        for (const m of menus) {
            list.push({ id: m.id, name: m.name });
            if (m.children && m.children.length > 0) {
                this.getFlatMenus(m.children, list);
            }
        }
        return list;
    }

    async saveMenu() {
        if (!this.state.menuForm.name.trim()) {
            alert("Menu name is required.");
            return;
        }
        this.state.loading = true;
        try {
            const res = await rpc("/web_studio_ce/save_menu", {
                name: this.state.menuForm.name,
                parent_id: this.state.menuForm.parent_id ? parseInt(this.state.menuForm.parent_id) : null,
                sequence: parseInt(this.state.menuForm.sequence) || 10,
                action_id: this.state.menuForm.action_id ? parseInt(this.state.menuForm.action_id) : null,
                menu_id: this.state.isNew ? null : this.state.menuForm.id,
            });

            if (res.error) {
                alert(res.error);
            } else {
                await this.loadMenuTree();
                this.state.selectedMenu = null;
                this.state.isNew = false;
            }
        } catch (err) {
            alert("Failed to save menu.");
        } finally {
            this.state.loading = false;
        }
    }

    async deleteMenu() {
        if (!confirm("Are you sure you want to delete this menu? This will remove all child menus recursively.")) {
            return;
        }
        this.state.loading = true;
        try {
            const res = await rpc("/web_studio_ce/delete_menu", {
                menu_id: this.state.menuForm.id,
            });
            if (res.error) {
                alert(res.error);
            } else {
                await this.loadMenuTree();
                this.state.selectedMenu = null;
            }
        } catch (err) {
            alert("Failed to delete menu.");
        } finally {
            this.state.loading = false;
        }
    }
}

MenuEditor.template = "web_studio_ce.MenuEditor";
MenuEditor.components = {};
MenuEditor.props = {};

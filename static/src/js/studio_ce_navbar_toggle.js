/** @odoo-module **/

import { NavBar } from "@web/webclient/navbar/navbar";
import { patch } from "@web/core/utils/patch";
import { session } from "@web/session";

patch(NavBar.prototype, {
    setup() {
        super.setup(...arguments);
        this.isStudioCeAdmin = false;
        this.checkStudioCePermission();
    },

    async checkStudioCePermission() {
        const userService = this.env.services.user;
        if (userService) {
            this.isStudioCeAdmin = await userService.hasGroup("web_studio_ce.group_studio_ce");
        } else {
            this.isStudioCeAdmin = session.is_admin || false;
        }
        this.render();
    },

    onStudioCeClick() {
        const actionService = this.env.services.action;
        if (actionService) {
            const currentController = actionService.currentController;
            if (currentController && currentController.action) {
                if (currentController.action.tag === "web_studio_ce.editor_action") {
                    actionService.doAction("home");
                    return;
                }
                const model = currentController.action.res_model;
                actionService.doAction({
                    type: "ir.actions.client",
                    tag: "web_studio_ce.editor_action",
                    params: {
                        model: model,
                        view_id: currentController.action.views ? currentController.action.views[0][0] : null,
                    }
                });
            }
        }
    }
});

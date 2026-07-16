/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { registry } from "@web/core/registry";
import { FormRenderer } from "@web/views/form/form_renderer";
import { ListRenderer } from "@web/views/list/list_renderer";
import { KanbanRenderer } from "@web/views/kanban/kanban_renderer";
import { useEffect, onMounted, onPatched } from "@odoo/owl";

// 1. Patch View Service to dynamically inject edited arch
const viewService = registry.category("services").get("view");
if (viewService) {
    patch(viewService, {
        start(env) {
            const api = super.start(...arguments);
            const originalLoadViews = api.loadViews;
            api.loadViews = async function (params) {
                const res = await originalLoadViews.apply(this, arguments);
                if (env.config && env.config.studioMode && env.config.studioModel === params.resModel && env.config.studioArch) {
                    for (const viewType in res.views) {
                        if (env.config.studioViewType === viewType) {
                            res.views[viewType].arch = env.config.studioArch;
                        }
                    }
                }
                return res;
            };
            return api;
        }
    });
}

// Helper to find Odoo element XPath inside DOM
function getElementXPath(el, model) {
    if (!el) return "";
    
    // Field widget (Form/Kanban)
    const fieldWidget = el.closest(".o_field_widget");
    if (fieldWidget) {
        const name = fieldWidget.getAttribute("name");
        if (name) return `//field[@name='${name}']`;
    }

    // List view column header
    const thHeader = el.closest("th[data-name]");
    if (thHeader) {
        const name = thHeader.getAttribute("data-name");
        if (name) return `//field[@name='${name}']`;
    }

    // Button
    const btn = el.closest("button, .btn");
    if (btn) {
        const name = btn.getAttribute("name");
        if (name) return `//button[@name='${name}']`;
        const stringAttr = btn.getAttribute("string") || btn.textContent?.trim();
        if (stringAttr) return `//button[@string='${stringAttr}']`;
    }
    
    // Group container
    const groupEl = el.closest(".o_group, .o_inner_group");
    if (groupEl) {
        const stringAttr = groupEl.querySelector(".o_horizontal_separator, .fw-bold")?.textContent?.trim();
        if (stringAttr) return `//group[@string='${stringAttr}']`;
        return `//group[1]`;
    }

    // Page/Tab container
    const tabPane = el.closest(".tab-pane");
    if (tabPane) {
        const paneId = tabPane.getAttribute("id");
        const tabLink = document.querySelector(`a[href="#${paneId}"], button[data-bs-target="#${paneId}"], a[data-bs-target="#${paneId}"]`);
        const tabString = tabLink?.textContent?.trim();
        if (tabString) return `//page[@string='${tabString}']`;
    }

    // Sheet / default fallback
    if (el.closest(".o_form_sheet")) {
        return "//sheet";
    }

    return "//form";
}

// 2. Patch FormRenderer
patch(FormRenderer.prototype, {
    setup() {
        super.setup(...arguments);
        
        if (this.env.config && this.env.config.studioMode) {
            onMounted(() => {
                this.setupStudioInteractiveMode();
            });
            onPatched(() => {
                this.setupStudioInteractiveMode();
            });
        }
    },

    setupStudioInteractiveMode() {
        if (!this.el) return;
        if (!this.env.config || !this.env.config.studioMode) return;
        
        // Add class to wrapper
        this.el.classList.add("o_studio_ce_design_mode");

        // Prevent inputs from receiving focus or clicks
        const inputs = this.el.querySelectorAll("input, select, textarea, button");
        inputs.forEach(input => {
            if (!input.closest(".o_studio_ce_sidebar")) {
                input.setAttribute("disabled", "1");
                input.style.pointerEvents = "none";
            }
        });

        // Add Hover/Click listeners
        this.el.addEventListener("mouseover", this.onStudioMouseOver.bind(this), true);
        this.el.addEventListener("mouseout", this.onStudioMouseOut.bind(this), true);
        this.el.addEventListener("click", this.onStudioClick.bind(this), true);

        // Drag and drop listeners on root element
        this.el.addEventListener("dragover", this.onStudioDragOver.bind(this), true);
        this.el.addEventListener("dragleave", this.onStudioDragLeave.bind(this), true);
        this.el.addEventListener("drop", this.onStudioDrop.bind(this), true);
        
        // Make field cards draggable
        const fields = this.el.querySelectorAll(".o_field_widget");
        fields.forEach(field => {
            field.setAttribute("draggable", "true");
            field.addEventListener("dragstart", (ev) => {
                const name = field.getAttribute("name");
                if (name) {
                    ev.dataTransfer.setData("text/plain", JSON.stringify({
                        type: "existing",
                        name: name,
                        xpath: `//field[@name='${name}']`
                    }));
                }
            });
        });
    },

    onStudioMouseOver(ev) {
        if (!this.env.config || !this.env.config.studioMode) return;
        ev.stopPropagation();
        const target = ev.target.closest(".o_field_widget, .o_group, .o_inner_group, .tab-pane, .o_form_sheet");
        if (!target) return;

        // Clear other hovers
        this.el.querySelectorAll(".o_studio_ce_hover").forEach(el => el.classList.remove("o_studio_ce_hover"));
        target.classList.add("o_studio_ce_hover");
    },

    onStudioMouseOut(ev) {
        if (!this.env.config || !this.env.config.studioMode) return;
        ev.stopPropagation();
        const target = ev.target.closest(".o_field_widget, .o_group, .o_inner_group, .tab-pane, .o_form_sheet");
        if (target) {
            target.classList.remove("o_studio_ce_hover");
        }
    },

    onStudioClick(ev) {
        if (!this.env.config || !this.env.config.studioMode) return;
        ev.preventDefault();
        ev.stopPropagation();

        const target = ev.target.closest(".o_field_widget, .o_group, .o_inner_group, .tab-pane, .o_form_sheet");
        if (!target) return;

        // Visual selection indicator
        this.el.querySelectorAll(".o_studio_ce_selected").forEach(el => el.classList.remove("o_studio_ce_selected"));
        target.classList.add("o_studio_ce_selected");

        const xpath = getElementXPath(target, this.props.record?.resModel);
        
        if (target.classList.contains("o_field_widget")) {
            const name = target.getAttribute("name");
            const fieldsList = this.env.config.fields || [];
            const field = fieldsList.find(f => f.name === name);
            if (field) {
                this.env.config.onSelectField?.(field);
            }
        } else {
            // Group/Page Layout Element
            this.env.config.onSelectField?.({
                id: xpath,
                name: xpath,
                field_description: target.classList.contains("o_form_sheet") ? "Form Sheet" : (target.querySelector(".o_horizontal_separator, .fw-bold")?.textContent?.trim() || "Group Container"),
                ttype: target.classList.contains("tab-pane") ? "page" : "group"
            });
        }
    },

    onStudioDragOver(ev) {
        if (!this.env.config || !this.env.config.studioMode) return;
        ev.preventDefault();
        ev.stopPropagation();
        const target = ev.target.closest(".o_field_widget, .o_group, .o_inner_group, .tab-pane, .o_form_sheet");
        if (target) {
            target.classList.add("o_studio_ce_drag_over");
        }
    },

    onStudioDragLeave(ev) {
        if (!this.env.config || !this.env.config.studioMode) return;
        ev.stopPropagation();
        const target = ev.target.closest(".o_field_widget, .o_group, .o_inner_group, .tab-pane, .o_form_sheet");
        if (target) {
            target.classList.remove("o_studio_ce_drag_over");
        }
    },

    async onStudioDrop(ev) {
        if (!this.env.config || !this.env.config.studioMode) return;
        ev.preventDefault();
        ev.stopPropagation();
        
        const target = ev.target.closest(".o_field_widget, .o_group, .o_inner_group, .tab-pane, .o_form_sheet");
        if (!target) return;
        target.classList.remove("o_studio_ce_drag_over");

        const dataStr = ev.dataTransfer.getData("text/plain");
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            const targetXpath = getElementXPath(target, this.props.record?.resModel);
            const position = target.classList.contains("o_field_widget") ? "after" : "inside";

            if (data.type === "existing") {
                if (data.xpath && data.xpath !== targetXpath) {
                    await this.env.config.onMoveNode?.(data.xpath, targetXpath, position);
                }
            } else if (data.type === "new") {
                await this.env.config.onInsertNewField?.(data.fieldType, targetXpath, position);
            } else if (data.type === "new_group") {
                await this.env.config.onInsertNewGroup?.(targetXpath, position);
            }
        } catch (e) {
            console.error("Studio drop error", e);
        }
    }
});

// 3. Patch ListRenderer
patch(ListRenderer.prototype, {
    setup() {
        super.setup(...arguments);
        if (this.env.config && this.env.config.studioMode) {
            onMounted(() => {
                this.setupStudioInteractiveList();
            });
            onPatched(() => {
                this.setupStudioInteractiveList();
            });
        }
    },

    setupStudioInteractiveList() {
        if (!this.el) return;
        if (!this.env.config || !this.env.config.studioMode) return;
        this.el.classList.add("o_studio_ce_design_mode");

        // Click list headers to select field
        const headers = this.el.querySelectorAll("th[data-name]");
        headers.forEach(th => {
            th.style.cursor = "pointer";
            th.addEventListener("click", (ev) => {
                if (!this.env.config || !this.env.config.studioMode) return;
                ev.preventDefault();
                ev.stopPropagation();
                const name = th.getAttribute("data-name");
                const fieldsList = this.env.config.fields || [];
                const field = fieldsList.find(f => f.name === name);
                if (field) {
                    this.env.config.onSelectField?.(field);
                }
            }, true);

            // Drag and Drop on Headers
            th.setAttribute("draggable", "true");
            th.addEventListener("dragstart", (ev) => {
                if (!this.env.config || !this.env.config.studioMode) return;
                const name = th.getAttribute("data-name");
                ev.dataTransfer.setData("text/plain", JSON.stringify({
                    type: "existing",
                    name: name,
                    xpath: `//field[@name='${name}']`
                }));
            });
            
            th.addEventListener("dragover", (ev) => {
                if (!this.env.config || !this.env.config.studioMode) return;
                ev.preventDefault();
                th.classList.add("o_studio_ce_drag_over");
            });

            th.addEventListener("dragleave", () => {
                if (!this.env.config || !this.env.config.studioMode) return;
                th.classList.remove("o_studio_ce_drag_over");
            });

            th.addEventListener("drop", async (ev) => {
                if (!this.env.config || !this.env.config.studioMode) return;
                ev.preventDefault();
                th.classList.remove("o_studio_ce_drag_over");
                const dataStr = ev.dataTransfer.getData("text/plain");
                if (!dataStr) return;
                try {
                    const data = JSON.parse(dataStr);
                    const targetName = th.getAttribute("data-name");
                    const targetXpath = `//field[@name='${targetName}']`;

                    if (data.type === "existing") {
                        if (data.name !== targetName) {
                            await this.env.config.onMoveNode?.(data.xpath, targetXpath, "before");
                        }
                    } else if (data.type === "new") {
                        await this.env.config.onInsertNewField?.(data.fieldType, targetXpath, "before");
                    }
                } catch (e) {
                    console.error("List header drop error", e);
                }
            });
        });
    }
});

// 4. Patch KanbanRenderer
patch(KanbanRenderer.prototype, {
    setup() {
        super.setup(...arguments);
        if (this.env.config && this.env.config.studioMode) {
            onMounted(() => {
                this.setupStudioInteractiveKanban();
            });
            onPatched(() => {
                this.setupStudioInteractiveKanban();
            });
        }
    },

    setupStudioInteractiveKanban() {
        if (!this.el) return;
        if (!this.env.config || !this.env.config.studioMode) return;
        this.el.classList.add("o_studio_ce_design_mode");

        // Allow selection of fields inside kanban cards
        const fields = this.el.querySelectorAll(".o_kanban_record *[name], .o_kanban_record .o_field_widget");
        fields.forEach(field => {
            field.style.outline = "1px dashed rgba(0, 0, 255, 0.4)";
            field.addEventListener("click", (ev) => {
                if (!this.env.config || !this.env.config.studioMode) return;
                ev.preventDefault();
                ev.stopPropagation();
                const name = field.getAttribute("name") || field.className.match(/o_field_(\w+)/)?.[1];
                const fieldsList = this.env.config.fields || [];
                const fieldData = fieldsList.find(f => f.name === name);
                if (fieldData) {
                    this.env.config.onSelectField?.(fieldData);
                }
            }, true);
        });
    }
});

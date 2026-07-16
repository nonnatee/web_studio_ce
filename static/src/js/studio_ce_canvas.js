/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps, onWillDestroy } from "@odoo/owl";
import { View } from "@web/views/view";

export class StudioCeCanvas extends Component {
    setup() {
        this.state = useState({
            mode: "canvas", // canvas (edit), form, list, kanban, xml
        });

        // Initialize design mode in shared env config
        this.env.config.studioMode = true;
        this.env.config.studioModel = this.props.model;
        this.env.config.studioViewId = this.props.view ? this.props.view.id : null;
        this.env.config.studioViewType = this.props.view ? this.props.view.type : null;
        this.env.config.studioArch = this.props.view ? this.props.view.arch : null;
        this.env.config.fields = this.props.fields;
        
        // Callback bindings for the patched renderers
        this.env.config.onSelectField = this.props.onSelectField;
        this.env.config.onMoveNode = this.props.onMoveNode;
        this.env.config.onInsertNewField = this.props.onInsertNewField;
        this.env.config.onInsertNewGroup = this.props.onInsertNewGroup;

        onWillUpdateProps((nextProps) => {
            this.env.config.studioModel = nextProps.model;
            this.env.config.studioViewId = nextProps.view ? nextProps.view.id : null;
            this.env.config.studioViewType = nextProps.view ? nextProps.view.type : null;
            this.env.config.studioArch = nextProps.view ? nextProps.view.arch : null;
            this.env.config.fields = nextProps.fields;
        });

        onWillDestroy(() => {
            this.env.config.studioMode = false;
        });

        if (this.props.onRegister) {
            this.props.onRegister(this);
        }
    }

    getViewType() {
        if (this.state.mode === "canvas") {
            return this.props.view ? this.props.view.type : "form";
        }
        return this.state.mode;
    }

    async switchMode(newMode) {
        if (newMode === 'form') {
            const formView = this.props.views.find(v => v.type === 'form');
            if (formView && (!this.props.view || this.props.view.id !== formView.id)) {
                await this.props.onViewChange(formView.id);
            }
        } else if (newMode === 'list') {
            const listView = this.props.views.find(v => v.type === 'list' || v.type === 'tree');
            if (listView && (!this.props.view || this.props.view.id !== listView.id)) {
                await this.props.onViewChange(listView.id);
            }
        } else if (newMode === 'kanban') {
            const kanbanView = this.props.views.find(v => v.type === 'kanban');
            if (kanbanView && (!this.props.view || this.props.view.id !== kanbanView.id)) {
                await this.props.onViewChange(kanbanView.id);
            }
        }
        this.state.mode = newMode;
    }
}

StudioCeCanvas.template = "web_studio_ce.StudioCeCanvas";
StudioCeCanvas.components = { View };
StudioCeCanvas.props = {
    model: String,
    view: { type: true, optional: true },
    views: Array,
    fields: Array,
    selectedField: { type: true, optional: true },
    onSelectField: Function,
    onToggleVisibility: Function,
    onInsertField: Function,
    onInsertNewField: Function,
    onInsertNewGroup: Function,
    onMoveNode: Function,
    onDeleteNode: Function,
    onOverrideProperty: Function,
    onRegister: Function,
    onViewChange: Function,
};

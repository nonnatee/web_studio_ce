/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class PropertiesBuilder extends Component {
    setup() {
        this.state = useState({
            schema: [],
            selectedProperty: null,
            loading: true,
            newSelKey: "",
            newSelVal: "",
        });

        onWillStart(async () => {
            await this.loadSchema();
        });

        onWillUpdateProps(async (nextProps) => {
            if (nextProps.fieldName !== this.props.fieldName || nextProps.modelName !== this.props.modelName) {
                await this.loadSchema(nextProps.modelName, nextProps.fieldName);
            }
        });
    }

    async loadSchema(model = this.props.modelName, field = this.props.fieldName) {
        this.state.loading = true;
        try {
            const data = await rpc("/web_studio_ce/get_properties_schema", {
                model_name: model,
                field_name: field,
            });
            if (data && !data.error) {
                this.state.schema = data.schema;
            }
        } catch (error) {
            console.error("Failed to load properties schema", error);
        } finally {
            this.state.loading = false;
        }
    }

    async saveSchema() {
        try {
            await rpc("/web_studio_ce/save_properties_schema", {
                model_name: this.props.modelName,
                field_name: this.props.fieldName,
                schema_json: this.state.schema,
            });
        } catch (error) {
            console.error("Failed to save properties schema", error);
        }
    }

    async addProperty() {
        const name = `p_${Date.now().toString().slice(-6)}`;
        const newProp = {
            name: name,
            string: "New Property",
            type: "char",
            selection: [],
            comodel: "",
        };
        this.state.schema.push(newProp);
        this.state.selectedProperty = newProp;
        await this.saveSchema();
    }

    async deleteProperty(name) {
        this.state.schema = this.state.schema.filter(p => p.name !== name);
        if (this.state.selectedProperty && this.state.selectedProperty.name === name) {
            this.state.selectedProperty = null;
        }
        await this.saveSchema();
    }

    async updatePropValue(name, key, value) {
        const prop = this.state.schema.find(p => p.name === name);
        if (prop) {
            prop[key] = value;
            await this.saveSchema();
        }
    }

    async reorder(index, direction) {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= this.state.schema.length) return;

        const temp = this.state.schema[index];
        this.state.schema[index] = this.state.schema[targetIndex];
        this.state.schema[targetIndex] = temp;
        await this.saveSchema();
    }

    selectProperty(prop) {
        this.state.selectedProperty = prop;
    }

    deselectProperty() {
        this.state.selectedProperty = null;
    }

    async addSelectionOption(propName) {
        if (!this.state.newSelKey || !this.state.newSelVal) return;
        const prop = this.state.schema.find(p => p.name === propName);
        if (prop) {
            if (!prop.selection) prop.selection = [];
            prop.selection.push([this.state.newSelKey, this.state.newSelVal]);
            this.state.newSelKey = "";
            this.state.newSelVal = "";
            await this.saveSchema();
        }
    }

    async removeSelectionOption(propName, key) {
        const prop = this.state.schema.find(p => p.name === propName);
        if (prop && prop.selection) {
            prop.selection = prop.selection.filter(opt => opt[0] !== key);
            await this.saveSchema();
        }
    }
}

PropertiesBuilder.template = "web_studio_ce.PropertiesBuilder";
PropertiesBuilder.props = {
    fieldName: String,
    modelName: String,
};

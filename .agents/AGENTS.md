# Odoo 18.0 & 19.0 Studio CE Project Rules

## OWL 2 / component guidelines
1. **No `t-ref` on Custom Components**:
   - `t-ref` is no longer supported on custom components in OWL 2. Use a callback registration prop (e.g. `onRegister.bind="..."`) and invoke it inside the child component's `setup()` method passing the `this` reference.
2. **Prop Type Validation with `null`/`false` values**:
   - When a prop can be `null` or `false` (such as `selectedField`), set its validation type to `type: true` (or omit it) in `props` validation. Setting it to `type: Object` with `optional: true` will raise validation errors if `null` or `false` is explicitly passed.
3. **No Inline Arrow Functions in QWeb Component Attributes**:
   - Do not pass inline arrow functions (e.g., `onTabChange="(tab) => state.activeTab = tab"`) as custom component props inside XML templates. Pass bound class methods instead (e.g., `onTabChange.bind="onTabChange"`).

## Odoo View Layout guidelines
1. **Prioritize Base Views for Canvas layout**:
   - Standard Odoo models contain both base views (where `inherit_id` is False) and inherited views (which only contain XPath modification deltas). Prioritize base views when loading form layout structures.
2. **Combined View Architecture**:
   - Retrieve the compiled view layout including all active XPath inheritance deltas using Odoo's internal `_get_combined_arch()` method with a try/except fallback block targeting `view.arch`.

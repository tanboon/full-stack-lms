import React, { useState } from 'react';

// [6.5] Types matching the backend's /api/exam/schema response exactly
export interface SchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'object' | 'array';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string } | string>;
  conditionalOn?: { field: string; value: string };
  nestedFields?: SchemaField[];    // For type: "object"
  itemSchema?: { fields: SchemaField[] }; // For type: "array"
  minItems?: number;
  validation?: { min?: number; max?: number; minLength?: number };
}

export interface BackendSchema {
  title?: string;
  fields: SchemaField[];
}

// Legacy format support (for fallback)
export interface FormSchema {
  type: string;
  properties?: Record<string, any>;
}

interface Props {
  schema: BackendSchema | FormSchema;
  onSubmit: (data: any) => void;
}

function isBackendSchema(schema: any): schema is BackendSchema {
  return Array.isArray(schema?.fields);
}

// ─── Single field renderer ────────────────────────────────────────────────────
function FieldRenderer({
  field,
  path,
  formData,
  onChange,
  parentValues,
}: {
  field: SchemaField;
  path: string;
  formData: Record<string, any>;
  onChange: (path: string, value: any) => void;
  parentValues: Record<string, any>;
}) {
  // [6.5] Conditional rendering
  if (field.conditionalOn) {
    const condVal = parentValues[field.conditionalOn.field];
    if (condVal !== field.conditionalOn.value) return null;
  }

  const value = formData[field.key] ?? '';
  const baseInputClass =
    'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground';

  if (field.type === 'object' && field.nestedFields) {
    return (
      <div className="mb-5 p-5 border border-border/50 rounded-2xl bg-muted/30">
        <h3 className="text-sm font-semibold mb-4 text-primary flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-xs">N</span>
          {field.label}
        </h3>
        {field.nestedFields.map(nf => (
          <FieldRenderer
            key={nf.key}
            field={nf}
            path={`${path}.${nf.key}`}
            formData={formData[field.key] ?? {}}
            onChange={(p, v) => {
              const newNested = { ...(formData[field.key] ?? {}), [nf.key]: v };
              onChange(field.key, newNested);
            }}
            parentValues={formData[field.key] ?? {}}
          />
        ))}
      </div>
    );
  }

  if (field.type === 'array' && field.itemSchema) {
    const items: any[] = Array.isArray(formData[field.key]) ? formData[field.key] : [];
    const addItem = () => onChange(field.key, [...items, {}]);
    const removeItem = (idx: number) => onChange(field.key, items.filter((_, i) => i !== idx));
    const updateItem = (idx: number, key: string, val: any) => {
      const updated = items.map((item, i) => i === idx ? { ...item, [key]: val } : item);
      onChange(field.key, updated);
    };

    return (
      <div className="mb-5">
        <label className="block text-sm font-medium mb-2 text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        {items.map((item, idx) => (
          <div key={idx} className="mb-4 p-4 border border-border rounded-2xl bg-card relative shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Question {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-xs text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
            {field.itemSchema!.fields.map(subField => (
              <FieldRenderer
                key={subField.key}
                field={subField}
                path={`${path}[${idx}].${subField.key}`}
                formData={item}
                onChange={(_, v) => updateItem(idx, subField.key, v)}
                parentValues={item}
              />
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="w-full py-2.5 border-2 border-dashed border-primary/40 text-primary text-sm font-medium rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
        >
          + Add Question
        </button>
        {field.minItems && items.length === 0 && (
          <p className="text-xs text-destructive mt-1">At least {field.minItems} question required</p>
        )}
      </div>
    );
  }

  switch (field.type) {
    case 'select': {
      const opts = field.options ?? [];
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5 text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <select
            value={value}
            onChange={e => onChange(field.key, e.target.value)}
            required={field.required}
            className={baseInputClass}
          >
            <option value="">{field.placeholder ?? 'Select...'}</option>
            {opts.map((opt: any) =>
              typeof opt === 'string'
                ? <option key={opt} value={opt}>{opt}</option>
                : <option key={opt.value} value={opt.value}>{opt.label}</option>
            )}
          </select>
        </div>
      );
    }
    case 'boolean':
      return (
        <div className="mb-4 flex items-center gap-3 p-3 border border-border/50 rounded-xl bg-muted/20">
          <input
            type="checkbox"
            id={path}
            checked={!!value}
            onChange={e => onChange(field.key, e.target.checked)}
            className="w-4 h-4 rounded text-primary border-border bg-background"
          />
          <label htmlFor={path} className="text-sm font-medium text-foreground cursor-pointer">{field.label}</label>
        </div>
      );
    case 'textarea':
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5 text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <textarea
            value={value}
            onChange={e => onChange(field.key, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            rows={3}
            className={`${baseInputClass} resize-none`}
          />
        </div>
      );
    case 'number':
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5 text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <input
            type="number"
            value={value}
            onChange={e => onChange(field.key, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClass}
          />
        </div>
      );
    default: // text
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5 text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <input
            type="text"
            value={value}
            onChange={e => onChange(field.key, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            minLength={field.validation?.minLength}
            className={baseInputClass}
          />
        </div>
      );
  }
}

// ─── Main DynamicFormEngine ───────────────────────────────────────────────────
export function DynamicFormEngine({ schema, onSubmit }: Props) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Backend schema (fields array format)
  if (isBackendSchema(schema)) {
    return (
      <form
        onSubmit={e => { e.preventDefault(); onSubmit(formData); }}
        className="space-y-1"
      >
        {schema.fields.map(field => (
          <FieldRenderer
            key={field.key}
            field={field}
            path={field.key}
            formData={formData}
            onChange={handleChange}
            parentValues={formData}
          />
        ))}
        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0 mt-4"
        >
          Create Exam
        </button>
      </form>
    );
  }

  // Legacy fallback (properties object format)
  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(formData); }}
      className="space-y-2"
    >
      {schema.properties &&
        Object.entries(schema.properties).map(([key, field]: [string, any]) => (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium mb-1.5">{field.label || key}</label>
            <input
              type={field.type === 'boolean' ? 'checkbox' : 'text'}
              onChange={e => handleChange(key, field.type === 'boolean' ? e.target.checked : e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none"
            />
          </div>
        ))}
      <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl mt-4">
        Submit
      </button>
    </form>
  );
}

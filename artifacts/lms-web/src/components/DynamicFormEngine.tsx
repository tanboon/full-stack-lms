import React, { useState } from 'react';

export interface FormSchema {
  type: string;
  properties?: Record<string, FormField>;
}

export interface FormField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  label?: string;
  required?: boolean;
  options?: string[];
  properties?: Record<string, FormField>; // For nested objects
  items?: FormField; // For arrays
  condition?: { field: string; value: any }; // [6.5] Conditional rendering
}

interface Props {
  schema: FormSchema;
  onSubmit: (data: any) => void;
}

// [6.5] Dynamic Form Engine processing JSON Schema
export function DynamicFormEngine({ schema, onSubmit }: Props) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleChange = (path: string, value: any) => {
    // Immutable nested state update (simplified for paths like "level1.level2")
    const keys = path.split('.');
    setFormData(prev => {
      const newState = { ...prev };
      let current = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] || {}) };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newState;
    });
  };

  const getValue = (path: string) => {
    return path.split('.').reduce((obj, key) => (obj && obj[key] !== 'undefined') ? obj[key] : undefined, formData);
  };

  const renderField = (key: string, field: FormField, path: string) => {
    // [6.5] Conditional rendering check
    if (field.condition) {
      const condValue = getValue(field.condition.field);
      if (condValue !== field.condition.value) return null;
    }

    const value = getValue(path) || '';

    switch (field.type) {
      case 'string':
        if (field.options) {
          return (
            <div key={path} className="mb-4">
              <label className="block text-sm font-medium mb-1.5 text-foreground">{field.label || key}</label>
              <select 
                value={value}
                onChange={(e) => handleChange(path, e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required={field.required}
              >
                <option value="">Select option...</option>
                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          );
        }
        return (
          <div key={path} className="mb-4">
            <label className="block text-sm font-medium mb-1.5 text-foreground">{field.label || key}</label>
            <input 
              type="text" 
              value={value}
              onChange={(e) => handleChange(path, e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              required={field.required}
              placeholder={`Enter ${field.label || key}...`}
            />
          </div>
        );
      case 'boolean':
        return (
          <div key={path} className="mb-4 flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={!!value}
              onChange={(e) => handleChange(path, e.target.checked)}
              className="w-5 h-5 rounded text-primary border-border focus:ring-primary/20 bg-background"
            />
            <label className="text-sm font-medium text-foreground">{field.label || key}</label>
          </div>
        );
      case 'object':
        return (
          <div key={path} className="mb-6 p-5 border border-border/50 rounded-2xl bg-card shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-primary">{field.label || key}</h3>
            {Object.entries(field.properties || {}).map(([subKey, subField]) => 
              renderField(subKey, subField, `${path}.${subKey}`)
            )}
          </div>
        );
      default:
        return <div key={path} className="text-red-500 text-sm">Unsupported type: {field.type}</div>;
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-2">
      {schema.type === 'object' && schema.properties && 
        Object.entries(schema.properties).map(([key, field]) => renderField(key, field, key))
      }
      <button 
        type="submit"
        className="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0 mt-6"
      >
        Submit Exam Configuration
      </button>
    </form>
  );
}

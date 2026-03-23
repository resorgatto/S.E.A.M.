import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Cpu, Hash, MessageSquare, Users, Mail, CheckSquare, Layout, FileText } from 'lucide-react';
import styles from './ActionConfigModal.module.css';

interface ActionConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: any) => void;
    action: any;
}

interface KeyValue {
    id: string;
    key: string;
    value: string;
}

export function ActionConfigModal({ isOpen, onClose, onSave, action }: ActionConfigModalProps) {
    const [mode, setMode] = useState<string>('custom');
    
    // Base Fields
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [method, setMethod] = useState('POST');
    
    // Common App Fields
    const [message, setMessage] = useState('');
    
    // Email Fields
    const [emailTo, setEmailTo] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    
    // ClickUp / Trello
    const [listId, setListId] = useState('');
    const [taskName, setTaskName] = useState('');
    const [apiToken, setApiToken] = useState('');
    
    // Typeform
    const [formId, setFormId] = useState('');

    // Custom Fields
    const [headers, setHeaders] = useState<KeyValue[]>([]);
    const [bodyParams, setBodyParams] = useState<KeyValue[]>([]);
    
    const [error, setError] = useState('');

    // Pre-populate logic parsing
    useEffect(() => {
        if (action && isOpen) {
            setName(action.name || '');
            setUrl(action.url || '');
            setMethod(action.http_method || 'POST');
            
            // Extract appType from headers (our persistent UI trick)
            const appType = (action.headers || {})['X-SEAM-App-Type'] || 'custom';
            setMode(appType);
            
            const bodyTemp = action.body_template || {};
            const headTemp = action.headers || {};
            
            if (appType === 'slack') {
                setMessage(bodyTemp.text || '');
            } else if (appType === 'discord') {
                setMessage(bodyTemp.content || '');
            } else if (appType === 'teams') {
                setMessage(bodyTemp.text || '');
            } else if (appType === 'email') {
                setEmailTo(bodyTemp.to || '');
                setEmailSubject(bodyTemp.subject || '');
                setMessage(bodyTemp.text || '');
            } else if (appType === 'clickup') {
                setListId(bodyTemp.list_id || '');
                setTaskName(bodyTemp.name || '');
                setMessage(bodyTemp.description || '');
                setApiToken(headTemp.Authorization || '');
            } else if (appType === 'trello') {
                setListId(bodyTemp.idList || '');
                setTaskName(bodyTemp.name || '');
                setMessage(bodyTemp.desc || '');
                setApiToken(bodyTemp.token || '');
            } else if (appType === 'typeform') {
                setFormId(bodyTemp.form_id || '');
                setApiToken(headTemp.Authorization || '');
            } else {
                // Custom Mode parsing
                const hList = Object.entries(action.headers || {})
                    .filter(([k]) => k !== 'X-SEAM-App-Type')
                    .map(([k, v]) => ({ id: Math.random().toString(), key: k, value: String(v) }));
                setHeaders(hList.length > 0 ? hList : [{ id: Math.random().toString(), key: '', value: '' }]);

                const bList = Object.entries(action.body_template || {}).map(([k, v]) => ({ id: Math.random().toString(), key: k, value: String(v) }));
                setBodyParams(bList.length > 0 ? bList : [{ id: Math.random().toString(), key: '', value: '' }]);
            }
            
            setError('');
        }
    }, [action, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        let finalMethod = 'POST';
        let finalHeaders: Record<string, string> = { "X-SEAM-App-Type": mode };
        let finalBody: Record<string, any> = {};

        if (mode === 'slack') {
            if (!url) { setError('Webhook URL is required'); return; }
            finalBody = { text: message };
            finalHeaders["Content-Type"] = "application/json";
        } else if (mode === 'discord') {
            if (!url) { setError('Webhook URL is required'); return; }
            finalBody = { content: message };
            finalHeaders["Content-Type"] = "application/json";
        } else if (mode === 'teams') {
            if (!url) { setError('Webhook URL is required'); return; }
            finalBody = { text: message };
            finalHeaders["Content-Type"] = "application/json";
        } else if (mode === 'email') {
            if (!url) { setError('SMTP/Email Endpoint URL is required'); return; }
            finalBody = { to: emailTo, subject: emailSubject, text: message };
            finalHeaders["Content-Type"] = "application/json";
        } else if (mode === 'clickup') {
            if (!listId || !apiToken) { setError('List ID and API Token are required'); return; }
            finalBody = { name: taskName, description: message, list_id: listId };
            finalHeaders["Authorization"] = apiToken;
            finalHeaders["Content-Type"] = "application/json";
        } else if (mode === 'trello') {
            if (!listId || !apiToken) { setError('List ID and API Token are required'); return; }
            finalBody = { name: taskName, desc: message, idList: listId, token: apiToken };
            finalHeaders["Content-Type"] = "application/json";
        } else if (mode === 'typeform') {
            if (!formId || !apiToken) { setError('Form ID and API Token are required'); return; }
            finalMethod = 'GET';
            finalBody = { form_id: formId };
            finalHeaders["Authorization"] = apiToken;
        } else {
            // Custom Mode Parsing
            if (!url) { setError('Endpoint URL is required'); return; }
            finalMethod = method;
            headers.forEach(h => {
                if (h.key.trim()) finalHeaders[h.key.trim()] = h.value;
            });
            bodyParams.forEach(b => {
                if (b.key.trim()) finalBody[b.key.trim()] = b.value;
            });
        }

        setError('');
        onSave({
            name,
            http_method: finalMethod,
            url: mode === 'clickup' ? `https://api.clickup.com/api/v2/list/${listId}/task` : 
                 mode === 'trello' ? `https://api.trello.com/1/cards` : 
                 mode === 'typeform' ? `https://api.typeform.com/forms/${formId}/responses` : url,
            headers: finalHeaders,
            body_template: finalBody,
        });
    };

    const insertVariable = (variable: string, setter: any) => {
        setter((prev: string) => `${prev} ${variable} `);
    };

    const renderAppIcon = () => {
        switch(mode) {
            case 'slack': return <Hash size={24} className={styles.appIconTitle} />;
            case 'discord': return <MessageSquare size={24} className={styles.appIconTitle} />;
            case 'teams': return <Users size={24} className={styles.appIconTitle} />;
            case 'email': return <Mail size={24} className={styles.appIconTitle} />;
            case 'clickup': return <CheckSquare size={24} className={styles.appIconTitle} />;
            case 'trello': return <Layout size={24} className={styles.appIconTitle} />;
            case 'typeform': return <FileText size={24} className={styles.appIconTitle} />;
            default: return <Cpu size={24} className={styles.appIconTitle} />;
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.titleWrapper}>
                        {renderAppIcon()}
                        <h2 className={styles.title}>
                            Configure {mode.charAt(0).toUpperCase() + mode.slice(1)} Action
                        </h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <div className={styles.body}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.configArea}>
                        {/* Generic Setup */}
                        <div className={styles.fieldGroup}>
                            <label>Action Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={styles.input}
                                placeholder="e.g. Alert Team"
                            />
                        </div>

                        {/* Custom API exclusive Setup */}
                        {mode === 'custom' && (
                            <>
                                <div className={styles.fieldGroup}>
                                    <label>HTTP Method</label>
                                    <select value={method} onChange={(e) => setMethod(e.target.value)} className={styles.input}>
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="PATCH">PATCH</option>
                                        <option value="DELETE">DELETE</option>
                                    </select>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Endpoint URL *</label>
                                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={styles.input} placeholder="https://..." />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Request Headers</label>
                                    <KeyValueBuilder items={headers} setItems={setHeaders} placeholderKey="Authorization" placeholderValue="Bearer ..." />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>JSON Body Payload Details</label>
                                    <KeyValueBuilder items={bodyParams} setItems={setBodyParams} placeholderKey="email" placeholderValue="{{ trigger.payload.email }}" />
                                </div>
                            </>
                        )}

                        {/* Chat Webhooks */}
                        {(mode === 'slack' || mode === 'discord' || mode === 'teams') && (
                            <>
                                <div className={styles.fieldGroup}>
                                    <label>Webhook URL *</label>
                                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={styles.input} placeholder="https://..." />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Notification Message</label>
                                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} className={styles.textarea} rows={4} />
                                    <div className={styles.variablesList}>
                                        <span className={styles.varHelper}>Insert Variable:</span>
                                        <button className={styles.varPill} onClick={() => insertVariable('{{ trigger.payload.id }}', setMessage)}>User ID</button>
                                        <button className={styles.varPill} onClick={() => insertVariable('{{ trigger.payload.email }}', setMessage)}>Email</button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Email */}
                        {mode === 'email' && (
                            <>
                                <div className={styles.fieldGroup}>
                                    <label>SMTP/API Endpoint URL *</label>
                                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={styles.input} placeholder="https://api.resend.com/emails" />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>To Email</label>
                                    <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Subject</label>
                                    <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Body Text</label>
                                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} className={styles.textarea} rows={4} />
                                    <div className={styles.variablesList}>
                                        <span className={styles.varHelper}>Insert Variable:</span>
                                        <button className={styles.varPill} onClick={() => insertVariable('{{ trigger.payload.name }}', setMessage)}>User Name</button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ClickUp / Trello */}
                        {(mode === 'clickup' || mode === 'trello') && (
                            <>
                                <div className={styles.fieldGroup}>
                                    <label>API Token *</label>
                                    <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>List ID *</label>
                                    <input type="text" value={listId} onChange={(e) => setListId(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Task Name</label>
                                    <input type="text" value={taskName} onChange={(e) => setTaskName(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Task Description</label>
                                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} className={styles.textarea} rows={4} />
                                </div>
                            </>
                        )}
                        
                        {/* Typeform */}
                        {mode === 'typeform' && (
                            <>
                                <div className={styles.fieldGroup}>
                                    <label>API Token *</label>
                                    <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label>Form ID *</label>
                                    <input type="text" value={formId} onChange={(e) => setFormId(e.target.value)} className={styles.input} />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                    <button className={styles.saveBtn} onClick={handleSave}>Save Configuration</button>
                </div>
            </div>
        </div>
    );
}

function KeyValueBuilder({ items, setItems, placeholderKey, placeholderValue }: any) {
    const updateItem = (id: string, field: 'key' | 'value', val: string) => {
        setItems(items.map((i: any) => i.id === id ? { ...i, [field]: val } : i));
    };
    const removeItem = (id: string) => setItems(items.filter((i: any) => i.id !== id));
    const addItem = () => setItems([...items, { id: Math.random().toString(), key: '', value: '' }]);

    return (
        <div className={styles.kvBuilder}>
            {items.map((item: any) => (
                <div key={item.id} className={styles.kvRow}>
                    <input 
                        type="text" 
                        value={item.key} 
                        onChange={(e) => updateItem(item.id, 'key', e.target.value)} 
                        className={styles.kvInput} 
                        placeholder={placeholderKey}
                    />
                    <span className={styles.kvSeparator}>:</span>
                    <input 
                        type="text" 
                        value={item.value} 
                        onChange={(e) => updateItem(item.id, 'value', e.target.value)} 
                        className={styles.kvInput} 
                        placeholder={placeholderValue}
                    />
                    <button className={styles.kvDeleteBtn} onClick={() => removeItem(item.id)} title="Remove"><Trash2 size={16}/></button>
                </div>
            ))}
            <button className={styles.kvAddBtn} onClick={addItem}>
                <Plus size={14} /> Add Field
            </button>
        </div>
    );
}

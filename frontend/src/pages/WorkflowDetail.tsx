import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Webhook, ArrowDown, Plus, Play, Pause, Trash2, Settings2, Save,
    Hash, MessageSquare, Users, Mail, CheckSquare, Layout, FileText, Cpu
} from 'lucide-react';
import { api } from '../lib/api';
import { ActionConfigModal } from '../components/ActionConfigModal';
import { AppSelectorModal } from '../components/AppSelectorModal';
import styles from './WorkflowDetail.module.css';

interface ActionConfig {
    [key: string]: any;
}
interface WorkflowAction {
    id: string;
    type: string;
    name: string;
    config: ActionConfig;
}

export function WorkflowDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: workflow } = useQuery({
        queryKey: ['workflow', id],
        queryFn: async () => {
            const res = await api.get(`/workflows/${id}`);
            return res.data;
        },
        enabled: !!id,
    });

    const [isActive, setIsActive] = useState(true);
    const [actions, setActions] = useState<WorkflowAction[]>([]);
    
    // Modal state
    const [isAppSelectorOpen, setIsAppSelectorOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingAction, setEditingAction] = useState<WorkflowAction | null>(null);

    const queryClient = useQueryClient();

    useEffect(() => {
        if (workflow) {
            setIsActive(workflow.status === 'active');
            if (workflow.actions && workflow.actions.length > 0) {
                setActions(workflow.actions.map((a: any) => ({
                    id: a.id,
                    type: 'http',
                    name: a.name,
                    config: {
                        http_method: a.http_method,
                        url: a.url,
                        headers: a.headers,
                        body_template: a.body_template,
                    }
                })));
            } else {
                setActions([]);
            }
        }
    }, [workflow]);

    const addMutation = useMutation({
        mutationFn: async ({ appType, defaultName }: { appType: string, defaultName: string }) => {
            const res = await api.post(`/workflows/${id}/actions`, {
                name: defaultName,
                order: actions.length + 1,
                http_method: 'POST',
                url: 'https://',
                headers: { "X-SEAM-App-Type": appType },
                body_template: {}
            });
            return res.data;
        },
        onSuccess: (newAction) => {
            queryClient.invalidateQueries({ queryKey: ['workflow', id] });
            setIsAppSelectorOpen(false);
            
            // Immediately open the config modal for this new action
            setEditingAction({
                id: newAction.id,
                type: 'http',
                name: newAction.name,
                config: {
                    http_method: newAction.http_method,
                    url: newAction.url,
                    headers: newAction.headers,
                    body_template: newAction.body_template,
                }
            });
            setIsActionModalOpen(true);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ actionId, payload }: { actionId: string, payload: any }) => {
            const res = await api.patch(`/workflows/${id}/actions/${actionId}`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow', id] });
            setIsActionModalOpen(false);
        }
    });

    const removeMutation = useMutation({
        mutationFn: async (actionId: string) => {
            await api.delete(`/workflows/${id}/actions/${actionId}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow', id] })
    });

    const triggerAddAction = () => {
        setIsAppSelectorOpen(true);
    };

    const handleCreateAction = (appType: string, defaultName: string) => {
        addMutation.mutate({ appType, defaultName });
    };

    const removeAction = (actionId: string) => {
        if (confirm('Are you sure you want to delete this action?')) {
            removeMutation.mutate(actionId);
        }
    };

    const openActionConfig = (action: WorkflowAction) => {
        setEditingAction(action);
        setIsActionModalOpen(true);
    };

    const handleSaveAction = (payload: any) => {
        if (editingAction) {
            updateMutation.mutate({ actionId: editingAction.id, payload });
        }
    };

    const renderActionIcon = (action: WorkflowAction) => {
        const appType = action.config?.headers?.['X-SEAM-App-Type'] || 'custom';
        switch (appType) {
            case 'slack': return <Hash size={18} />;
            case 'discord': return <MessageSquare size={18} />;
            case 'teams': return <Users size={18} />;
            case 'email': return <Mail size={18} />;
            case 'clickup': return <CheckSquare size={18} />;
            case 'trello': return <Layout size={18} />;
            case 'typeform': return <FileText size={18} />;
            default: return <Cpu size={18} />;
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backButton} onClick={() => navigate('/workflows')}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className={styles.title}>{workflow?.name || 'Loading...'}</h1>
                        <p className={styles.subtitle}>ID: {id || 'wf_123456789'} • Created {workflow ? new Date(workflow.created_at).toLocaleDateString() : ''}</p>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <button
                        className={`${styles.statusToggle} ${isActive ? styles.statusActive : ''}`}
                        onClick={() => setIsActive(!isActive)}
                    >
                        {isActive ? <><Pause size={16} /> Pause Workflow</> : <><Play size={16} /> Activate Workflow</>}
                    </button>
                    <button className={styles.primaryButton}>
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </header>

            {/* Main Pipeline Interface */}
            <div className={styles.pipelineArea}>

                {/* Trigger Node */}
                <div className={styles.nodeWrapper}>
                    <div className={styles.triggerNode}>
                        <div className={styles.nodeHeader}>
                            <div className={styles.nodeIconWrap} data-type="webhook">
                                <Webhook size={18} />
                            </div>
                            <div className={styles.nodeInfo}>
                                <span className={styles.nodeType}>Trigger</span>
                                <span className={styles.nodeTitle}>Webhook Event</span>
                            </div>
                            <button className={styles.nodeSettingsBtn}><Settings2 size={16} /></button>
                        </div>

                        <div className={styles.nodeBody}>
                            <div className={styles.inputGroup}>
                                <label>Webhook URL (POST)</label>
                                <div className={styles.copyContainer}>
                                    <code className={styles.urlDisplay}>https://api.seam.com/webhooks/{workflow?.trigger?.webhook_path || id}</code>
                                    <button className={styles.copyBtn}>Copy</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Nodes */}
                {actions.map((action: any, index: number) => (
                    <div key={action.id} className={styles.nodeWrapper}>
                        <div className={styles.connectionLine}>
                            <ArrowDown size={14} className={styles.connectionArrow} />
                        </div>

                        <div className={styles.actionNode}>
                            <div className={styles.nodeHeader}>
                                <div className={styles.nodeIconWrap} data-type="action">
                                    {renderActionIcon(action)}
                                </div>
                                <div className={styles.nodeInfo}>
                                    <span className={styles.nodeType}>Action {index + 1}</span>
                                    <span className={styles.nodeTitle}>{action.name}</span>
                                </div>
                                <div className={styles.nodeActions}>
                                    <button className={styles.nodeSettingsBtn} onClick={() => openActionConfig(action)}>
                                        <Settings2 size={16} />
                                    </button>
                                    <button className={styles.nodeDeleteBtn} onClick={() => removeAction(action.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.nodeBody}>
                                <button className={styles.secondaryButton} onClick={() => openActionConfig(action)}>
                                    Configure Action...
                                </button>
                                {action.config?.url && (
                                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        {action.config.http_method} {action.config.url}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add Node Button */}
                <div className={styles.nodeWrapper}>
                    <div className={styles.connectionLine}></div>
                    <button className={styles.addNodeBtn} onClick={triggerAddAction} disabled={addMutation.isPending}>
                        <Plus size={16} />
                        {addMutation.isPending ? 'Adding Action...' : 'Add Action'}
                    </button>
                </div>

            </div>

            <AppSelectorModal
                isOpen={isAppSelectorOpen}
                onClose={() => setIsAppSelectorOpen(false)}
                onSelect={handleCreateAction}
            />

            <ActionConfigModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                onSave={handleSaveAction}
                action={editingAction ? {
                    id: editingAction.id,
                    name: editingAction.name,
                    ...editingAction.config
                } : null}
            />
        </div>
    );
}

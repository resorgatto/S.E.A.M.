import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Webhook, ArrowDown, Plus, Play, Pause, Trash2, Settings2, Save
} from 'lucide-react';
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

    // Mock initial state
    const [isActive, setIsActive] = useState(true);
    const [actions, setActions] = useState<WorkflowAction[]>([
        { id: '1', type: 'slack', name: 'Send Slack Message', config: { internal: true } }
    ]);

    const addAction = () => {
        setActions([...actions, { id: Math.random().toString(), type: 'http', name: 'HTTP Request', config: {} }]);
    };

    const removeAction = (actionId: string) => {
        setActions(actions.filter(a => a.id !== actionId));
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
                        <h1 className={styles.title}>Stripe to Slack</h1>
                        <p className={styles.subtitle}>ID: {id || 'wf_123456789'} • Created Jan 15, 2024</p>
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
                                    <code className={styles.urlDisplay}>https://api.seam.com/webhooks/{id}</code>
                                    <button className={styles.copyBtn}>Copy</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Nodes */}
                {actions.map((action, index) => (
                    <div key={action.id} className={styles.nodeWrapper}>
                        <div className={styles.connectionLine}>
                            <ArrowDown size={14} className={styles.connectionArrow} />
                        </div>

                        <div className={styles.actionNode}>
                            <div className={styles.nodeHeader}>
                                <div className={styles.nodeIconWrap} data-type="action">
                                    <Play size={18} />
                                </div>
                                <div className={styles.nodeInfo}>
                                    <span className={styles.nodeType}>Action {index + 1}</span>
                                    <span className={styles.nodeTitle}>{action.name}</span>
                                </div>
                                <div className={styles.nodeActions}>
                                    <button className={styles.nodeSettingsBtn}><Settings2 size={16} /></button>
                                    <button className={styles.nodeDeleteBtn} onClick={() => removeAction(action.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.nodeBody}>
                                <button className={styles.secondaryButton}>Configure Action...</button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add Node Button */}
                <div className={styles.nodeWrapper}>
                    <div className={styles.connectionLine}></div>
                    <button className={styles.addNodeBtn} onClick={addAction}>
                        <Plus size={16} />
                        Add Action
                    </button>
                </div>

            </div>
        </div>
    );
}

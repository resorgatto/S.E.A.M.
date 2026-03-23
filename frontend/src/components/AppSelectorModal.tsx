import { X, Hash, MessageSquare, Users, Mail, CheckSquare, Layout, FileText, Cpu } from 'lucide-react';
import styles from './AppSelectorModal.module.css';

interface AppSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (appType: string, defaultName: string) => void;
}

export function AppSelectorModal({ isOpen, onClose, onSelect }: AppSelectorModalProps) {
    if (!isOpen) return null;

    const apps = [
        { id: 'slack', name: 'Slack', description: 'Send a message to a channel', icon: <Hash size={24} /> },
        { id: 'discord', name: 'Discord', description: 'Send a message via Webhook', icon: <MessageSquare size={24} /> },
        { id: 'teams', name: 'Microsoft Teams', description: 'Post a card to a channel', icon: <Users size={24} /> },
        { id: 'email', name: 'Send Email', description: 'Send via SMTP / Provider', icon: <Mail size={24} /> },
        { id: 'clickup', name: 'ClickUp', description: 'Create a task or subtask', icon: <CheckSquare size={24} /> },
        { id: 'trello', name: 'Trello', description: 'Create a card in a list', icon: <Layout size={24} /> },
        { id: 'typeform', name: 'Typeform', description: 'Fetch form responses', icon: <FileText size={24} /> },
        { id: 'custom', name: 'Custom API', description: 'Make an advanced HTTP request', icon: <Cpu size={24} /> },
    ];

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Choose an Action</h2>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className={styles.searchBar}>
                    <input type="text" placeholder="Search apps (e.g., Slack, Email)..." className={styles.searchInput} disabled />
                </div>

                <div className={styles.body}>
                    <div className={styles.grid}>
                        {apps.map(app => (
                            <button 
                                key={app.id} 
                                className={styles.appCard} 
                                onClick={() => onSelect(app.id, `Send to ${app.name}`)}
                            >
                                <div className={styles.iconWrap}>{app.icon}</div>
                                <div className={styles.appInfo}>
                                    <span className={styles.appName}>{app.name}</span>
                                    <span className={styles.appDesc}>{app.description}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

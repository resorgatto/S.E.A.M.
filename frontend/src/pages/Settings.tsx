import { useState } from 'react';
import { Key, Users, Settings2, Shield } from 'lucide-react';
import styles from './Settings.module.css';

const tabs = [
    { id: 'general', name: 'General', icon: Settings2 },
    { id: 'apikeys', name: 'API Keys', icon: Key },
    { id: 'credentials', name: 'Credentials', icon: Shield },
    { id: 'members', name: 'Members', icon: Users },
];

export function Settings() {
    const [activeTab, setActiveTab] = useState('apikeys');

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Settings</h1>
                    <p className={styles.subtitle}>Manage your workspace preferences, api keys, and team members.</p>
                </div>
            </header>

            <div className={styles.layout}>
                {/* Sidebar Tabs */}
                <aside className={styles.sidebar}>
                    <nav className={styles.nav}>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <Icon size={18} />
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className={styles.content}>

                    {activeTab === 'general' && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Workspace General Settings</h2>
                            <div className={styles.card}>
                                <div className={styles.inputGroup}>
                                    <label>Workspace Name</label>
                                    <input type="text" defaultValue="Personal" className={styles.input} />
                                </div>
                                <div className={styles.actionRow}>
                                    <button className={styles.primaryButton}>Save Changes</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'apikeys' && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>API Keys</h2>
                                <button className={styles.primaryButton}>Generate New Key</button>
                            </div>
                            <p className={styles.sectionDesc}>Use these keys to authenticate API requests to S.E.A.M. from your own backend.</p>

                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Token Prefix</th>
                                            <th>Created At</th>
                                            <th>Last Used</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className={styles.cellBold}>Production Key</td>
                                            <td className={styles.cellMuted}>pk_live_***</td>
                                            <td className={styles.cellMuted}>Jan 10, 2024</td>
                                            <td className={styles.cellMuted}>2 mins ago</td>
                                            <td><button className={styles.dangerButtonGhost}>Revoke</button></td>
                                        </tr>
                                        <tr>
                                            <td className={styles.cellBold}>Dev Local</td>
                                            <td className={styles.cellMuted}>pk_test_***</td>
                                            <td className={styles.cellMuted}>Feb 05, 2024</td>
                                            <td className={styles.cellMuted}>Never</td>
                                            <td><button className={styles.dangerButtonGhost}>Revoke</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'credentials' && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>Credentials & Secrets</h2>
                                <button className={styles.primaryButton}>Add Credential</button>
                            </div>
                            <p className={styles.sectionDesc}>Store encrypted API keys or tokens for external services (Stripe, Slack, Salesforce, etc.) to use within actions.</p>

                            <div className={styles.emptyState}>
                                <Shield size={32} className={styles.emptyIcon} />
                                <h3>No credentials added</h3>
                                <p>Securely add a credential to use in your workflow actions.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>Workspace Members</h2>
                                <button className={styles.primaryButton}>Invite Member</button>
                            </div>
                            <p className={styles.sectionDesc}>Manage who has access to this workspace and their permission levels.</p>

                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Role</th>
                                            <th>Joined</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className={styles.cellUser}>
                                                <div className={styles.avatar}>A</div>
                                                <div>
                                                    <div className={styles.cellBold}>Admin User</div>
                                                    <div className={styles.cellMuted}>admin@example.com</div>
                                                </div>
                                            </td>
                                            <td><span className={styles.badge}>Owner</span></td>
                                            <td className={styles.cellMuted}>Oct 20, 2023</td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}

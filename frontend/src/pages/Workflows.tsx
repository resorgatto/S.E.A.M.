import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, LayoutGrid, List, Search, MoreHorizontal, Activity, ArrowRight } from 'lucide-react';
import styles from './Workflows.module.css';

interface Workflow {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'draft' | 'paused';
    created_at: string;
}

export function Workflows() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
        queryKey: ['workflows'],
        queryFn: async () => {
            // Return mock array until real workspace headers are cleanly hooked globally
            return [
                { id: '1', name: 'Stripe to Slack', description: 'Notifies#general when a new subscription is created', status: 'active', created_at: new Date().toISOString() },
                { id: '2', name: 'Jira to Linear Sync', description: 'Creates Linear issues from Jira bug tickets', status: 'paused', created_at: new Date().toISOString() },
                { id: '3', name: 'Form Submit to HubSpot', description: 'Syncs contact leads', status: 'active', created_at: new Date().toISOString() },
            ];
        },
    });

    const filteredWorkflows = workflows.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Workflows</h1>
                    <p className={styles.subtitle}>Create and manage your webhook integration pipelines.</p>
                </div>
                <button className={styles.primaryButton} onClick={() => navigate('/workflows/new')}>
                    <Plus size={16} />
                    <span>New Workflow</span>
                </button>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search workflows..."
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.viewToggle}>
                    <button
                        className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.toggleActive : ''}`}
                        onClick={() => setViewMode('table')}
                        aria-label="Table view"
                    >
                        <List size={16} />
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleActive : ''}`}
                        onClick={() => setViewMode('grid')}
                        aria-label="Grid view"
                    >
                        <LayoutGrid size={16} />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className={styles.emptyState}>Loading workflows...</div>
            ) : filteredWorkflows.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}><Activity size={32} /></div>
                    <h3>No workflows found</h3>
                    <p>Get started by creating your first integration pipeline.</p>
                    <button className={styles.secondaryButton} onClick={() => navigate('/workflows/new')}>Create Workflow</button>
                </div>
            ) : viewMode === 'table' ? (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th aria-label="Actions"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWorkflows.map(w => (
                                <tr key={w.id} onClick={() => navigate(`/workflows/${w.id}`)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div className={styles.rowTitle}>{w.name}</div>
                                        <div className={styles.rowDescription}>{w.description}</div>
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[`badge--${w.status}`]}`}>
                                            {w.status}
                                        </span>
                                    </td>
                                    <td className={styles.cellMuted}>
                                        {new Date(w.created_at).toLocaleDateString()}
                                    </td>
                                    <td className={styles.cellActions}>
                                        <button className={styles.iconButton}><MoreHorizontal size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={styles.gridWrapper}>
                    {filteredWorkflows.map(w => (
                        <div key={w.id} className={styles.gridCard} onClick={() => navigate(`/workflows/${w.id}`)}>
                            <div className={styles.cardHeader}>
                                <span className={`${styles.badge} ${styles[`badge--${w.status}`]}`}>
                                    {w.status}
                                </span>
                                <button className={styles.iconButton}><MoreHorizontal size={16} /></button>
                            </div>
                            <h3 className={styles.cardTitle}>{w.name}</h3>
                            <p className={styles.cardDescription}>{w.description}</p>

                            <div className={styles.cardFooter}>
                                <div className={styles.fakePipeline}>
                                    <div className={styles.node}>Webhook</div>
                                    <ArrowRight size={12} className={styles.nodeArrow} />
                                    <div className={styles.nodeAction}>Action</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

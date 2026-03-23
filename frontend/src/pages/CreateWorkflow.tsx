import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import styles from './CreateWorkflow.module.css';
export function CreateWorkflow() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    const createMutation = useMutation({
        mutationFn: async (data: { name: string; description: string }) => {
            return await api.post('/workflows/', data);
        },
        onSuccess: (res) => {
            navigate(`/workflows/${res.data.id}`);
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'Failed to create workflow.');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Workflow name is required.');
            return;
        }
        createMutation.mutate({ name, description });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate('/workflows')}>
                    <ArrowLeft size={16} />
                    <span>Back to Workflows</span>
                </button>
                <h1 className={styles.title}>Create New Workflow</h1>
                <p className={styles.subtitle}>Define a new integration pipeline. A webhook trigger will be generated automatically.</p>
            </header>

            <div className={styles.paper}>
                <div className={styles.stepperContainer}>
                    <div className={`${styles.step} ${styles.stepActive}`}>
                        <div className={styles.stepCircle}>1</div>
                        <div className={styles.stepText}>Basic Details</div>
                    </div>
                    <div className={styles.stepConnector}></div>
                    <div className={`${styles.step} ${styles.stepPending}`}>
                        <div className={styles.stepCircle}>2</div>
                        <div className={styles.stepText}>Configure Actions</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.errorAlert}>{error}</div>}

                    <div className={styles.inputGroup}>
                        <label htmlFor="wf-name">Workflow Name *</label>
                        <input
                            id="wf-name"
                            type="text"
                            placeholder="e.g., Stripe to Slack Notifications"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={createMutation.isPending}
                            autoFocus
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="wf-desc">Description (Optional)</label>
                        <textarea
                            id="wf-desc"
                            placeholder="What does this workflow do?"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={createMutation.isPending}
                        />
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => navigate('/workflows')}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.primaryButton}
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Continue to Actions'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

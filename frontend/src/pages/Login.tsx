import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';
import styles from './Auth.module.css';

export function Login() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Login to get token
            const res = await api.post('/auth/login', { email, password });
            const { access_token } = res.data;

            // 2. Fetch user profile (pass token explicitly since it's not in store yet)
            const userRes = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            // 3. Save to global store
            setAuth(userRes.data, access_token);

            // 4. Fetch workspaces to set the active one
            // Token is now in store, so interceptor will attach it
            const wsRes = await api.get('/workspaces/');
            if (wsRes.data && wsRes.data.length > 0) {
                useAuthStore.getState().setActiveWorkspace(wsRes.data[0].id);
            } else {
                const newWs = await api.post('/workspaces/', { name: 'Personal Workspace', description: 'Auto-generated workspace' });
                useAuthStore.getState().setActiveWorkspace(newWs.data.id);
            }

            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className={styles.header}>
                <h2>Welcome back</h2>
                <p>Enter your credentials to access your workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label htmlFor="email">Email address</label>
                    <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <div className={styles.labelRow}>
                        <label htmlFor="password">Password</label>
                        <a href="#" className={styles.forgotLink}>Forgot password?</a>
                    </div>
                    <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                </button>
            </form>

            <p className={styles.footerText}>
                Don't have an account? <Link to="/register">Sign up</Link>
            </p>
        </motion.div>
    );
}

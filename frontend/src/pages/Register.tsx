import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import styles from './Auth.module.css';

export function Register() {
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/auth/register', {
                full_name: fullName,
                username,
                email,
                password
            });
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'An error occurred during registration.');
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
                <h2>Create an account</h2>
                <p>Start your journey with S.E.A.M. today.</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label htmlFor="fullName">Full Name</label>
                    <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="johndoe"
                    />
                </div>

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
                    <label htmlFor="password">Password</label>
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
                    {loading ? 'Creating account...' : 'Create account'}
                </button>
            </form>

            <p className={styles.footerText}>
                Already have an account? <Link to="/login">Sign in</Link>
            </p>
        </motion.div>
    );
}

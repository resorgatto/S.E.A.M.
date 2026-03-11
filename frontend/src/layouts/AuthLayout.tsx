import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import styles from './AuthLayout.module.css';

export function AuthLayout() {
    return (
        <div className={styles.container}>
            <div className={styles.themeToggleWrapper}>
                <ThemeToggle />
            </div>
            <div className={styles.illustrationPanel}>
                <div className={styles.brandingCenter}>
                     <img src="/logo-dark.png" alt="SEAM Logo" className={styles.centeredLogo} />
                </div>
                <div className={styles.heroText}>
                    <h2>Event-driven automation.</h2>
                    <p>Synchronized Event & Action Middleware</p>
                </div>
            </div>
            <div className={styles.formPanel}>
                <Outlet />
            </div>
        </div>
    );
}

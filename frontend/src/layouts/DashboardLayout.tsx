import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Activity, LayoutDashboard, Settings, Layers, Bell, User, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ThemeToggle } from '../components/ThemeToggle';
import { api } from '../lib/api';
import styles from './DashboardLayout.module.css';

const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workflows', path: '/workflows', icon: Layers },
    { name: 'Execution Logs', path: '/logs', icon: Activity },
];

const bottomNavItems = [
    { name: 'Settings', path: '/settings', icon: Settings },
];



export function DashboardLayout() {
    const location = useLocation();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const activeWorkspaceId = useAuthStore((state) => state.activeWorkspaceId);
    const setActiveWorkspace = useAuthStore((state) => state.setActiveWorkspace);
    const navigate = useNavigate();

    useEffect(() => {
        if (user && !activeWorkspaceId) {
            api.get('/workspaces/').then(async res => {
                if (res.data && res.data.length > 0) {
                    setActiveWorkspace(res.data[0].id);
                } else {
                    const newWs = await api.post('/workspaces/', { name: 'Personal Workspace', description: 'Auto-generated workspace' });
                    setActiveWorkspace(newWs.data.id);
                }
            }).catch(console.error);
        }
    }, [user, activeWorkspaceId, setActiveWorkspace]);

    const getBreadcrumbTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path.startsWith('/workflows/new')) return 'Create Workflow';
        if (path.startsWith('/workflows/') && path !== '/workflows') return 'Workflow Details';
        if (path.startsWith('/workflows')) return 'Workflows';
        if (path.startsWith('/logs')) return 'Execution Logs';
        if (path.startsWith('/settings')) return 'Settings';
        if (path.startsWith('/profile')) return 'My Profile';
        return 'Dashboard';
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar Navigation */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    {/* Workspace Switcher Placeholder */}
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button className={styles.workspaceSelector}>
                                <div className={styles.workspaceAvatar}>P</div>
                                <div className={styles.workspaceInfo}>
                                    <span className={styles.workspaceName}>Personal</span>
                                    <span className={styles.workspacePlan}>Free Plan</span>
                                </div>
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content className={styles.dropdownContent} align="start">
                            <DropdownMenu.Item className={styles.dropdownItem}>Personal</DropdownMenu.Item>
                            <DropdownMenu.Separator className={styles.dropdownSeparator} />
                            <DropdownMenu.Item className={styles.dropdownItem} onClick={() => window.location.href = '/settings'}>
                                Workspace Settings
                            </DropdownMenu.Item>
                            <DropdownMenu.Item className={styles.dropdownItem}>Create Workspace...</DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </div>

                <nav className={styles.navBlock}>
                    <ul className={styles.navList}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                            return (
                                <li key={item.path}>
                                    <Link to={item.path} className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                                        <Icon size={18} />
                                        <span>{item.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className={styles.sidebarFooter}>
                    <ul className={styles.navList}>
                        {bottomNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <li key={item.path}>
                                    <Link to={item.path} className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                                        <Icon size={18} />
                                        <span>{item.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    <button className={`${styles.navItemButton} ${styles.logoutButton}`} onClick={logout}>
                        <LogOut size={18} />
                        <span>Log out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={styles.mainWrapper}>
                <header className={styles.topbar}>
                    <div className={styles.breadcrumbs}>
                        <span>Workspace</span>
                        <span className={styles.breadcrumbSeparator}>/</span>
                        <span className={styles.breadcrumbCurrent}>{getBreadcrumbTitle()}</span>
                    </div>
                    <div className={styles.topbarActions}>
                        <ThemeToggle />
                        <button className={styles.iconButton}>
                            <Bell size={18} />
                        </button>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <button className={styles.topbarUserAvatar}>
                                    <User size={16} />
                                </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content className={styles.dropdownContent} align="end">
                                <DropdownMenu.Label className={styles.dropdownLabel}>{user?.full_name || user?.username || user?.email}</DropdownMenu.Label>
                                <DropdownMenu.Separator className={styles.dropdownSeparator} />
                            <DropdownMenu.Item className={styles.dropdownItem} onClick={() => navigate('/profile')}>
                                    My Profile
                                </DropdownMenu.Item>
                                <DropdownMenu.Item className={styles.dropdownItem} onClick={logout}>
                                    Log out
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </div>
                </header>
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

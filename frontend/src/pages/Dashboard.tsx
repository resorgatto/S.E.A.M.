import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { api } from '../lib/api';
import styles from './Dashboard.module.css';

interface Metrics {
    total_executions: number;
    successful: number;
    failed: number;
    pending: number;
    success_rate: number;
    avg_duration_ms: number;
}

interface TimeSeriesDataPoint {
    date: string;
    executions: number;
    failed: number;
}

interface TimeSeriesOutput {
    data: TimeSeriesDataPoint[];
}

export function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const activeWorkspaceId = useAuthStore((state) => state.activeWorkspaceId);

    const { data: metrics } = useQuery({
        queryKey: ['metricsSummary', activeWorkspaceId],
        queryFn: async () => {
            if (!activeWorkspaceId) return null;
            const res = await api.get<Metrics>('/logs/metrics/summary');
            return res.data;
        },
        enabled: !!activeWorkspaceId,
    });

    const { data: timeSeries = [] } = useQuery({
        queryKey: ['metricsTimeSeries', activeWorkspaceId],
        queryFn: async () => {
            if (!activeWorkspaceId) return [];
            const res = await api.get<TimeSeriesOutput>('/logs/metrics/timeseries');
            return res.data.data;
        },
        enabled: !!activeWorkspaceId,
    });

    const fallbackTimeSeries = Array.from({ length: 7 }).map((_, i) => ({
        date: subDays(new Date(), 6 - i).toISOString(),
        executions: 0,
        failed: 0,
    }));

    const chartData = timeSeries.length > 0 ? timeSeries : fallbackTimeSeries;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    {getGreeting()}, {user?.full_name?.split(' ')[0] || user?.username || 'User'}
                </h1>
                <p className={styles.subtitle}>Here's what is happening with your webhook integrations today.</p>
            </header>

            {/* Metrics Grid */}
            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <span className={styles.cardLabel}>Total Executions</span>
                    <div className={styles.cardValue}>{metrics?.total_executions?.toLocaleString() ?? 0}</div>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.cardLabel}>Success Rate</span>
                    <div className={styles.cardValue}>{metrics?.success_rate ?? 0}%</div>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.cardLabel}>Avg Duration</span>
                    <div className={styles.cardValue}>{metrics?.avg_duration_ms ?? 0} ms</div>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.cardLabel}>Pending Events</span>
                    <div className={styles.cardValue}>{metrics?.pending ?? 0}</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartPanel}>
                    <h3>Execution Volume</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => format(parseISO(val), 'EEE')} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                                    dy={10} 
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <Tooltip
                                    labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
                                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area type="monotone" dataKey="executions" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorExecutions)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={styles.chartPanel}>
                    <h3>Failed Executions</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => format(parseISO(val), 'EEE')} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                                    dy={10} 
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <Tooltip
                                    labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
                                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--error)' }}
                                />
                                <Line type="monotone" dataKey="failed" stroke="var(--error)" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

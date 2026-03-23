import { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, Calendar, Upload, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';
import { format } from 'date-fns';
import styles from './Profile.module.css';

type ToastState = { type: 'success' | 'error'; message: string } | null;

export function Profile() {
    const user = useAuthStore((state) => state.user);
    const updateUser = useAuthStore((state) => state.updateUser);

    // Profile form
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileToast, setProfileToast] = useState<ToastState>(null);

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordToast, setPasswordToast] = useState<ToastState>(null);

    // Avatar
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarToast, setAvatarToast] = useState<ToastState>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch latest profile data on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = useAuthStore.getState().token;
                const res = await api.get('/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = res.data;
                updateUser(data);
                setFullName(data.full_name || '');
                setUsername(data.username || '');
                setEmail(data.email || '');
            } catch {
                // Silently fail — user data is already in store
            }
        };
        fetchProfile();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-dismiss toasts after 4s
    useEffect(() => {
        if (profileToast) {
            const t = setTimeout(() => setProfileToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [profileToast]);

    useEffect(() => {
        if (passwordToast) {
            const t = setTimeout(() => setPasswordToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [passwordToast]);

    useEffect(() => {
        if (avatarToast) {
            const t = setTimeout(() => setAvatarToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [avatarToast]);

    const getToken = () => useAuthStore.getState().token;

    // ====== Profile Update ======
    const handleProfileSave = async () => {
        setProfileLoading(true);
        setProfileToast(null);
        try {
            const res = await api.put(
                '/auth/me',
                { full_name: fullName, username, email },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            updateUser(res.data);
            setProfileToast({ type: 'success', message: 'Profile updated successfully!' });
        } catch (err: any) {
            const detail = err.response?.data?.detail || 'Failed to update profile.';
            setProfileToast({ type: 'error', message: detail });
        } finally {
            setProfileLoading(false);
        }
    };

    const isProfileDirty =
        fullName !== (user?.full_name || '') ||
        username !== (user?.username || '') ||
        email !== (user?.email || '');

    // ====== Password Change ======
    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordToast({ type: 'error', message: 'Passwords do not match.' });
            return;
        }
        setPasswordLoading(true);
        setPasswordToast(null);
        try {
            await api.put(
                '/auth/me/password',
                { current_password: currentPassword, new_password: newPassword },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            setPasswordToast({ type: 'success', message: 'Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const detail = err.response?.data?.detail || 'Failed to change password.';
            setPasswordToast({ type: 'error', message: detail });
        } finally {
            setPasswordLoading(false);
        }
    };

    const isPasswordValid =
        currentPassword.length > 0 &&
        newPassword.length >= 8 &&
        confirmPassword.length > 0;

    // ====== Avatar Upload ======
    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);

        // Upload
        uploadAvatar(file);
    };

    const uploadAvatar = async (file: File) => {
        setAvatarLoading(true);
        setAvatarToast(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/auth/me/avatar', formData, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            updateUser(res.data);
            setAvatarPreview(null);
            setAvatarToast({ type: 'success', message: 'Avatar updated!' });
        } catch (err: any) {
            const detail = err.response?.data?.detail || 'Failed to upload avatar.';
            setAvatarToast({ type: 'error', message: detail });
            setAvatarPreview(null);
        } finally {
            setAvatarLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAvatarRemove = async () => {
        setAvatarLoading(true);
        setAvatarToast(null);
        try {
            await api.delete('/auth/me/avatar', {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            updateUser({ avatar: null });
            setAvatarPreview(null);
            setAvatarToast({ type: 'success', message: 'Avatar removed.' });
        } catch {
            setAvatarToast({ type: 'error', message: 'Failed to remove avatar.' });
        } finally {
            setAvatarLoading(false);
        }
    };

    const getInitials = () => {
        const name = user?.full_name || user?.username || user?.email || '?';
        return name.charAt(0).toUpperCase();
    };

    const currentAvatarUrl = avatarPreview || user?.avatar || null;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>My Profile</h1>
                    <p className={styles.subtitle}>Manage your personal information, avatar, and security settings.</p>
                </div>
            </header>

            {/* Avatar Section */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Profile Photo</h2>
                <div className={styles.card}>
                    <div className={styles.avatarSection}>
                        <div className={styles.avatarWrapper}>
                            {currentAvatarUrl ? (
                                <img src={currentAvatarUrl} alt="Avatar" className={styles.avatar} />
                            ) : (
                                <div className={styles.avatar}>{getInitials()}</div>
                            )}
                            <div
                                className={styles.avatarOverlay}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera size={24} />
                            </div>
                        </div>
                        <div className={styles.avatarActions}>
                            <h3>{user?.full_name || user?.username || 'User'}</h3>
                            <p>JPG, PNG, WebP or GIF. Max 5MB.</p>
                            <div className={styles.avatarButtons}>
                                <button
                                    className={styles.uploadButton}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={avatarLoading}
                                >
                                    {avatarLoading ? (
                                        <div className={styles.spinner} />
                                    ) : (
                                        <Upload size={14} />
                                    )}
                                    Upload Photo
                                </button>
                                {user?.avatar && (
                                    <button
                                        className={styles.removeButton}
                                        onClick={handleAvatarRemove}
                                        disabled={avatarLoading}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            {avatarToast && (
                                <div className={avatarToast.type === 'success' ? styles.toastSuccess : styles.toastError}>
                                    {avatarToast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                    {avatarToast.message}
                                </div>
                            )}
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className={styles.hiddenInput}
                        onChange={handleAvatarSelect}
                    />
                </div>
            </div>

            {/* Personal Information */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Personal Information</h2>
                <div className={styles.card}>
                    <div className={styles.formGrid}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="profile-fullname">Full Name</label>
                            <input
                                id="profile-fullname"
                                type="text"
                                className={styles.input}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="profile-username">Username</label>
                            <input
                                id="profile-username"
                                type="text"
                                className={styles.input}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Your username"
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="profile-email">Email Address</label>
                            <input
                                id="profile-email"
                                type="email"
                                className={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Member Since</label>
                            <div className={styles.memberSince}>
                                <Calendar size={14} />
                                {user?.created_at
                                    ? format(new Date(user.created_at), 'MMM dd, yyyy')
                                    : '—'}
                            </div>
                        </div>
                    </div>

                    <div className={styles.actionRow}>
                        {profileToast && (
                            <div className={profileToast.type === 'success' ? styles.toastSuccess : styles.toastError}>
                                {profileToast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                {profileToast.message}
                            </div>
                        )}
                        <button
                            className={styles.primaryButton}
                            onClick={handleProfileSave}
                            disabled={!isProfileDirty || profileLoading}
                        >
                            {profileLoading && <div className={styles.spinner} />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Change Password</h2>
                <p className={styles.sectionDesc}>Ensure your account stays secure by using a strong password.</p>
                <div className={styles.card}>
                    <div className={styles.formGrid}>
                        <div className={styles.inputGroupFull}>
                            <label htmlFor="profile-current-password">Current Password</label>
                            <div style={{ position: 'relative', maxWidth: 400 }}>
                                <input
                                    id="profile-current-password"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: 8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        padding: 4,
                                    }}
                                >
                                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="profile-new-password">New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="profile-new-password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: 8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        padding: 4,
                                    }}
                                >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {newPassword.length > 0 && (
                                <div className={styles.passwordRequirements}>
                                    <span className={newPassword.length >= 8 ? styles.requirementMet : styles.requirement}>
                                        {newPassword.length >= 8 ? <Check size={12} /> : <X size={12} />}
                                        At least 8 characters
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="profile-confirm-password">Confirm New Password</label>
                            <input
                                id="profile-confirm-password"
                                type="password"
                                className={styles.input}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                            />
                            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                                <div className={styles.passwordRequirements}>
                                    <span className={styles.requirement}>
                                        <X size={12} />
                                        Passwords do not match
                                    </span>
                                </div>
                            )}
                            {confirmPassword.length > 0 && newPassword === confirmPassword && (
                                <div className={styles.passwordRequirements}>
                                    <span className={styles.requirementMet}>
                                        <Check size={12} />
                                        Passwords match
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.actionRow}>
                        {passwordToast && (
                            <div className={passwordToast.type === 'success' ? styles.toastSuccess : styles.toastError}>
                                {passwordToast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                {passwordToast.message}
                            </div>
                        )}
                        <button
                            className={styles.primaryButton}
                            onClick={handlePasswordChange}
                            disabled={!isPasswordValid || passwordLoading || newPassword !== confirmPassword}
                        >
                            {passwordLoading && <div className={styles.spinner} />}
                            Update Password
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className={styles.section}>
                <h2 className={styles.dangerTitle}>Danger Zone</h2>
                <div className={`${styles.card} ${styles.dangerZone}`}>
                    <p className={styles.dangerDesc}>
                        Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex' }}>
                        <button className={styles.dangerButton}>
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

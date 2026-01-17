'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Credential {
    id: string;
    name: string;
    teamId: string;
    ascKeyId: string;
    createdAt: string;
}

export default function CredentialsPage() {
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        teamId: '',
        ascKeyId: '',
        ascIssuerId: '',
        ascKeyContent: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCredentials();
    }, []);

    async function fetchCredentials() {
        try {
            const res = await fetch('/api/credentials');
            if (res.ok) {
                setCredentials(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch credentials:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/credentials/apple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setShowForm(false);
                setFormData({ name: '', teamId: '', ascKeyId: '', ascIssuerId: '', ascKeyContent: '' });
                fetchCredentials();
            } else {
                alert('Failed to save credentials');
            }
        } catch (error) {
            console.error('Failed to save credentials:', error);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this credential?')) return;

        try {
            const res = await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCredentials();
            }
        } catch (error) {
            console.error('Failed to delete credential:', error);
        }
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <Link href="/dashboard" className="text-xl font-bold text-white">
                        ← Credentials
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-white">Apple Developer Credentials</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
                    >
                        {showForm ? 'Cancel' : '+ Add Credential'}
                    </button>
                </div>

                {/* Add Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Add App Store Connect API Key</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    placeholder="e.g., My App Store Key"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Team ID</label>
                                    <input
                                        type="text"
                                        value={formData.teamId}
                                        onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        placeholder="XXXXXXXXXX"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">API Key ID</label>
                                    <input
                                        type="text"
                                        value={formData.ascKeyId}
                                        onChange={(e) => setFormData({ ...formData, ascKeyId: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        placeholder="XXXXXXXXXX"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Issuer ID</label>
                                <input
                                    type="text"
                                    value={formData.ascIssuerId}
                                    onChange={(e) => setFormData({ ...formData, ascIssuerId: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-1">API Key Content (.p8)</label>
                                <textarea
                                    value={formData.ascKeyContent}
                                    onChange={(e) => setFormData({ ...formData, ascKeyContent: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    rows={6}
                                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                                    required
                                />
                                <p className="text-gray-500 text-xs mt-1">
                                    Paste the contents of your .p8 file. This will be encrypted before storage.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : 'Save Credential'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Credentials List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto"></div>
                    </div>
                ) : credentials.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 text-center">
                        <p className="text-gray-400">No credentials yet. Add your first App Store Connect API key.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {credentials.map((cred) => (
                            <div key={cred.id} className="bg-gray-800 rounded-xl p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-medium">{cred.name}</h3>
                                    <p className="text-gray-400 text-sm">
                                        Team: {cred.teamId} • Key: {cred.ascKeyId}
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        Added {new Date(cred.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(cred.id)}
                                    className="px-4 py-2 text-red-400 hover:bg-red-900/30 rounded-lg transition"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

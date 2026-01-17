'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl: string;
}

interface Project {
    id: string;
    name: string;
    bundleId: string;
    createdAt: string;
}

interface Job {
    jobId: string;
    status: string;
    version: string;
    buildNumber: string;
    createdAt: string;
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [userRes, projectsRes] = await Promise.all([
                    fetch('/api/auth/me'),
                    fetch('/api/projects'),
                ]);

                if (userRes.ok) {
                    setUser(await userRes.json());
                }
                if (projectsRes.ok) {
                    setProjects(await projectsRes.json());
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl text-white mb-4">Please log in</h2>
                    <Link
                        href="/api/auth/github"
                        className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold"
                    >
                        Login with GitHub
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white">LaunchPad</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-400">{user.name}</span>
                        {user.avatarUrl && (
                            <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-8 h-8 rounded-full"
                            />
                        )}
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-gray-800/50 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex space-x-8">
                        <NavLink href="/dashboard" active>Dashboard</NavLink>
                        <NavLink href="/dashboard/projects">Projects</NavLink>
                        <NavLink href="/dashboard/credentials">Credentials</NavLink>
                        <NavLink href="/dashboard/builds">Build History</NavLink>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Projects" value={projects.length} icon="📱" />
                    <StatCard title="Total Builds" value="0" icon="🔨" />
                    <StatCard title="Successful" value="0" icon="✅" />
                    <StatCard title="Failed" value="0" icon="❌" />
                </div>

                {/* Recent Projects */}
                <div className="bg-gray-800 rounded-xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
                        <Link
                            href="/dashboard/projects/new"
                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition"
                        >
                            New Project
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">
                            No projects yet. Create your first project to get started.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {projects.slice(0, 5).map((project) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
                                >
                                    <div>
                                        <h3 className="text-white font-medium">{project.name}</h3>
                                        <p className="text-gray-400 text-sm">{project.bundleId}</p>
                                    </div>
                                    <Link
                                        href={`/dashboard/projects/${project.id}`}
                                        className="px-4 py-2 text-cyan-400 hover:bg-gray-700 rounded-lg transition"
                                    >
                                        View
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={`py-4 text-sm font-medium border-b-2 transition ${active
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
        >
            {children}
        </Link>
    );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
    return (
        <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm">{title}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                </div>
                <span className="text-3xl">{icon}</span>
            </div>
        </div>
    );
}

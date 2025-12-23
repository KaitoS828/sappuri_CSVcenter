"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Download, Loader2, FileText, Edit, Trash2, X, Check, Save, HelpCircle, Keyboard, Info, Wand2, Clock, ChevronLeft, ChevronRight, Search, Moon, Sun, AlertTriangle } from "lucide-react";
import * as XLSX from 'xlsx';

interface ExtractedData {

    name: string;
    furigana: string;
    gender: string;
    dobYear: string;
    dobMonth: string;
    dobDay: string;
    postalCode: string;
    address: string;
    phone: string;
    occupation: string;
    cardNumber: string;
    _sourceUrl?: string;
    _sourceType?: string;
}

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ExtractedData[]>([]);

    // Timer State
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Editing State
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<ExtractedData | null>(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof ExtractedData; direction: 'asc' | 'desc' } | null>(null);



    // Sorted Data Calculation
    const sortedData = sortConfig ? [...data].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    }) : data;



    // Help Modal State
    const [showHelp, setShowHelp] = useState(false);
    const [activeHelpTab, setActiveHelpTab] = useState<'guide' | 'shortcuts' | 'faq'>('guide');

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");

    // Dark Mode State
    const [isDarkMode, setIsDarkMode] = useState(false);


    // Duplicate Detection Logic
    const duplicateSet = new Set<string>();
    const duplicates = new Set<string>();
    if (data.length > 0) {
        data.forEach(item => {
            if (item.cardNumber) {
                if (duplicateSet.has(item.cardNumber)) {
                    duplicates.add(item.cardNumber);
                }
                duplicateSet.add(item.cardNumber);
            }
        });
    }

    // Initialize Dark Mode
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDarkMode(true);
        }
    };

    // Filtered Data
    const filteredData = sortedData.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.name.toLowerCase().includes(q) ||
            item.furigana.includes(q) ||
            (item.cardNumber || "").includes(q) ||
            item.phone.includes(q)
        );
    });

    // Load from LocalStorage
    useEffect(() => {
        const savedData = localStorage.getItem("supplement-csv-data");
        if (savedData) {
            try {
                setData(JSON.parse(savedData));
            } catch (e) {
                console.error("Failed to load saved data", e);
            }
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        localStorage.setItem("supplement-csv-data", JSON.stringify(data));
    }, [data]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editingIndex === null) return;

            // Ctrl + Enter to Save
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveClick(editingIndex);
            }
            // Esc to Cancel
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelClick();
            }

            // Navigation Shortcuts
            // Prev: Alt + Up/Left, PageUp, Ctrl + Up/Left
            if (
                (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')) ||
                e.key === 'PageUp' ||
                (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowLeft'))
            ) {
                e.preventDefault();
                handleNavigate('prev');
            }

            // Next: Alt + Down/Right, PageDown, Ctrl + Down/Right
            if (
                (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) ||
                e.key === 'PageDown' ||
                (e.ctrlKey && (e.key === 'ArrowDown' || e.key === 'ArrowRight'))
            ) {
                e.preventDefault();
                handleNavigate('next');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingIndex, editFormData]); // Re-bind when form data changes

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;
        await processFiles(Array.from(selectedFiles));
    };

    const processFiles = async (files: File[]) => {
        setLoading(true);
        setElapsedTime(0);

        // Start Timer
        const startTime = Date.now();
        timerIntervalRef.current = setInterval(() => {
            setElapsedTime((Date.now() - startTime) / 1000);
        }, 100);

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/extract', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Failed to process ${file.name}`);
                }

                const result: ExtractedData[] = await response.json();

                const sourceUrl = URL.createObjectURL(file);
                const newData = result.map(item => ({
                    ...item,
                    _sourceUrl: sourceUrl,
                    _sourceType: file.type
                }));

                setData(prev => [...prev, ...newData]);
            } catch (error) {
                console.error("Error processing file:", error);
            }
        }

        // Stop Timer
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        setLoading(false);
    };

    const normalizeData = (item: ExtractedData): ExtractedData => {
        // 1. Phone Normalization (09012345678 -> 090-1234-5678)
        let phone = item.phone.replace(/[^\d]/g, ""); // remove non-digits
        if (phone.length === 11) {
            phone = `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
        } else if (phone.length === 10) {
            phone = `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
        } else {
            phone = item.phone; // keep original if length mismatch
        }

        return { ...item, phone };
    };

    const downloadCSV = () => {
        if (filteredData.length === 0) return;

        const headers = ["Card No", "Name", "Furigana", "Gender", "DOB Year", "DOB Month", "DOB Day", "Postal Code", "Address", "Phone", "Occupation"];
        const csvContent = [
            headers.join(","),
            ...filteredData.map(row => [
                `"${row.cardNumber || ''}"`,
                `"${row.name}"`,
                `"${row.furigana}"`,
                `"${row.gender}"`,
                `"${row.dobYear}"`,
                `"${row.dobMonth}"`,
                `"${row.dobDay}"`,
                `"${row.postalCode}"`,
                `"${row.address}"`,
                `"${row.phone}"`,
                `"${row.occupation}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'extracted_data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const downloadExcel = () => {
        if (filteredData.length === 0) return;
        const exportData = filteredData.map(({ _sourceUrl, _sourceType, ...rest }) => rest);
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
        XLSX.writeFile(workbook, "extracted_data.xlsx");
    };

    const clearAllData = () => {
        if (confirm("全てのデータを削除しますか？")) {
            setData([]);
            localStorage.removeItem("supplement-csv-data");
            setElapsedTime(0);
        }
    };

    const handleEditClick = (index: number, row: ExtractedData) => {
        setEditingIndex(index);
        setEditFormData({ ...row });
    };

    const handleCancelClick = () => {
        setEditingIndex(null);
        setEditFormData(null);
    };

    const handleSaveClick = (index: number) => {
        if (!editFormData) return;

        // Normalize before saving
        const normalized = normalizeData(editFormData);

        const newData = [...data];
        newData[index] = normalized;
        setData(newData);
        setEditingIndex(null);
        setEditFormData(null);
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        if (editingIndex === null || !editFormData) return;

        // 1. Auto-Save Current
        const normalized = normalizeData(editFormData);
        const newData = [...data];
        newData[editingIndex] = normalized;

        // 2. Calculate New Index
        let newIndex = direction === 'next' ? editingIndex + 1 : editingIndex - 1;

        // Loop or Stop? Let's stop at edges.
        if (newIndex < 0) return; // or newIndex = data.length - 1 (loop)
        if (newIndex >= data.length) return; // or newIndex = 0 (loop)

        // 3. Update State
        setData(newData); // Commit save
        setEditingIndex(newIndex);
        setEditFormData({ ...newData[newIndex] }); // Load next
    };

    const handleDeleteClick = (index: number) => {
        if (confirm("この行を削除しますか？")) {
            const newData = [...data];
            newData.splice(index, 1);
            setData(newData);
        }
    }

    const handleSort = (key: keyof ExtractedData) => {
        if (sortConfig && sortConfig.key === key) {
            if (sortConfig.direction === 'asc') {
                setSortConfig({ key, direction: 'desc' });
            } else {
                setSortConfig(null); // Reset to original order
            }
        } else {
            setSortConfig({ key, direction: 'asc' });
        }
    };



    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof ExtractedData) => {
        if (!editFormData) return;
        setEditFormData({ ...editFormData, [field]: e.target.value });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) processFiles(files);
    };

    const HelpModal = () => (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-blue-500" /> 使い方ガイド
                    </h2>
                    <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button onClick={() => setActiveHelpTab('guide')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeHelpTab === 'guide' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-gray-800 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>機能紹介</button>
                    <button onClick={() => setActiveHelpTab('shortcuts')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeHelpTab === 'shortcuts' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-gray-800 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>ショートカット</button>
                    <button onClick={() => setActiveHelpTab('faq')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeHelpTab === 'faq' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-gray-800 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`}>F.A.Q</button>
                </div>
                <div className="p-8 h-96 overflow-y-auto text-gray-700 dark:text-gray-300">
                    {activeHelpTab === 'guide' && (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg h-fit"><Upload className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100">1. ファイルをアップロード</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">PDF（複数ページ可）や画像をドラッグ＆ドロップ。一度に複数のファイルを投げ込めます。</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg h-fit"><Edit className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100">2. 比較しながら編集 (Split View)</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">「Edit」ボタンを押すと、左に原本、右に入力フォームが表示されます。見比べながらサクサク修正。</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg h-fit"><Download className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100">3. データのエクスポート</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">CSVまたはExcel形式で出力。データはブラウザに自動保存されるので、閉じても安心です。</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeHelpTab === 'shortcuts' && (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className="font-medium text-gray-700 dark:text-gray-300">保存して閉じる</span>
                                <div className="flex gap-2">
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">Ctrl</kbd>
                                    <span className="text-gray-300">+</span>
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">Enter</kbd>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className="font-medium text-gray-700 dark:text-gray-300">前のデータへ</span>
                                <div className="flex gap-2">
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">Alt</kbd>
                                    <span className="text-gray-300">+</span>
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">←/↑</kbd>
                                    <span className="text-gray-300 text-xs self-center mx-1">or</span>
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">PageUp</kbd>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className="font-medium text-gray-700 dark:text-gray-300">次のデータへ</span>
                                <div className="flex gap-2">
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">Alt</kbd>
                                    <span className="text-gray-300">+</span>
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">→/↓</kbd>
                                    <span className="text-gray-300 text-xs self-center mx-1">or</span>
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">PageDown</kbd>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span className="font-medium text-gray-700 dark:text-gray-300">キャンセル</span>
                                <div className="flex gap-2">
                                    <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-300 font-mono shadow-sm">Esc</kbd>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeHelpTab === 'faq' && (
                        <div className="space-y-4">
                            <details className="group p-4 bg-gray-50 dark:bg-gray-800 rounded-lg open:bg-blue-50 dark:open:bg-gray-800 transition-colors">
                                <summary className="font-bold text-gray-700 dark:text-gray-300 cursor-pointer list-none flex justify-between items-center">
                                    データが消えた！
                                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-2">ブラウザのLocalStorageに保存されています。ページを再読み込みしても残っていますが、「CLEAR」ボタンを押すと完全に消去されます。</p>
                            </details>
                            <details className="group p-4 bg-gray-50 dark:bg-gray-800 rounded-lg open:bg-blue-50 dark:open:bg-gray-800 transition-colors">
                                <summary className="font-bold text-gray-700 dark:text-gray-300 cursor-pointer list-none flex justify-between items-center">
                                    読み取り精度が低い
                                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-2">画質が低い場合や、手書き文字が崩れている場合に発生します。高解像度の画像をお試しください。</p>
                            </details>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const TimerDisplay = () => (
        <div className={`fixed bottom-8 right-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-full px-6 py-3 flex items-center gap-3 transition-all transform ${loading || elapsedTime > 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className={`relative flex items-center justify-center ${loading ? 'animate-pulse' : ''}`}>
                <Clock className={`w-5 h-5 ${loading ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Processing Time</span>
                <span className={`text-xl font-mono font-medium ${loading ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    {elapsedTime.toFixed(1)}s
                </span>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen p-8 md:p-12 font-sans text-[#333]">
            {showHelp && <HelpModal />}
            <TimerDisplay />

            {/* Split View Overlay */}
            {editingIndex !== null && editFormData && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 w-full h-[90vh] max-w-7xl rounded-xl shadow-2xl flex overflow-hidden border border-gray-200 dark:border-gray-800">
                        {/* Left: Source Preview */}
                        <div className="w-1/2 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 relative">
                            <div className="absolute top-4 left-4 z-10 bg-white/80 dark:bg-black/80 dark:text-gray-200 px-3 py-1 rounded text-xs font-bold shadow-sm">
                                ORIGINAL FILE
                            </div>
                            {editFormData._sourceUrl ? (
                                editFormData._sourceType === 'application/pdf' ? (
                                    <iframe src={editFormData._sourceUrl} className="w-full h-full" />
                                ) : (
                                    <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                                        <img src={editFormData._sourceUrl} alt="Source" className="max-w-none shadow-lg" />
                                    </div>
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No Preview Available
                                </div>
                            )}
                        </div>

                        {/* Right: Edit Form */}
                        <div className="w-1/2 flex flex-col bg-white dark:bg-gray-900">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800 dark:text-gray-100">
                                        <Edit className="w-5 h-5" /> Edit Data
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-4">
                                        <button
                                            onClick={() => handleNavigate('prev')}
                                            disabled={editingIndex === 0}
                                            className="p-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-600 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="Previous (Alt + ↑ / PgUp)"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 px-2 min-w-[60px] text-center">
                                            {editingIndex! + 1} / {data.length}
                                        </span>
                                        <button
                                            onClick={() => handleNavigate('next')}
                                            disabled={editingIndex === data.length - 1}
                                            className="p-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-600 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="Next (Alt + ↓ / PgDn)"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button onClick={handleCancelClick} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            value={editFormData.name}
                                            onChange={(e) => handleInputChange(e, 'name')}
                                            placeholder="Name"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Furigana</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            value={editFormData.furigana}
                                            onChange={(e) => handleInputChange(e, 'furigana')}
                                            placeholder="Furigana"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gender</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            value={editFormData.gender}
                                            onChange={(e) => handleInputChange(e, 'gender')}
                                            placeholder="Gender"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date of Birth</label>
                                        <div className="flex gap-2">
                                            <input
                                                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                value={editFormData.dobYear}
                                                onChange={(e) => handleInputChange(e, 'dobYear')}
                                                placeholder="Year"
                                            />
                                            <input
                                                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                value={editFormData.dobMonth}
                                                onChange={(e) => handleInputChange(e, 'dobMonth')}
                                                placeholder="Month"
                                            />
                                            <input
                                                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                value={editFormData.dobDay}
                                                onChange={(e) => handleInputChange(e, 'dobDay')}
                                                placeholder="Day"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Address</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            value={editFormData.address}
                                            onChange={(e) => handleInputChange(e, 'address')}
                                            placeholder="Address"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Postal Code</label>
                                        <input
                                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${!editFormData.postalCode ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}
                                            value={editFormData.postalCode}
                                            onChange={(e) => handleInputChange(e, 'postalCode')}
                                            placeholder="000-0000"
                                        />
                                        {!editFormData.postalCode && <p className="text-xs text-red-500">Required</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            value={editFormData.phone}
                                            onChange={(e) => handleInputChange(e, 'phone')}
                                            placeholder="090-0000-0000"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Occupation</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            value={editFormData.occupation}
                                            onChange={(e) => handleInputChange(e, 'occupation')}
                                            placeholder="Occupation"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Card Number (8 digits)</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            value={editFormData.cardNumber || ''}
                                            onChange={(e) => handleInputChange(e, 'cardNumber')}
                                            placeholder="12345678"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                                <button
                                    onClick={handleCancelClick}
                                    className="px-6 py-3 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSaveClick(editingIndex!)}
                                    className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 transition-all flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex justify-between items-center py-6 border-b border-gray-100 dark:border-gray-800">
                    <h1 className="text-2xl font-light tracking-wider text-gray-800 dark:text-gray-100">
                        サプリCSVセンター <span className="text-xs font-bold bg-gray-900 dark:bg-blue-600 text-white px-2 py-1 rounded ml-2">ULTIMATE</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Toggle Theme"
                        >
                            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                        </button>
                        <button
                            onClick={() => setShowHelp(true)}
                            className="flex items-center gap-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                        >
                            <HelpCircle className="w-6 h-6" />
                            <span className="text-sm font-medium hidden md:inline">使い方ガイド</span>
                        </button>
                    </div>
                </header>

                {/* Upload Area */}
                <div
                    className="group relative cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-all duration-300">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleFileUpload}
                            accept="image/*,.pdf"
                            multiple
                        />
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300">
                                {loading ? <Loader2 className="w-10 h-10 animate-spin text-blue-500" /> : <Upload className="w-10 h-10" />}
                            </div>
                            <div>
                                <p className="text-xl font-medium text-gray-700 dark:text-gray-200 tracking-wide">
                                    Drop files here (PDF/Images)
                                </p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Supports Multi-page PDFs & Bulk Upload
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Display */}
                {data.length > 0 && (
                    <div className="space-y-6 animate-in fade-in duration-700">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-medium tracking-wide flex items-center gap-3 text-gray-700 dark:text-gray-200">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    {filteredData.length} / {data.length} Records
                                </h2>
                                {/* Search Bar */}
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg outline-none text-sm transition-all w-48 focus:w-64"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={clearAllData}
                                    className="flex items-center gap-2 text-gray-400 hover:text-red-500 px-4 py-2 text-xs font-bold tracking-widest transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> CLEAR
                                </button>
                                <button
                                    onClick={downloadExcel}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded shadow-sm hover:shadow-md text-xs font-bold tracking-widest transition-all"
                                >
                                    <FileText className="w-3 h-3" /> EXCEL
                                </button>
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-5 py-2 rounded shadow-sm hover:shadow-md text-xs font-bold tracking-widest transition-all"
                                >
                                    <Download className="w-3 h-3" /> CSV
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="p-4 font-semibold w-10">#</th>
                                            <th className="p-4 font-semibold w-32">ACTION</th>
                                            <th onClick={() => handleSort('cardNumber')} className="p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                                                CARD NO {sortConfig?.key === 'cardNumber' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th onClick={() => handleSort('name')} className="p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">NAME {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                                            <th className="p-4 font-semibold">FURIGANA</th>
                                            <th className="p-4 font-semibold">GENDER</th>
                                            <th className="p-4 font-semibold">YEAR</th>
                                            <th className="p-4 font-semibold">MONTH</th>
                                            <th className="p-4 font-semibold">DAY</th>
                                            <th className="p-4 font-semibold">POSTAL</th>
                                            <th className="p-4 font-semibold">ADDRESS</th>
                                            <th className="p-4 font-semibold">PHONE</th>
                                            <th className="p-4 font-semibold">OCCUPATION</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {filteredData.map((row, i) => {
                                            const isDuplicate = duplicates.has(row.cardNumber);
                                            return (
                                                <tr key={i} className="hover:bg-blue-50/50 dark:hover:bg-gray-800 transition-colors">
                                                    <td className="p-4 text-gray-400 dark:text-gray-600 text-xs">{i + 1}</td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEditClick(i, row)}
                                                                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(i)}
                                                                className="p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className={`font-mono font-bold flex items-center gap-2 ${isDuplicate ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                                            {row.cardNumber || '-'}
                                                            {isDuplicate && <span title="Duplicate Card Number"><AlertTriangle className="w-4 h-4 text-red-500" /></span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-medium text-gray-900 dark:text-gray-200">{row.name}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{row.furigana}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400 font-mono text-center">{row.gender}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400 font-mono">{row.dobYear}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400 font-mono">{row.dobMonth}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400 font-mono">{row.dobDay}</td>
                                                    <td className={`p-4 ${!row.postalCode ? 'text-red-400 italic' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        {row.postalCode || 'Missing'}
                                                    </td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{row.address}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{row.phone}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{row.occupation}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>

                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main >
    );
}
